import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

function normalizeTeamLabel(value: unknown): TeamLabel | null {
  const label = String(value || '').trim().toUpperCase()
  if (label === 'A' || label === 'B' || label === 'C' || label === 'D') return label
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const questionEventId = typeof body?.questionEventId === 'string' ? body.questionEventId : ''
    const teamLabel = normalizeTeamLabel(body?.teamLabel)

    if (!questionEventId || !teamLabel) {
      return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
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
      .select('id,team_label,buzzed_at,buzz_order')
      .eq('question_event_id', questionEventId)
      .order('buzzed_at', { ascending: true })
      .order('id', { ascending: true })

    if (allBuzzesError) {
      return NextResponse.json({ error: allBuzzesError.message }, { status: 500 })
    }

    const ordered = allBuzzes || []
    for (let i = 0; i < ordered.length; i++) {
      const desiredOrder = i + 1
      if (Number(ordered[i].buzz_order || 0) !== desiredOrder) {
        await supabase.from('quiz_buzz_events').update({ buzz_order: desiredOrder }).eq('id', ordered[i].id)
      }
    }

    const me = ordered.find((row) => row.team_label === teamLabel)
    const buzzOrder = Number(me?.buzz_order || 0) || null

    try {
      const now = new Date().toISOString()
      const channel = supabase.channel(`quiz:session:${sessionId}`, {
        config: { broadcast: { self: true, ack: false } },
      })
      void channel.send({
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
