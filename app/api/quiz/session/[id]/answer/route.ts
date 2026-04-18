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
    if (
      round.round_type !== 'direct_question' &&
      round.round_type !== 'buzzer' &&
      round.round_type !== 'true_or_false'
    ) {
      return NextResponse.json(
        { error: 'Answer submission is only allowed in direct question, true/false, or buzzer rounds' },
        { status: 400 },
      )
    }
    const isLetterAnswer = TEAM_LABELS.includes(answerText as TeamLabel)
    const isTrueFalseAnswer = answerText === 'TRUE' || answerText === 'FALSE'
    if (round.round_type === 'true_or_false') {
      if (!isTrueFalseAnswer) {
        return NextResponse.json({ error: 'Please select a valid option (TRUE or FALSE)' }, { status: 400 })
      }
    } else if (!isLetterAnswer) {
      return NextResponse.json({ error: 'Please select a valid option (A, B, C, or D)' }, { status: 400 })
    }

    const { data: session } = await supabase
      .from('quiz_live_sessions')
      .select('team_slots')
      .eq('id', sessionId)
      .single()

    const slots = (session?.team_slots || {}) as Record<string, string>
    const participantLabel =
      (TEAM_LABELS.find((label) => slots[label] === participant.team_id) as TeamLabel | undefined) || null
    if (!participantLabel) {
      return NextResponse.json({ error: 'Your team is not mapped in this session' }, { status: 403 })
    }

    let answeringTeam: TeamLabel | null = null
    if (round.round_type === 'direct_question') {
      if (event.status !== 'revealed') {
        return NextResponse.json({ error: 'Question is not open for answers' }, { status: 400 })
      }
      const directed = event.directed_team as TeamLabel
      if (!directed || !TEAM_LABELS.includes(directed)) {
        return NextResponse.json({ error: 'Invalid directed team' }, { status: 400 })
      }
      if (participantLabel !== directed) {
        return NextResponse.json({ error: 'It is not your team turn to answer' }, { status: 403 })
      }
      answeringTeam = directed
    } else if (round.round_type === 'true_or_false') {
      if (event.status !== 'options_revealed') {
        return NextResponse.json({ error: 'True/False options are not open for answers' }, { status: 400 })
      }
      const directed = event.directed_team as TeamLabel
      if (!directed || !TEAM_LABELS.includes(directed)) {
        return NextResponse.json({ error: 'Invalid directed team' }, { status: 400 })
      }
      if (participantLabel !== directed) {
        return NextResponse.json({ error: 'It is not your team turn to answer' }, { status: 403 })
      }
      answeringTeam = directed
    } else {
      if (event.status !== 'buzzer_open') {
        return NextResponse.json({ error: 'Buzzer is not open for answers' }, { status: 400 })
      }
      const deadlineRaw = (event as { buzzer_answer_deadline_at?: string | null }).buzzer_answer_deadline_at
      if (deadlineRaw) {
        const deadlineMs = new Date(String(deadlineRaw)).getTime()
        if (Number.isFinite(deadlineMs) && Date.now() >= deadlineMs) {
          return NextResponse.json(
            { error: 'The answer period for this buzz has expired' },
            { status: 400 },
          )
        }
      }
      const [{ data: buzzes, error: buzzErr }, { data: passRows, error: passErr }] = await Promise.all([
        supabase
          .from('quiz_buzz_events')
          .select('team_label,buzz_order,buzzed_at,id,client_pressed_at_ms')
          .eq('question_event_id', questionEventId)
          .order('client_pressed_at_ms', { ascending: true })
          .order('buzzed_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('quiz_pass_log')
          .select('team_label')
          .eq('question_event_id', questionEventId)
          .eq('passed_or_wrong', true),
      ])

      if (buzzErr) return NextResponse.json({ error: buzzErr.message }, { status: 500 })
      if (passErr) return NextResponse.json({ error: passErr.message }, { status: 500 })

      const excluded = new Set((passRows || []).map((row: any) => String(row.team_label)))
      const activeBuzz = (buzzes || []).find((row: any) => !excluded.has(String(row.team_label)))
      const activeTeam = activeBuzz?.team_label as TeamLabel | undefined
      if (!activeTeam || !TEAM_LABELS.includes(activeTeam)) {
        return NextResponse.json({ error: 'No active team is available to answer' }, { status: 400 })
      }
      if (participantLabel !== activeTeam) {
        return NextResponse.json({ error: 'It is not your team turn to answer' }, { status: 403 })
      }
      answeringTeam = activeTeam
    }

    if (!answeringTeam) {
      return NextResponse.json({ error: 'No team available to answer' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('quiz_direct_attempts')
      .select('id, verdict')
      .eq('question_event_id', questionEventId)
      .eq('team_label', answeringTeam)
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
        team_label: answeringTeam,
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
      void channel
        .send({
          type: 'broadcast',
          event: 'quiz_event',
          payload: {
            type: 'participant_answer_submitted',
            payload: {
              questionEventId,
              teamLabel: answeringTeam,
              answerText,
              submittedAt: now,
            },
            timestamp: now,
          },
        })
        .catch(() => {})
    } catch {
      // Ignore realtime send failures; DB write already succeeded and fallback refresh listeners still apply.
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
