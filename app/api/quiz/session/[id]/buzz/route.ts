import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

function normalizeTeamLabel(value: unknown): TeamLabel | null {
  const label = String(value || '').trim().toUpperCase()
  if (label === 'A' || label === 'B' || label === 'C' || label === 'D') return label
  return null
}

/**
 * Epoch ms from client at physical press; used to order buzzes before server arrival time.
 * Falls back to serverNowMs when missing, invalid, or outside clock-skew bounds (bad client clocks).
 */
function parseClientPressedAtMs(body: unknown, serverNowMs: number): number {
  const raw = (body as { clientPressedAtMs?: unknown })?.clientPressedAtMs
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return serverNowMs
  const n = Math.trunc(raw)
  if (!Number.isSafeInteger(n)) return serverNowMs
  if (n > serverNowMs + 120_000) return serverNowMs
  if (n < serverNowMs - 600_000) return serverNowMs
  return n
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const questionEventId = typeof body?.questionEventId === 'string' ? body.questionEventId : ''
    const teamLabel = normalizeTeamLabel(body?.teamLabel)
    const serverNowMs = Date.now()
    const clientPressedAtMs = parseClientPressedAtMs(body, serverNowMs)

    if (!questionEventId || !teamLabel) {
      return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('quiz_live_sessions')
      .select('id,status')
      .eq('id', sessionId)
      .single()
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (String(session.status || '').toLowerCase() === 'completed') {
      return NextResponse.json({ error: 'This session is completed and cannot be joined again' }, { status: 403 })
    }

    const { data: event } = await supabase
      .from('quiz_question_events')
      .select('id,status,round_id')
      .eq('id', questionEventId)
      .single()
    if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })
    if (event.status !== 'buzzer_open') {
      return NextResponse.json({ error: 'Buzzer is not open for this question' }, { status: 400 })
    }

    const { data: round } = await supabase
      .from('quiz_rounds')
      .select('id,session_id')
      .eq('id', event.round_id)
      .single()
    if (!round || round.session_id !== sessionId) {
      return NextResponse.json({ error: 'Question event does not belong to this session' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('quiz_buzz_events').insert({
      question_event_id: questionEventId,
      team_label: teamLabel,
      client_pressed_at_ms: clientPressedAtMs,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existing } = await supabase
          .from('quiz_buzz_events')
          .select('buzz_order')
          .eq('question_event_id', questionEventId)
          .eq('team_label', teamLabel)
          .maybeSingle()
        return NextResponse.json({
          accepted: true,
          duplicate: true,
          buzzOrder: Number(existing?.buzz_order || 0) || null,
        })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { data: allBuzzes, error: allBuzzesError } = await supabase
      .from('quiz_buzz_events')
      .select('id,team_label,buzzed_at,buzz_order,client_pressed_at_ms')
      .eq('question_event_id', questionEventId)
      .order('client_pressed_at_ms', { ascending: true })
      .order('buzzed_at', { ascending: true })
      .order('id', { ascending: true })

    if (allBuzzesError) {
      return NextResponse.json({ error: allBuzzesError.message }, { status: 500 })
    }

    const ordered = allBuzzes || []
    for (let i = 0; i < ordered.length; i++) {
      const desiredOrder = i + 1
      if (Number(ordered[i].buzz_order || 0) !== desiredOrder) {
        await supabaseAdmin.from('quiz_buzz_events').update({ buzz_order: desiredOrder }).eq('id', ordered[i].id)
      }
    }

    const myIndex = ordered.findIndex((row) => row.team_label === teamLabel)
    const buzzOrder = myIndex >= 0 ? myIndex + 1 : null

    const { data: passRowsBuzz } = await supabase
      .from('quiz_pass_log')
      .select('team_label')
      .eq('question_event_id', questionEventId)
      .eq('passed_or_wrong', true)
    const excludedBuzz = new Set((passRowsBuzz || []).map((row: { team_label: string }) => String(row.team_label)))
    const firstActive = ordered.find((row) => !excludedBuzz.has(String(row.team_label)))
    if (firstActive?.team_label === teamLabel) {
      const deadlineIso = new Date(serverNowMs + 30_000).toISOString()
      await supabaseAdmin
        .from('quiz_question_events')
        .update({ directed_team: teamLabel, buzzer_answer_deadline_at: deadlineIso })
        .eq('id', questionEventId)
        .eq('status', 'buzzer_open')
    }

    try {
      const now = new Date().toISOString()
      const channel = supabase.channel(`quiz:session:${sessionId}`, {
        config: { broadcast: { self: true, ack: false } },
      })
      await new Promise<void>((resolve) => {
        const fallback = setTimeout(() => resolve(), 1500)
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(fallback)
            resolve()
          }
        })
      })
      await channel.send({
        type: 'broadcast',
        event: 'quiz_event',
        payload: {
          type: 'buzz_received',
          payload: {
            questionEventId,
            teamLabel,
            buzzOrder,
          },
          timestamp: now,
        },
      })
      void supabase.removeChannel(channel)
    } catch {
      // Best-effort broadcast only; caller still gets accepted response.
    }

    return NextResponse.json({
      accepted: true,
      buzzOrder,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
