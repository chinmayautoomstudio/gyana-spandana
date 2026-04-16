import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const questionEventId = body?.questionEventId as string | undefined
    const answerText = typeof body?.answerText === 'string' ? body.answerText.trim().toUpperCase() : ''
    if (!questionEventId) {
      return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!participant?.team_id) {
      return NextResponse.json({ error: 'No team assigned to your account' }, { status: 403 })
    }

    const { data: event } = await supabase
      .from('quiz_question_events')
      .select('*')
      .eq('id', questionEventId)
      .single()

    if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })
    if (event.status !== 'revealed') {
      return NextResponse.json({ error: 'Question is not open for answers' }, { status: 400 })
    }
    if (event.correct_answer_revealed_at) {
      return NextResponse.json({ error: 'Question is closed' }, { status: 400 })
    }

    const { data: round } = await supabase
      .from('quiz_rounds')
      .select('round_type, session_id')
      .eq('id', event.round_id)
      .single()

    if (!round || round.session_id !== sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }
    if (round.round_type !== 'direct_question') {
      return NextResponse.json({ error: 'Text answers are only for direct question rounds' }, { status: 400 })
    }
    if (!TEAM_LABELS.includes(answerText as TeamLabel)) {
      return NextResponse.json({ error: 'Please select a valid option (A, B, C, or D)' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('quiz_live_sessions')
      .select('team_slots')
      .eq('id', sessionId)
      .single()

    const slots = (session?.team_slots || {}) as Record<string, string>
    const directed = event.directed_team as TeamLabel
    if (!directed || !TEAM_LABELS.includes(directed)) {
      return NextResponse.json({ error: 'Invalid directed team' }, { status: 400 })
    }

    const slotTeamId = slots[directed]
    if (!slotTeamId || slotTeamId !== participant.team_id) {
      return NextResponse.json({ error: 'It is not your team turn to answer' }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('quiz_direct_attempts')
      .select('id, verdict')
      .eq('question_event_id', questionEventId)
      .eq('team_label', directed)
      .maybeSingle()

    if (existing && existing.verdict !== 'pending') {
      return NextResponse.json({ error: 'Answer already submitted for this turn' }, { status: 400 })
    }

    const now = new Date().toISOString()
    if (existing) {
      const { error: upErr } = await supabase
        .from('quiz_direct_attempts')
        .update({ answer_text: answerText, updated_at: now })
        .eq('id', existing.id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    } else {
      const { error: insErr } = await supabase.from('quiz_direct_attempts').insert({
        session_id: sessionId,
        question_event_id: questionEventId,
        team_label: directed,
        answer_text: answerText,
        verdict: 'pending',
      })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // Best-effort realtime ping so host UI refreshes immediately when a participant submits.
    try {
      const channel = supabase.channel(`quiz:session:${sessionId}`, {
        config: { broadcast: { self: true, ack: false } },
      })
      await channel.send({
        type: 'broadcast',
        event: 'quiz_event',
        payload: {
          type: 'participant_answer_submitted',
          payload: {
            questionEventId,
            teamLabel: directed,
            answerText,
            submittedAt: now,
          },
          timestamp: now,
        },
      })
    } catch {
      // Ignore realtime send failures; DB write already succeeded and fallback refresh listeners still apply.
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
