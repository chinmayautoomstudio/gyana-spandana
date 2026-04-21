import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]
const BUZZER_ARBITRATION_DEBUG = process.env.BUZZER_ARBITRATION_DEBUG === 'true'

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

/**
 * Epoch microseconds from client (`performance.timeOrigin + performance.now()` * 1000).
 * Falls back to serverNowUs when missing, invalid, or outside clock-skew bounds.
 */
function parseClientPressedAtUs(body: unknown, serverNowUs: number, fallbackMs?: number): number {
  const raw = (body as { clientPressedAtUs?: unknown })?.clientPressedAtUs
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return typeof fallbackMs === 'number' && Number.isFinite(fallbackMs) ? Math.trunc(fallbackMs * 1000) : serverNowUs
  }
  const n = Math.trunc(raw)
  if (!Number.isSafeInteger(n)) {
    return typeof fallbackMs === 'number' && Number.isFinite(fallbackMs) ? Math.trunc(fallbackMs * 1000) : serverNowUs
  }
  if (n > serverNowUs + 120_000_000) {
    return typeof fallbackMs === 'number' && Number.isFinite(fallbackMs) ? Math.trunc(fallbackMs * 1000) : serverNowUs
  }
  if (n < serverNowUs - 600_000_000) {
    return typeof fallbackMs === 'number' && Number.isFinite(fallbackMs) ? Math.trunc(fallbackMs * 1000) : serverNowUs
  }
  return n
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
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
    const serverNowUs = serverNowMs * 1000
    const clientPressedAtMs = parseClientPressedAtMs(body, serverNowMs)
    const clientPressedAtUs = parseClientPressedAtUs(body, serverNowUs, clientPressedAtMs)

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
      client_pressed_at_us: clientPressedAtUs,
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
      .select('id,team_label,buzzed_at,buzz_order,client_pressed_at_us,client_pressed_at_ms')
      .eq('question_event_id', questionEventId)
      .order('client_pressed_at_us', { ascending: true })
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

    // Internal arbitration window: wait briefly so near-simultaneous presses can be compared.
    await delay(2000)

    const [{ data: passRowsBuzz }, { data: settledEvent }] = await Promise.all([
      supabase
        .from('quiz_pass_log')
        .select('team_label')
        .eq('question_event_id', questionEventId)
        .eq('passed_or_wrong', true),
      supabase
        .from('quiz_question_events')
        .select('id,status,directed_team,buzzer_answer_deadline_at')
        .eq('id', questionEventId)
        .maybeSingle(),
    ])

    const eventStillOpen =
      settledEvent &&
      settledEvent.status === 'buzzer_open' &&
      !settledEvent.directed_team &&
      !settledEvent.buzzer_answer_deadline_at

    const { data: arbitrationRows, error: arbitrationError } = await supabase
      .from('quiz_buzz_events')
      .select('team_label,buzz_order,buzzed_at,id,client_pressed_at_us,client_pressed_at_ms')
      .eq('question_event_id', questionEventId)
      .order('client_pressed_at_us', { ascending: true })
      .order('client_pressed_at_ms', { ascending: true })
      .order('buzzed_at', { ascending: true })
      .order('id', { ascending: true })

    if (arbitrationError) {
      return NextResponse.json({ error: arbitrationError.message }, { status: 500 })
    }

    const arbitrationOrdered = arbitrationRows || []
    const myFinalIndex = arbitrationOrdered.findIndex((row) => row.team_label === teamLabel)
    const buzzOrder = myFinalIndex >= 0 ? myFinalIndex + 1 : null

    if (eventStillOpen) {
      const fastestTeam = arbitrationOrdered[0]?.team_label ? String(arbitrationOrdered[0].team_label) : null
      const excludedBuzz = new Set((passRowsBuzz || []).map((row: { team_label: string }) => String(row.team_label)))
      const arbitrationPriority = fastestTeam
        ? [
            { team_label: fastestTeam },
            ...arbitrationOrdered.filter((row) => String(row.team_label) !== fastestTeam),
          ]
        : arbitrationOrdered
      const firstActive = arbitrationPriority.find((row) => !excludedBuzz.has(String(row.team_label)))

      if (BUZZER_ARBITRATION_DEBUG) {
        // Debug-only log to inspect arbitration decisions in staging without changing behavior.
        console.info('[buzzer-arbitration]', {
          sessionId,
          questionEventId,
          orderedTeams: arbitrationOrdered.map((row) => String(row.team_label)),
          fastestTeam,
          excludedTeams: [...excludedBuzz],
          selectedTeam: firstActive?.team_label ? String(firstActive.team_label) : null,
        })
      }

      if (firstActive?.team_label) {
        const directedTeam = String(firstActive.team_label)
        const deadlineIso = new Date(Date.now() + 30_000).toISOString()
        await supabaseAdmin
          .from('quiz_question_events')
          .update({ directed_team: directedTeam, buzzer_answer_deadline_at: deadlineIso })
          .eq('id', questionEventId)
          .eq('status', 'buzzer_open')
          .is('directed_team', null)
          .is('buzzer_answer_deadline_at', null)
      }
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
