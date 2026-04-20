import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePoints } from '@/lib/services/scoringService'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

async function pickNextRapidFireQuestion(roundId: string, supabase: any) {
  const [{ data: allQuestions }, { data: usedEvents }] = await Promise.all([
    supabase.from('quiz_questions').select('*').eq('round_id', roundId).order('question_order', { ascending: true }),
    supabase.from('quiz_question_events').select('question_id').eq('round_id', roundId),
  ])

  if (!allQuestions?.length) return null
  const usedQuestionIds = new Set((usedEvents ?? []).map((event: any) => String(event.question_id || '')))
  const remaining = allQuestions.filter((question: any) => !usedQuestionIds.has(String(question.id || '')))
  if (!remaining.length) return null
  const randomIndex = Math.floor(Math.random() * remaining.length)
  return remaining[randomIndex]
}

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
      round.round_type !== 'true_or_false' &&
      round.round_type !== 'rapid_fire'
    ) {
      return NextResponse.json(
        { error: 'Answer submission is only allowed in direct question, true/false, buzzer, or rapid fire rounds' },
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
      .select('team_slots,points_full,points_half')
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
    } else if (round.round_type === 'buzzer') {
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
    } else {
      if (!['revealed', 'options_revealed', 'buzzer_open'].includes(String(event.status || ''))) {
        return NextResponse.json({ error: 'Rapid Fire question is not open for answers' }, { status: 400 })
      }
      const rapidFireTeam = (event.rapid_fire_team || event.directed_team) as TeamLabel | null
      if (!rapidFireTeam || !TEAM_LABELS.includes(rapidFireTeam)) {
        return NextResponse.json({ error: 'Rapid Fire turn is not assigned to a valid team' }, { status: 400 })
      }
      if (participantLabel !== rapidFireTeam) {
        return NextResponse.json({ error: 'It is not your team turn to answer' }, { status: 403 })
      }
      answeringTeam = rapidFireTeam
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
    let rapidFirePayload: any = null
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

    if (round.round_type === 'rapid_fire') {
      const { data: activeRapidSession } = await supabase
        .from('quiz_rapid_fire_sessions')
        .select('id,started_at,duration_seconds,questions_attempted,questions_correct,score_earned')
        .eq('team_label', answeringTeam)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!activeRapidSession?.id || !activeRapidSession.started_at || !activeRapidSession.duration_seconds) {
        return NextResponse.json({ error: 'Rapid Fire turn is not active' }, { status: 400 })
      }

      const startedAtMs = new Date(String(activeRapidSession.started_at)).getTime()
      const durationMs = Number(activeRapidSession.duration_seconds) * 1000
      const hasTimerExpired = Number.isFinite(startedAtMs) && Number.isFinite(durationMs) && Date.now() >= startedAtMs + durationMs
      if (hasTimerExpired) {
        await supabase
          .from('quiz_rapid_fire_sessions')
          .update({ ended_at: now })
          .eq('id', activeRapidSession.id)
        return NextResponse.json({ error: 'Rapid Fire turn has ended' }, { status: 400 })
      }

      const { data: question } = await supabase
        .from('quiz_questions')
        .select('id,correct_answer,question_order')
        .eq('id', event.question_id)
        .single()

      if (!question) {
        return NextResponse.json({ error: 'Question not found for this event' }, { status: 404 })
      }

      const officialAnswer = String(question.correct_answer || '').trim().toUpperCase()
      const submittedAnswer = String(answerText || '').trim().toUpperCase()
      const isCorrect = submittedAnswer !== '' && submittedAnswer === officialAnswer
      const verdict = isCorrect ? 'correct' : 'wrong'
      const pointsAwarded = isCorrect
        ? resolvePoints(
            1,
            Number(session?.points_full ?? 10),
            Number(session?.points_half ?? 5),
            'rapid_fire',
          )
        : 0

      const { error: verdictErr } = await supabase
        .from('quiz_direct_attempts')
        .update({ answer_text: submittedAnswer, verdict, updated_at: now })
        .eq('question_event_id', questionEventId)
        .eq('team_label', answeringTeam)
      if (verdictErr) return NextResponse.json({ error: verdictErr.message }, { status: 500 })

      const { error: markEventErr } = await supabase
        .from('quiz_question_events')
        .update({
          status: isCorrect ? 'answered' : 'dropped',
          answered_by_team: answeringTeam,
          points_awarded: pointsAwarded,
        })
        .eq('id', questionEventId)
      if (markEventErr) return NextResponse.json({ error: markEventErr.message }, { status: 500 })

      if (isCorrect && pointsAwarded > 0) {
        const { error: scoreErr } = await supabase.rpc('increment_team_score', {
          p_session_id: sessionId,
          p_team_label: answeringTeam,
          p_score_delta: pointsAwarded,
          p_answered_delta: 1,
          p_correct_delta: 1,
        })
        if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 })
      }

      const nextAttempted = Number(activeRapidSession.questions_attempted || 0) + 1
      const nextCorrect = Number(activeRapidSession.questions_correct || 0) + (isCorrect ? 1 : 0)
      const nextScore = Number(activeRapidSession.score_earned || 0) + pointsAwarded
      const { error: updateRapidErr } = await supabase
        .from('quiz_rapid_fire_sessions')
        .update({
          questions_attempted: nextAttempted,
          questions_correct: nextCorrect,
          score_earned: nextScore,
        })
        .eq('id', activeRapidSession.id)
      if (updateRapidErr) return NextResponse.json({ error: updateRapidErr.message }, { status: 500 })

      const nextQuestion = await pickNextRapidFireQuestion(event.round_id, supabase)
      const timeNowMs = Date.now()
      const expiredAfterAnswer =
        Number.isFinite(startedAtMs) && Number.isFinite(durationMs) && timeNowMs >= startedAtMs + durationMs

      let nextEvent: any = null
      let rapidFireCompleted = false
      if (!nextQuestion || expiredAfterAnswer) {
        rapidFireCompleted = true
        await supabase.from('quiz_rapid_fire_sessions').update({ ended_at: new Date(timeNowMs).toISOString() }).eq('id', activeRapidSession.id)
      } else {
        const { data: createdNext, error: createNextErr } = await supabase
          .from('quiz_question_events')
          .insert({
            round_id: event.round_id,
            question_id: nextQuestion.id,
            status: 'revealed',
            attempt_number: 1,
            rapid_fire_team: answeringTeam,
            directed_team: answeringTeam,
          })
          .select('*')
          .single()
        if (createNextErr) return NextResponse.json({ error: createNextErr.message }, { status: 500 })

        nextEvent = createdNext || null
        await supabase
          .from('quiz_rounds')
          .update({ current_question_index: Number(nextQuestion.question_order || 0) })
          .eq('id', event.round_id)
      }

      rapidFirePayload = {
        verdict,
        pointsAwarded,
        nextEvent,
        nextQuestion: nextQuestion && !rapidFireCompleted ? nextQuestion : null,
        rapidFireCompleted,
        turnSummary: {
          correct: nextCorrect,
          incorrect: Math.max(0, nextAttempted - nextCorrect),
        },
      }
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
              verdict: rapidFirePayload?.verdict ?? 'pending',
              submittedAt: now,
            },
            timestamp: now,
          },
        })
        .catch(() => {})
    } catch {
      // Ignore realtime send failures; DB write already succeeded and fallback refresh listeners still apply.
    }

    return NextResponse.json({
      success: true,
      ...(rapidFirePayload || {}),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
