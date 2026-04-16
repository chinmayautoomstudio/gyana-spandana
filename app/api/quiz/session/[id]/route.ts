import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePoints } from '@/lib/services/scoringService'
import { getOccupiedLabels, nextOccupiedLabel } from '@/lib/quiz/teamSlots'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

function nextTeam(current: TeamLabel): TeamLabel {
  const idx = TEAM_LABELS.indexOf(current)
  return TEAM_LABELS[(idx + 1) % TEAM_LABELS.length]
}

/** Best-effort: notify subscribers so participant/host UIs refetch without waiting on postgres debounce. */
async function broadcastDirectVerdictApplied(
  sessionId: string,
  supabase: any,
  args: { questionEventId: string; teamLabel: string; verdict: 'correct' | 'wrong' },
) {
  const appliedAt = new Date().toISOString()
  try {
    const channel = supabase.channel(`quiz:session:${sessionId}`, {
      config: { broadcast: { self: true, ack: false } },
    })
    void channel
      .send({
        type: 'broadcast',
        event: 'quiz_event',
        payload: {
          type: 'direct_verdict_applied',
          payload: {
            questionEventId: args.questionEventId,
            teamLabel: args.teamLabel,
            verdict: args.verdict,
            appliedAt,
          },
          timestamp: appliedAt,
        },
      })
      .catch(() => {})
  } catch {
    // DB write already succeeded; postgres_changes remains fallback.
  }
}

async function assertHostOrAdmin(sessionId: string, supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' as const }
  }

  const { data: session } = await supabase
    .from('quiz_live_sessions')
    .select('id, assigned_host_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return { ok: false, status: 404, message: 'Session not found' as const }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role || user.user_metadata?.role || 'participant'
  if (role !== 'admin' && session.assigned_host_id !== user.id) {
    return { ok: false, status: 403, message: 'Forbidden' as const }
  }

  return { ok: true, user, role, session }
}

async function getScoreMap(sessionId: string, supabase: any) {
  const { data: scores } = await supabase
    .from('quiz_session_scores')
    .select('team_label,total_score')
    .eq('session_id', sessionId)

  return TEAM_LABELS.reduce((acc, label) => {
    acc[label] = scores?.find((s: any) => s.team_label === label)?.total_score || 0
    return acc
  }, {} as Record<TeamLabel, number>)
}

async function getTeamDisplayNames(session: { team_slots?: Record<string, string> | null }, supabase: any) {
  const slots = (session?.team_slots || {}) as Record<string, string>
  const ids = [...new Set(TEAM_LABELS.map((l) => slots[l]).filter(Boolean))]

  const nameById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: rows } = await supabase.from('teams').select('id, team_name').in('id', ids)
    for (const row of rows || []) {
      if (row?.id && row?.team_name != null) nameById.set(row.id, String(row.team_name))
    }
  }

  return TEAM_LABELS.reduce((acc, label) => {
    const id = slots[label]
    if (!id) {
      acc[label] = 'Unassigned'
    } else {
      const name = nameById.get(id)
      acc[label] = name ?? `Team ${id.slice(0, 8)}`
    }
    return acc
  }, {} as Record<TeamLabel, string>)
}

function previewText(text: string | null | undefined, maxLen = 72): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1)}…`
}

function stripCorrectAnswer(question: any | null, eventAllows: boolean) {
  if (!question) return question
  if (eventAllows) return question
  const rest = { ...question }
  delete rest.correct_answer
  return rest
}

/** Host/admin check without re-fetching quiz_live_sessions (GET handler already has assigned_host_id). */
async function resolveHostOrAdmin(
  assignedHostId: string | null | undefined,
  user: { id: string; user_metadata?: Record<string, unknown> } | null,
  supabase: any,
): Promise<{ isHostOrAdmin: boolean; userId: string | null }> {
  if (!user) return { isHostOrAdmin: false, userId: null }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  const role = profile?.role || user.user_metadata?.role || 'participant'
  const isHostOrAdmin = role === 'admin' || assignedHostId === user.id
  return { isHostOrAdmin, userId: user.id }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    // Batch 1: session + rounds + auth (independent)
    const [{ data: session, error: sessionError }, { data: rounds }, authRes] = await Promise.all([
      supabase.from('quiz_live_sessions').select('*').eq('id', sessionId).single(),
      supabase
        .from('quiz_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_order', { ascending: true }),
      supabase.auth.getUser(),
    ])

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const authUser = authRes.data?.user ?? null

    const activeRound =
      session.status === 'completed'
        ? null
        : rounds?.find((r: any) => r.status === 'active') ||
          rounds?.find((r: any) => r.id === session.current_round_id) ||
          null

    let latestEvent: any = null
    let activeRoundQuestions: Array<{
      id: string
      question_order: number
      question_type: string | null
      preview: string
    }> | null = null
    let pendingDirectAnswer: {
      team_label: string
      answer_text: string
      answer_option_label: 'A' | 'B' | 'C' | 'D' | null
      answer_option_text: string | null
    } | null = null
    let participantDirectAttempt: { answer_text: string; verdict: string } | null = null

    const roundId = activeRound?.id

    // Batch 2: latest event + round question list + host check + scores + team names (parallel)
    const eventPromise = roundId
      ? supabase
          .from('quiz_question_events')
          .select('*')
          .eq('round_id', roundId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })

    const qsPromise = roundId
      ? supabase
          .from('quiz_questions')
          .select('id, question_order, question_type, question_text')
          .eq('round_id', roundId)
          .order('question_order', { ascending: true })
      : Promise.resolve({ data: null })

    const [{ data: event }, { data: qs }, { isHostOrAdmin }, scores, team_display_names] = await Promise.all([
      eventPromise,
      qsPromise,
      resolveHostOrAdmin(session.assigned_host_id, authUser, supabase),
      getScoreMap(sessionId, supabase),
      getTeamDisplayNames(session, supabase),
    ])

    latestEvent = event || null
    activeRoundQuestions = roundId
      ? (qs || []).map((q: any) => ({
          id: q.id,
          question_order: q.question_order,
          question_type: q.question_type,
          preview: previewText(q.question_text),
        }))
      : null

    const ev = latestEvent as any
    const questionId = ev?.question_id as string | undefined
    const needPendingDirectAttempt =
      latestEvent &&
      isHostOrAdmin &&
      activeRound?.round_type === 'direct_question' &&
      ['revealed', 'options_revealed'].includes(String(ev?.status))

    const dirForAttempt = needPendingDirectAttempt ? (ev.directed_team as TeamLabel) : null
    const directAttemptPromise =
      needPendingDirectAttempt && dirForAttempt && TEAM_LABELS.includes(dirForAttempt)
        ? supabase
            .from('quiz_direct_attempts')
            .select('team_label, answer_text, verdict')
            .eq('question_event_id', ev.id)
            .eq('team_label', dirForAttempt)
            .eq('verdict', 'pending')
            .maybeSingle()
        : Promise.resolve({ data: null })

    const currentQuestionPromise = questionId
      ? supabase.from('quiz_questions').select('*').eq('id', questionId).single()
      : Promise.resolve({ data: null })

    // Batch 3: current question row + direct attempt (when host needs pending answer) in parallel
    const [{ data: questionRow }, { data: att }] = await Promise.all([
      currentQuestionPromise,
      directAttemptPromise,
    ])

    let currentQuestion: any = questionRow || null
    const revealCorrect = Boolean(ev?.correct_answer_revealed_at)
    const showCorrectInPayload = revealCorrect || isHostOrAdmin
    currentQuestion = stripCorrectAnswer(currentQuestion, showCorrectInPayload)

    if (att) {
      const rawAnswer = String(att.answer_text || '').trim().toUpperCase()
      const optionLabel =
        rawAnswer === 'A' || rawAnswer === 'B' || rawAnswer === 'C' || rawAnswer === 'D'
          ? (rawAnswer as 'A' | 'B' | 'C' | 'D')
          : null
      const optionText = optionLabel
        ? (currentQuestion?.[`option_${optionLabel.toLowerCase()}`] as string | null | undefined) || null
        : null
      pendingDirectAnswer = {
        team_label: att.team_label,
        answer_text: String(att.answer_text ?? ''),
        answer_option_label: optionLabel,
        answer_option_text: optionText,
      }
    }

    if (
      latestEvent &&
      !isHostOrAdmin &&
      activeRound?.round_type === 'direct_question' &&
      ['revealed', 'answered'].includes(String(ev?.status)) &&
      authUser
    ) {
      const { data: participantRow } = await supabase
        .from('participants')
        .select('team_id')
        .eq('user_id', authUser.id)
        .maybeSingle()
      const slotsPart = (session.team_slots || {}) as Record<string, string>
      const myLabel = TEAM_LABELS.find((l) => slotsPart[l] === participantRow?.team_id)
      if (myLabel) {
        const { data: pAtt } = await supabase
          .from('quiz_direct_attempts')
          .select('answer_text, verdict')
          .eq('question_event_id', ev.id)
          .eq('team_label', myLabel)
          .maybeSingle()
        if (pAtt) {
          participantDirectAttempt = {
            answer_text: String(pAtt.answer_text ?? ''),
            verdict: String(pAtt.verdict ?? 'pending'),
          }
        }
      }
    }

    return NextResponse.json({
      session,
      rounds: rounds || [],
      activeRound,
      currentQuestionEvent: latestEvent,
      currentQuestion,
      scores,
      team_display_names,
      activeRoundQuestions,
      pendingDirectAnswer,
      participantDirectAttempt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const auth = await assertHostOrAdmin(sessionId, supabase)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const body = await request.json()
    const action = body?.action as string

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    if (action === 'start_round') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      await supabase
        .from('quiz_rounds')
        .update({ status: 'active' })
        .eq('id', roundId)
        .eq('session_id', sessionId)

      await supabase
        .from('quiz_live_sessions')
        .update({ status: 'active', current_round_id: roundId, updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      const { data: round } = await supabase.from('quiz_rounds').select('*').eq('id', roundId).single()
      return NextResponse.json({ success: true, round })
    }

    if (action === 'reveal_question') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      const { data: sessionReveal } = await supabase
        .from('quiz_live_sessions')
        .select('is_test_session, team_slots')
        .eq('id', sessionId)
        .single()

      const occupiedReveal = getOccupiedLabels(
        (sessionReveal?.team_slots || {}) as Record<string, string>,
      )
      const rawDir = body?.directedTeam
      const hasDirected =
        typeof rawDir === 'string' && TEAM_LABELS.includes(rawDir.trim() as TeamLabel)
      let directedTeam: TeamLabel = hasDirected ? (rawDir.trim() as TeamLabel) : 'A'
      if (!hasDirected && sessionReveal?.is_test_session && occupiedReveal.length >= 1) {
        directedTeam = occupiedReveal[0]
      }

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,current_question_index')
        .eq('id', roundId)
        .single()

      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      const requestedQuestionId = typeof body?.questionId === 'string' ? body.questionId.trim() : ''
      let question: any = null

      if (requestedQuestionId) {
        const { data: qRow, error: qErr } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('id', requestedQuestionId)
          .eq('round_id', roundId)
          .single()
        if (qErr || !qRow) {
          return NextResponse.json({ error: 'Question not found in this round' }, { status: 400 })
        }
        const { data: inflight } = await supabase
          .from('quiz_question_events')
          .select('id')
          .eq('round_id', roundId)
          .eq('question_id', requestedQuestionId)
          .in('status', ['revealed', 'options_revealed', 'buzzer_open'])
          .limit(1)
          .maybeSingle()
        if (inflight) {
          return NextResponse.json(
            { error: 'This question is still in progress; finish or drop it first' },
            { status: 400 },
          )
        }
        question = qRow
      } else {
        const nextIndex = Number(round.current_question_index || 0)
        const { data: qRow } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('round_id', roundId)
          .eq('question_order', nextIndex + 1)
          .single()
        if (!qRow) {
          return NextResponse.json({ error: 'No more questions in this round' }, { status: 400 })
        }
        question = qRow
      }

      const { data: event, error: eventError } = await supabase
        .from('quiz_question_events')
        .insert({
          round_id: roundId,
          question_id: question.id,
          status: 'revealed',
          directed_team: directedTeam,
          attempt_number: 1,
        })
        .select('*')
        .single()

      if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 })
      }

      const newIndex = Math.max(Number(round.current_question_index || 0), Number(question.question_order || 0))
      await supabase.from('quiz_rounds').update({ current_question_index: newIndex }).eq('id', roundId)

      return NextResponse.json({
        success: true,
        event,
        question,
        roundQuestionIndex: question.question_order,
      })
    }

    if (action === 'reveal_options') {
      const questionEventId = body?.questionEventId as string | undefined
      const directedTeam = body?.directedTeam as TeamLabel | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }

      const { data: evRound } = await supabase
        .from('quiz_question_events')
        .select('round_id')
        .eq('id', questionEventId)
        .single()
      const { data: roForReveal } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', evRound?.round_id || '')
        .maybeSingle()
      if (roForReveal?.round_type === 'direct_question') {
        return NextResponse.json(
          { error: 'Reveal options is not used for direct question rounds' },
          { status: 400 },
        )
      }

      const update: Record<string, unknown> = {
        status: 'options_revealed',
        attempt_number: 2,
      }
      if (directedTeam) update.directed_team = directedTeam

      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update(update)
        .eq('id', questionEventId)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
    }

    if (action === 'mark_correct') {
      const questionEventId = body?.questionEventId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!questionEventId || !teamLabel) {
        return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()
      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (round?.round_type === 'direct_question' && event.status === 'revealed') {
        return NextResponse.json(
          { error: 'Use Correct (judge) for direct question rounds while the question is open' },
          { status: 400 },
        )
      }
      const { data: session } = await supabase
        .from('quiz_live_sessions')
        .select('points_full, points_half')
        .eq('id', sessionId)
        .single()
      const { data: question } = await supabase
        .from('quiz_questions')
        .select('correct_answer')
        .eq('id', event.question_id)
        .single()

      const pointsAwarded = resolvePoints(
        Number(event.attempt_number || 1),
        Number(session?.points_full || 10),
        Number(session?.points_half || 5),
        round?.round_type || 'direct_question',
      )

      await supabase
        .from('quiz_question_events')
        .update({
          status: 'answered',
          answered_by_team: teamLabel,
          points_awarded: pointsAwarded,
        })
        .eq('id', questionEventId)

      const { data: scoreRow } = await supabase
        .from('quiz_session_scores')
        .select('id,total_score,questions_answered,questions_correct')
        .eq('session_id', sessionId)
        .eq('team_label', teamLabel)
        .single()

      if (!scoreRow) return NextResponse.json({ error: 'Score row missing for team' }, { status: 500 })

      await supabase
        .from('quiz_session_scores')
        .update({
          total_score: Number(scoreRow.total_score || 0) + pointsAwarded,
          questions_answered: Number(scoreRow.questions_answered || 0) + 1,
          questions_correct: Number(scoreRow.questions_correct || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scoreRow.id)

      const updatedScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({
        success: true,
        result: {
          questionEventId,
          correct: true,
          teamLabel,
          pointsAwarded,
          correctAnswer: question?.correct_answer || '',
          updatedScores,
        },
      })
    }

    if (action === 'mark_wrong_pass') {
      const questionEventId = body?.questionEventId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!questionEventId || !teamLabel) {
        return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()

      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })

      const { data: roundMcq } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (roundMcq?.round_type === 'direct_question' && event.status === 'revealed') {
        return NextResponse.json(
          { error: 'Use Pass to next team for direct question rounds' },
          { status: 400 },
        )
      }

      const { data: sessionPass } = await supabase
        .from('quiz_live_sessions')
        .select('is_test_session, team_slots')
        .eq('id', sessionId)
        .single()

      const occupied = getOccupiedLabels((sessionPass?.team_slots || {}) as Record<string, string>)
      const useTestRotation = Boolean(sessionPass?.is_test_session) && occupied.length > 0
      const passThreshold = useTestRotation ? occupied.length : 4

      const attemptNumber = Number(event.attempt_number || 1)
      await supabase.from('quiz_pass_log').insert({
        question_event_id: questionEventId,
        team_label: teamLabel,
        attempt_number: attemptNumber,
        passed_or_wrong: true,
      })

      if (attemptNumber === 1) {
        const newDirectedTeam = useTestRotation
          ? nextOccupiedLabel(teamLabel, occupied)
          : nextTeam(teamLabel)
        const { data: updatedEvent } = await supabase
          .from('quiz_question_events')
          .update({
            status: 'options_revealed',
            attempt_number: 2,
            directed_team: newDirectedTeam,
          })
          .eq('id', questionEventId)
          .select('*')
          .single()
        return NextResponse.json({ success: true, state: 'options_revealed', event: updatedEvent })
      }

      const { data: passRows } = await supabase
        .from('quiz_pass_log')
        .select('team_label')
        .eq('question_event_id', questionEventId)
        .eq('attempt_number', 2)

      const tried = new Set((passRows || []).map((p: any) => p.team_label))
      if (tried.size >= passThreshold) {
        const { data: updatedEvent } = await supabase
          .from('quiz_question_events')
          .update({ status: 'dropped' })
          .eq('id', questionEventId)
          .select('*')
          .single()
        return NextResponse.json({ success: true, state: 'dropped', event: updatedEvent })
      }

      const order: TeamLabel[] =
        useTestRotation && occupied.length > 0 ? occupied : [...TEAM_LABELS]
      const next =
        order.find((l) => !tried.has(l)) ||
        (useTestRotation ? nextOccupiedLabel(teamLabel, occupied) : nextTeam(teamLabel))
      const { data: updatedEvent } = await supabase
        .from('quiz_question_events')
        .update({ directed_team: next })
        .eq('id', questionEventId)
        .select('*')
        .single()
      return NextResponse.json({ success: true, state: 'pass_next_team', event: updatedEvent })
    }

    if (action === 'judge_direct_answer') {
      const questionEventId = body?.questionEventId as string | undefined
      const verdict = body?.verdict as string | undefined
      if (!questionEventId || (verdict !== 'correct' && verdict !== 'wrong')) {
        return NextResponse.json(
          { error: 'questionEventId and verdict (correct|wrong) are required' },
          { status: 400 },
        )
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()
      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })
      if (event.status !== 'revealed') {
        return NextResponse.json({ error: 'Question is not open for judging' }, { status: 400 })
      }
      if (event.correct_answer_revealed_at) {
        return NextResponse.json({ error: 'Question is closed' }, { status: 400 })
      }

      const { data: roundJ } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (roundJ?.round_type !== 'direct_question') {
        return NextResponse.json({ error: 'Only for direct question rounds' }, { status: 400 })
      }

      const teamLabel = event.directed_team as TeamLabel
      if (!teamLabel || !TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'Invalid directed team' }, { status: 400 })
      }

      const { data: attempt } = await supabase
        .from('quiz_direct_attempts')
        .select('*')
        .eq('question_event_id', questionEventId)
        .eq('team_label', teamLabel)
        .maybeSingle()

      if (!attempt) {
        return NextResponse.json({ error: 'No answer submitted for this team yet' }, { status: 400 })
      }
      if (attempt.verdict !== 'pending') {
        return NextResponse.json({ error: 'Answer already judged' }, { status: 400 })
      }

      const now = new Date().toISOString()
      if (verdict === 'wrong') {
        await supabase
          .from('quiz_direct_attempts')
          .update({ verdict: 'wrong', updated_at: now })
          .eq('id', attempt.id)
        await broadcastDirectVerdictApplied(sessionId, supabase, {
          questionEventId,
          teamLabel,
          verdict: 'wrong',
        })
        return NextResponse.json({ success: true, verdict: 'wrong', event })
      }

      const { data: sessionJ } = await supabase
        .from('quiz_live_sessions')
        .select('points_full, points_half')
        .eq('id', sessionId)
        .single()
      const pointsAwarded = resolvePoints(
        Number(event.attempt_number || 1),
        Number(sessionJ?.points_full || 10),
        Number(sessionJ?.points_half || 5),
        'direct_question',
      )

      await supabase
        .from('quiz_direct_attempts')
        .update({ verdict: 'correct', updated_at: now })
        .eq('id', attempt.id)

      await supabase
        .from('quiz_question_events')
        .update({
          status: 'answered',
          answered_by_team: teamLabel,
          points_awarded: pointsAwarded,
        })
        .eq('id', questionEventId)

      const { data: scoreRowJ } = await supabase
        .from('quiz_session_scores')
        .select('id,total_score,questions_answered,questions_correct')
        .eq('session_id', sessionId)
        .eq('team_label', teamLabel)
        .single()

      if (!scoreRowJ) return NextResponse.json({ error: 'Score row missing for team' }, { status: 500 })

      await supabase
        .from('quiz_session_scores')
        .update({
          total_score: Number(scoreRowJ.total_score || 0) + pointsAwarded,
          questions_answered: Number(scoreRowJ.questions_answered || 0) + 1,
          questions_correct: Number(scoreRowJ.questions_correct || 0) + 1,
          updated_at: now,
        })
        .eq('id', scoreRowJ.id)

      const { data: qAns } = await supabase
        .from('quiz_questions')
        .select('correct_answer')
        .eq('id', event.question_id)
        .single()
      const updatedScores = await getScoreMap(sessionId, supabase)
      await broadcastDirectVerdictApplied(sessionId, supabase, {
        questionEventId,
        teamLabel,
        verdict: 'correct',
      })
      return NextResponse.json({
        success: true,
        verdict: 'correct',
        teamLabel,
        pointsAwarded,
        correctAnswer: qAns?.correct_answer || '',
        updatedScores,
      })
    }

    if (action === 'pass_direct_question') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()
      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })
      if (event.status !== 'revealed') {
        return NextResponse.json({ error: 'Can only pass while the question is open' }, { status: 400 })
      }
      if (event.correct_answer_revealed_at) {
        return NextResponse.json({ error: 'Question is closed' }, { status: 400 })
      }

      const { data: roundP } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (roundP?.round_type !== 'direct_question') {
        return NextResponse.json({ error: 'Only for direct question rounds' }, { status: 400 })
      }

      const { data: sessionP } = await supabase
        .from('quiz_live_sessions')
        .select('is_test_session, team_slots')
        .eq('id', sessionId)
        .single()
      const occupiedP = getOccupiedLabels((sessionP?.team_slots || {}) as Record<string, string>)
      const useTestRotation = Boolean(sessionP?.is_test_session) && occupiedP.length > 0
      const passThreshold = useTestRotation ? occupiedP.length : 4

      const teamLabel = event.directed_team as TeamLabel
      const now = new Date().toISOString()

      await supabase
        .from('quiz_direct_attempts')
        .update({ verdict: 'wrong', updated_at: now })
        .eq('question_event_id', questionEventId)
        .eq('team_label', teamLabel)
        .eq('verdict', 'pending')

      const { data: anyAttemptRow } = await supabase
        .from('quiz_direct_attempts')
        .select('id')
        .eq('question_event_id', questionEventId)
        .eq('team_label', teamLabel)
        .maybeSingle()
      if (!anyAttemptRow) {
        const { error: insErr } = await supabase.from('quiz_direct_attempts').insert({
          session_id: sessionId,
          question_event_id: questionEventId,
          team_label: teamLabel,
          answer_text: '',
          verdict: 'wrong',
        })
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      }

      const attemptNumber = Number(event.attempt_number || 1)
      await supabase.from('quiz_pass_log').insert({
        question_event_id: questionEventId,
        team_label: teamLabel,
        attempt_number: attemptNumber,
        passed_or_wrong: true,
      })

      if (attemptNumber === 1) {
        const newDirectedTeam = useTestRotation
          ? nextOccupiedLabel(teamLabel, occupiedP)
          : nextTeam(teamLabel)
        const { data: updatedEvent, error: uErr } = await supabase
          .from('quiz_question_events')
          .update({
            status: 'revealed',
            attempt_number: 2,
            directed_team: newDirectedTeam,
          })
          .eq('id', questionEventId)
          .select('*')
          .single()
        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
        return NextResponse.json({ success: true, state: 'pass_next_team', event: updatedEvent })
      }

      const { data: passRowsP } = await supabase
        .from('quiz_pass_log')
        .select('team_label')
        .eq('question_event_id', questionEventId)
        .eq('attempt_number', 2)

      const tried = new Set((passRowsP || []).map((p: any) => p.team_label))
      if (tried.size >= passThreshold) {
        return NextResponse.json({
          success: true,
          state: 'awaiting_reveal_or_skip',
          event,
        })
      }

      const orderP: TeamLabel[] =
        useTestRotation && occupiedP.length > 0 ? occupiedP : [...TEAM_LABELS]
      const nextP =
        orderP.find((l) => !tried.has(l)) ||
        (useTestRotation ? nextOccupiedLabel(teamLabel, occupiedP) : nextTeam(teamLabel))
      const { data: updatedEventP, error: uErr2 } = await supabase
        .from('quiz_question_events')
        .update({ directed_team: nextP, status: 'revealed' })
        .eq('id', questionEventId)
        .select('*')
        .single()
      if (uErr2) return NextResponse.json({ error: uErr2.message }, { status: 500 })
      return NextResponse.json({ success: true, state: 'pass_next_team', event: updatedEventP })
    }

    if (action === 'reveal_correct_answer') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()
      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })
      if (event.correct_answer_revealed_at) {
        return NextResponse.json({ error: 'Answer already revealed' }, { status: 400 })
      }

      const { data: roundR } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (roundR?.round_type !== 'direct_question') {
        return NextResponse.json({ error: 'Only for direct question rounds' }, { status: 400 })
      }

      const { data: sessionR } = await supabase
        .from('quiz_live_sessions')
        .select('team_slots, is_test_session')
        .eq('id', sessionId)
        .single()
      const occupiedR = getOccupiedLabels((sessionR?.team_slots || {}) as Record<string, string>)
      const labels = occupiedR.length > 0 ? occupiedR : [...TEAM_LABELS]

      for (const L of labels) {
        const { data: wr } = await supabase
          .from('quiz_direct_attempts')
          .select('id')
          .eq('question_event_id', questionEventId)
          .eq('team_label', L)
          .eq('verdict', 'wrong')
          .maybeSingle()
        if (!wr) {
          return NextResponse.json(
            { error: `Each team must be marked wrong before revealing the answer (missing: Team ${L})` },
            { status: 400 },
          )
        }
      }

      const revealedAt = new Date().toISOString()
      const { data: updatedEv, error: revErr } = await supabase
        .from('quiz_question_events')
        .update({
          correct_answer_revealed_at: revealedAt,
          status: 'dropped',
        })
        .eq('id', questionEventId)
        .select('*')
        .single()
      if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 })
      return NextResponse.json({ success: true, event: updatedEv })
    }

    if (action === 'skip_question') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })

      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update({ status: 'dropped' })
        .eq('id', questionEventId)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
    }

    if (action === 'end_round') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      await supabase.from('quiz_rounds').update({ status: 'completed' }).eq('id', roundId)
      const { data: round } = await supabase.from('quiz_rounds').select('*').eq('id', roundId).single()
      const finalScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({ success: true, round, finalScores })
    }

    if (action === 'end_session') {
      const now = new Date().toISOString()
      const { data: updatedRounds, error: roundsError } = await supabase
        .from('quiz_rounds')
        .update({ status: 'completed' })
        .eq('session_id', sessionId)
        .neq('status', 'completed')
        .select('id')

      if (roundsError) {
        return NextResponse.json({ error: roundsError.message }, { status: 500 })
      }

      const { data: updatedSession, error: sessionError } = await supabase
        .from('quiz_live_sessions')
        .update({ status: 'completed', current_round_id: null, updated_at: now })
        .eq('id', sessionId)
        .select('id, status, current_round_id, updated_at')
        .single()

      if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        session: updatedSession,
        roundsCompletedCount: (updatedRounds || []).length,
      })
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

