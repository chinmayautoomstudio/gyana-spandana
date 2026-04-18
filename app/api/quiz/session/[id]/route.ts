import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePoints } from '@/lib/services/scoringService'
import { applyBuzzerWrongOutcome } from '@/lib/services/buzzerRoundService'
import { runBuzzerAnswerTimeout } from '@/lib/services/buzzerAnswerTimeout'
import { getOccupiedLabels, nextOccupiedLabel } from '@/lib/quiz/teamSlots'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]
type ScoreboardTeamRow = {
  teamLabel: TeamLabel
  teamName: string
  total: number
  rounds: Record<string, number>
}

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

/** Best-effort: participants subscribe for `timer_started` to sync Rapid Fire countdown. */
async function broadcastTimerStarted(
  sessionId: string,
  supabase: any,
  args: { questionEventId: string; durationSeconds: number; team: string },
) {
  const now = new Date().toISOString()
  try {
    const channel = supabase.channel(`quiz:session:${sessionId}`, {
      config: { broadcast: { self: true, ack: false } },
    })
    await new Promise<void>((resolve) => {
      const fallback = setTimeout(() => resolve(), 1500)
      channel.subscribe((status: string) => {
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
        type: 'timer_started',
        payload: {
          questionEventId: args.questionEventId,
          durationSeconds: args.durationSeconds,
          team: args.team,
        },
        timestamp: now,
      },
    })
    void supabase.removeChannel(channel)
  } catch {
    // DB write already succeeded; polling + GET rapidFireTimer remain fallback.
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

async function buildFinalScoreboard(
  sessionId: string,
  session: { team_slots?: Record<string, string> | null; is_test_session?: boolean | null },
  supabase: any,
) {
  const [teamDisplayNames, roundsRes, totalsRes] = await Promise.all([
    getTeamDisplayNames(session, supabase),
    supabase
      .from('quiz_rounds')
      .select('id,title,round_order')
      .eq('session_id', sessionId)
      .order('round_order', { ascending: true }),
    supabase
      .from('quiz_session_scores')
      .select('team_label,total_score')
      .eq('session_id', sessionId),
  ])

  const rounds = roundsRes.data || []
  const roundIds = rounds.map((r: any) => r.id)

  let perRoundEvents: Array<{ round_id: string; answered_by_team: TeamLabel; points_awarded: number | null }> = []
  if (roundIds.length > 0) {
    const { data } = await supabase
      .from('quiz_question_events')
      .select('round_id,answered_by_team,points_awarded')
      .in('round_id', roundIds)
      .in('status', ['answered', 'dropped'])
      .not('answered_by_team', 'is', null)
    perRoundEvents = (data || []) as typeof perRoundEvents
  }

  const slots = (session?.team_slots || {}) as Record<string, string>
  const occupiedLabels = TEAM_LABELS.filter((label) => Boolean(slots[label]))
  const participatingLabels = session?.is_test_session
    ? occupiedLabels
    : TEAM_LABELS

  const totalsByLabel = TEAM_LABELS.reduce((acc, label) => {
    const row = (totalsRes.data || []).find((r: any) => r.team_label === label)
    acc[label] = Number(row?.total_score || 0)
    return acc
  }, {} as Record<TeamLabel, number>)

  const perRoundByTeam: Record<TeamLabel, Record<string, number>> = TEAM_LABELS.reduce((acc, label) => {
    acc[label] = {}
    return acc
  }, {} as Record<TeamLabel, Record<string, number>>)

  for (const event of perRoundEvents) {
    const label = String(event.answered_by_team || '').toUpperCase() as TeamLabel
    if (!TEAM_LABELS.includes(label)) continue
    const roundId = String(event.round_id || '')
    if (!roundId) continue
    perRoundByTeam[label][roundId] =
      Number(perRoundByTeam[label][roundId] || 0) + Number(event.points_awarded || 0)
  }

  const teams: ScoreboardTeamRow[] = participatingLabels
    .map((label) => ({
      teamLabel: label,
      teamName: teamDisplayNames[label] || `Team ${label}`,
      total: totalsByLabel[label] || 0,
      rounds: perRoundByTeam[label] || {},
    }))
    .sort((a, b) => b.total - a.total)

  return {
    rounds: rounds.map((round: any) => ({
      id: round.id,
      title: round.title || `Round ${round.round_order || ''}`.trim(),
      roundOrder: Number(round.round_order || 0),
    })),
    teams,
  }
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
      answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
      answer_option_text: string | null
    } | null = null
    let pendingBuzzerAnswer: {
      team_label: string
      answer_text: string
      answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
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
    const completedEventsPromise = roundId
      ? supabase
          .from('quiz_question_events')
          .select('question_id')
          .eq('round_id', roundId)
          .in('status', ['answered', 'dropped'])
      : Promise.resolve({ data: null })

    const [{ data: event }, { data: qs }, { data: completedEvents }, { isHostOrAdmin }, scores, team_display_names] =
      await Promise.all([
      eventPromise,
      qsPromise,
      completedEventsPromise,
      resolveHostOrAdmin(session.assigned_host_id, authUser, supabase),
      getScoreMap(sessionId, supabase),
      getTeamDisplayNames(session, supabase),
    ])

    latestEvent = event || null
    const completedQuestionIds = new Set(
      (completedEvents || [])
        .map((row: any) => String(row?.question_id || '').trim())
        .filter((id: string) => id.length > 0),
    )
    activeRoundQuestions = roundId
      ? (qs || [])
          .filter((q: any) => !completedQuestionIds.has(String(q?.id || '')))
          .map((q: any) => ({
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
      (activeRound?.round_type === 'direct_question' || activeRound?.round_type === 'true_or_false') &&
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
    const fallbackDirectAttemptPromise =
      needPendingDirectAttempt && ev?.id
        ? supabase
            .from('quiz_direct_attempts')
            .select('team_label, answer_text, verdict')
            .eq('question_event_id', ev.id)
            .eq('verdict', 'pending')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null })

    const currentQuestionPromise = questionId
      ? supabase.from('quiz_questions').select('*').eq('id', questionId).single()
      : Promise.resolve({ data: null })

    // Batch 3: current question row + direct attempt (when host needs pending answer) in parallel
    const [{ data: questionRow }, { data: att }, { data: fallbackAtt }] = await Promise.all([
      currentQuestionPromise,
      directAttemptPromise,
      fallbackDirectAttemptPromise,
    ])

    let currentQuestion: any = questionRow || null
    const revealCorrect = Boolean(ev?.correct_answer_revealed_at)
    const showCorrectInPayload = revealCorrect || isHostOrAdmin
    currentQuestion = stripCorrectAnswer(currentQuestion, showCorrectInPayload)

    const chosenAttempt = att || fallbackAtt || null
    if (chosenAttempt) {
      const rawAnswer = String(chosenAttempt.answer_text || '').trim().toUpperCase()
      const optionLabel =
        rawAnswer === 'A' || rawAnswer === 'B' || rawAnswer === 'C' || rawAnswer === 'D'
          ? (rawAnswer as 'A' | 'B' | 'C' | 'D')
          : rawAnswer === 'TRUE' || rawAnswer === 'FALSE'
            ? (rawAnswer as 'TRUE' | 'FALSE')
          : null
      const optionText = optionLabel
        ? optionLabel === 'TRUE' || optionLabel === 'FALSE'
          ? optionLabel
          : (currentQuestion?.[`option_${optionLabel.toLowerCase()}`] as string | null | undefined) || null
        : null
      pendingDirectAnswer = {
        team_label: chosenAttempt.team_label,
        answer_text: String(chosenAttempt.answer_text ?? ''),
        answer_option_label: optionLabel,
        answer_option_text: optionText,
      }
    }

    if (
      latestEvent &&
      isHostOrAdmin &&
      activeRound?.round_type === 'buzzer' &&
      String(ev?.status) === 'buzzer_open'
    ) {
      const [{ data: buzzRows }, { data: passRows }] = await Promise.all([
        supabase
          .from('quiz_buzz_events')
          .select('team_label,buzz_order,buzzed_at,id,client_pressed_at_ms')
          .eq('question_event_id', ev.id)
          .order('client_pressed_at_ms', { ascending: true })
          .order('buzzed_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('quiz_pass_log')
          .select('team_label')
          .eq('question_event_id', ev.id)
          .eq('passed_or_wrong', true),
      ])

      const excluded = new Set((passRows || []).map((row: any) => String(row.team_label)))
      const activeBuzz = (buzzRows || []).find((row: any) => !excluded.has(String(row.team_label)))
      const activeTeam = String(activeBuzz?.team_label || '').toUpperCase()

      if (activeTeam === 'A' || activeTeam === 'B' || activeTeam === 'C' || activeTeam === 'D') {
        const { data: bAtt } = await supabase
          .from('quiz_direct_attempts')
          .select('team_label,answer_text,verdict')
          .eq('question_event_id', ev.id)
          .eq('team_label', activeTeam)
          .eq('verdict', 'pending')
          .maybeSingle()

        if (bAtt) {
          const rawAnswer = String(bAtt.answer_text || '').trim().toUpperCase()
          const optionLabel =
            rawAnswer === 'A' || rawAnswer === 'B' || rawAnswer === 'C' || rawAnswer === 'D'
              ? (rawAnswer as 'A' | 'B' | 'C' | 'D')
              : rawAnswer === 'TRUE' || rawAnswer === 'FALSE'
                ? (rawAnswer as 'TRUE' | 'FALSE')
              : null
          const optionText = optionLabel
            ? optionLabel === 'TRUE' || optionLabel === 'FALSE'
              ? optionLabel
              : (currentQuestion?.[`option_${optionLabel.toLowerCase()}`] as string | null | undefined) || null
            : null
          pendingBuzzerAnswer = {
            team_label: String(bAtt.team_label),
            answer_text: String(bAtt.answer_text ?? ''),
            answer_option_label: optionLabel,
            answer_option_text: optionText,
          }
        }
      }
    }

    if (
      latestEvent &&
      !isHostOrAdmin &&
      (activeRound?.round_type === 'direct_question' ||
        activeRound?.round_type === 'buzzer' ||
        activeRound?.round_type === 'true_or_false') &&
      ['revealed', 'options_revealed', 'buzzer_open', 'answered', 'dropped'].includes(String(ev?.status)) &&
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

    let rapidFireTimer: { startedAt: string; durationSeconds: number } | null = null
    if (
      activeRound?.round_type === 'rapid_fire' &&
      latestEvent &&
      ['revealed', 'options_revealed', 'buzzer_open'].includes(String((latestEvent as any)?.status || ''))
    ) {
      const evRf = latestEvent as { rapid_fire_team?: string }
      const rfTeam = String(evRf?.rapid_fire_team || '').trim().toUpperCase()
      if (TEAM_LABELS.includes(rfTeam as TeamLabel)) {
        const { data: rfSess } = await supabase
          .from('quiz_rapid_fire_sessions')
          .select('started_at, duration_seconds')
          .eq('team_label', rfTeam)
          .is('ended_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (rfSess?.started_at != null && rfSess.duration_seconds != null) {
          rapidFireTimer = {
            startedAt: String(rfSess.started_at),
            durationSeconds: Number(rfSess.duration_seconds),
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
      pendingBuzzerAnswer,
      participantDirectAttempt,
      rapidFireTimer,
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
        .select('is_test_session, team_slots, buzzer_next_directed_team')
        .eq('id', sessionId)
        .single()

      const occupiedReveal = getOccupiedLabels(
        (sessionReveal?.team_slots || {}) as Record<string, string>,
      )
      const rawDir = body?.directedTeam
      const hasDirected =
        typeof rawDir === 'string' && TEAM_LABELS.includes(rawDir.trim() as TeamLabel)

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,current_question_index,round_type')
        .eq('id', roundId)
        .single()

      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      let directedTeam: TeamLabel = 'A'
      if (hasDirected) {
        directedTeam = (rawDir as string).trim() as TeamLabel
      } else if (round.round_type === 'buzzer') {
        const hint = String(sessionReveal?.buzzer_next_directed_team || '').trim().toUpperCase()
        if (TEAM_LABELS.includes(hint as TeamLabel)) {
          directedTeam = hint as TeamLabel
        } else if (sessionReveal?.is_test_session && occupiedReveal.length >= 1) {
          directedTeam = occupiedReveal[0]
        }
      } else if (sessionReveal?.is_test_session && occupiedReveal.length >= 1) {
        directedTeam = occupiedReveal[0]
      }

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

      if (round.round_type === 'buzzer') {
        await supabase
          .from('quiz_live_sessions')
          .update({ buzzer_next_directed_team: null, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      }

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

      const buzzerExtras = round?.round_type === 'buzzer' ? { buzzer_answer_deadline_at: null as string | null } : {}
      await supabase
        .from('quiz_question_events')
        .update({
          status: 'answered',
          answered_by_team: teamLabel,
          points_awarded: pointsAwarded,
          ...buzzerExtras,
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

    if (action === 'buzzer_answer_timeout') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }

      const result = await runBuzzerAnswerTimeout(supabase, sessionId, questionEventId)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }
      return NextResponse.json({
        success: true,
        state: 'dropped',
        event: result.event,
        updatedScores: result.updatedScores,
        penalty: result.penalty,
        teamLabel: result.teamLabel,
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
      if (roundMcq?.round_type === 'buzzer') {
        const attemptNumber = Number(event.attempt_number || 1)
        const applied = await applyBuzzerWrongOutcome(supabase, {
          sessionId,
          questionEventId,
          teamLabel,
          attemptNumber,
          insertPassLog: true,
          afterTimeout: false,
        })
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: applied.status })
        }
        await broadcastDirectVerdictApplied(sessionId, supabase, {
          questionEventId,
          teamLabel,
          verdict: 'wrong',
        })
        const updatedScores = await getScoreMap(sessionId, supabase)
        return NextResponse.json({
          success: true,
          state: 'dropped',
          event: applied.updatedEvent,
          updatedScores,
          penalty: applied.penalty,
        })
      }
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

    if (action === 'check_direct_response') {
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
      if (
        event.status !== 'revealed' &&
        event.status !== 'buzzer_open' &&
        event.status !== 'options_revealed'
      ) {
        return NextResponse.json({ error: 'Question is not open for checking' }, { status: 400 })
      }
      if (event.correct_answer_revealed_at) {
        return NextResponse.json({ error: 'Question is closed' }, { status: 400 })
      }

      const { data: roundC } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      if (
        roundC?.round_type !== 'direct_question' &&
        roundC?.round_type !== 'buzzer' &&
        roundC?.round_type !== 'true_or_false'
      ) {
        return NextResponse.json(
          { error: 'Only for direct question, true or false, or buzzer rounds' },
          { status: 400 },
        )
      }

      let teamLabel: TeamLabel | null = null
      if (roundC?.round_type === 'direct_question' || roundC?.round_type === 'true_or_false') {
        const directedTeam = event.directed_team as TeamLabel
        if (!directedTeam || !TEAM_LABELS.includes(directedTeam)) {
          return NextResponse.json({ error: 'Invalid directed team' }, { status: 400 })
        }
        teamLabel = directedTeam
      } else {
        if (event.status !== 'buzzer_open') {
          return NextResponse.json({ error: 'Buzzer is not open for checking' }, { status: 400 })
        }
        const [{ data: buzzRows, error: buzzErr }, { data: passRows, error: passErr }] = await Promise.all([
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
        const activeBuzz = (buzzRows || []).find((row: any) => !excluded.has(String(row.team_label)))
        const activeTeam = String(activeBuzz?.team_label || '').toUpperCase()
        if (activeTeam !== 'A' && activeTeam !== 'B' && activeTeam !== 'C' && activeTeam !== 'D') {
          return NextResponse.json({ error: 'No active team is available to answer' }, { status: 400 })
        }
        teamLabel = activeTeam as TeamLabel
      }

      if (!teamLabel || !TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'Invalid team to check' }, { status: 400 })
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

      const { data: qAns, error: qAnsError } = await supabase
        .from('quiz_questions')
        .select('question_type, correct_answer, option_a, option_b, option_c, option_d')
        .eq('id', event.question_id)
        .single()
      if (qAnsError || !qAns) {
        return NextResponse.json(
          { error: qAnsError?.message || 'Question data not found for this event' },
          { status: 500 },
        )
      }

      const normalizeOptionValue = (input: string | null | undefined) => {
        const normalized = String(input || '').trim().toUpperCase()
        const first = normalized.charAt(0)
        if (first === 'A' || first === 'B' || first === 'C' || first === 'D') return first
        return normalized
      }

      const submittedRaw = String(attempt.answer_text || '').trim().toUpperCase()
      const isTrueFalseQuestion = String(qAns?.question_type || '').toLowerCase() === 'true_false'
      const submitted = isTrueFalseQuestion ? submittedRaw : normalizeOptionValue(submittedRaw)
      const correctAnswer = String(qAns?.correct_answer || '').trim().toUpperCase()
      const normalizedCorrect = isTrueFalseQuestion ? correctAnswer : normalizeOptionValue(correctAnswer)
      const verdict: 'correct' | 'wrong' =
        submitted && normalizedCorrect && submitted === normalizedCorrect ? 'correct' : 'wrong'

      const correctAnswerLabel =
        normalizedCorrect === 'A' ||
        normalizedCorrect === 'B' ||
        normalizedCorrect === 'C' ||
        normalizedCorrect === 'D' ||
        normalizedCorrect === 'TRUE' ||
        normalizedCorrect === 'FALSE'
          ? (normalizedCorrect as 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE')
          : null
      const correctAnswerOptionText = correctAnswerLabel
        ? correctAnswerLabel === 'TRUE' || correctAnswerLabel === 'FALSE'
          ? correctAnswerLabel
          : correctAnswerLabel === 'A'
          ? qAns?.option_a || null
          : correctAnswerLabel === 'B'
            ? qAns?.option_b || null
            : correctAnswerLabel === 'C'
              ? qAns?.option_c || null
              : qAns?.option_d || null
        : null

      const now = new Date().toISOString()
      if (verdict === 'wrong') {
        const isTrueOrFalseRound = roundC?.round_type === 'true_or_false'
        const isBuzzerRound = roundC?.round_type === 'buzzer'

        if (isBuzzerRound) {
          const applied = await applyBuzzerWrongOutcome(supabase, {
            sessionId,
            questionEventId,
            teamLabel,
            attemptNumber: Number(event.attempt_number || 1),
            insertPassLog: false,
            afterTimeout: false,
          })
          if (!applied.ok) {
            return NextResponse.json({ error: applied.error }, { status: applied.status })
          }
          await broadcastDirectVerdictApplied(sessionId, supabase, {
            questionEventId,
            teamLabel,
            verdict: 'wrong',
          })
          const updatedScoresB = await getScoreMap(sessionId, supabase)
          return NextResponse.json({
            success: true,
            verdict: 'wrong',
            teamLabel,
            correctAnswer,
            correctAnswerOptionText,
            updatedScores: updatedScoresB,
            penalty: applied.penalty,
          })
        }

        await supabase
          .from('quiz_direct_attempts')
          .update({ verdict: 'wrong', updated_at: now })
          .eq('id', attempt.id)

        if (isTrueOrFalseRound) {
          await supabase
            .from('quiz_question_events')
            .update({
              status: 'dropped',
              points_awarded: 0,
              answered_by_team: teamLabel,
            })
            .eq('id', questionEventId)

          const { data: scoreRowW } = await supabase
            .from('quiz_session_scores')
            .select('id,questions_answered')
            .eq('session_id', sessionId)
            .eq('team_label', teamLabel)
            .single()
          if (!scoreRowW) return NextResponse.json({ error: 'Score row missing for team' }, { status: 500 })

          await supabase
            .from('quiz_session_scores')
            .update({
              questions_answered: Number(scoreRowW.questions_answered || 0) + 1,
              updated_at: now,
            })
            .eq('id', scoreRowW.id)
        }

        await broadcastDirectVerdictApplied(sessionId, supabase, {
          questionEventId,
          teamLabel,
          verdict: 'wrong',
        })
        const updatedScores = roundC?.round_type === 'true_or_false' ? await getScoreMap(sessionId, supabase) : null
        return NextResponse.json({
          success: true,
          verdict: 'wrong',
          teamLabel,
          correctAnswer,
          correctAnswerOptionText,
          ...(updatedScores ? { updatedScores } : {}),
        })
      }

      const { data: sessionC } = await supabase
        .from('quiz_live_sessions')
        .select('points_full, points_half')
        .eq('id', sessionId)
        .single()
      const pointsAwarded = resolvePoints(
        Number(event.attempt_number || 1),
        Number(sessionC?.points_full || 10),
        Number(sessionC?.points_half || 5),
        roundC?.round_type === 'buzzer' ? 'buzzer' : 'direct_question',
      )

      await supabase
        .from('quiz_direct_attempts')
        .update({ verdict: 'correct', updated_at: now })
        .eq('id', attempt.id)

      const buzzerCorrectExtras = roundC?.round_type === 'buzzer' ? { buzzer_answer_deadline_at: null as string | null } : {}
      await supabase
        .from('quiz_question_events')
        .update({
          status: 'answered',
          answered_by_team: teamLabel,
          points_awarded: pointsAwarded,
          ...buzzerCorrectExtras,
        })
        .eq('id', questionEventId)

      const { data: scoreRowC } = await supabase
        .from('quiz_session_scores')
        .select('id,total_score,questions_answered,questions_correct')
        .eq('session_id', sessionId)
        .eq('team_label', teamLabel)
        .single()

      if (!scoreRowC) return NextResponse.json({ error: 'Score row missing for team' }, { status: 500 })

      await supabase
        .from('quiz_session_scores')
        .update({
          total_score: Number(scoreRowC.total_score || 0) + pointsAwarded,
          questions_answered: Number(scoreRowC.questions_answered || 0) + 1,
          questions_correct: Number(scoreRowC.questions_correct || 0) + 1,
          updated_at: now,
        })
        .eq('id', scoreRowC.id)

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
        correctAnswer,
        correctAnswerOptionText,
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
      if (roundR?.round_type !== 'direct_question' && roundR?.round_type !== 'true_or_false') {
        return NextResponse.json({ error: 'Only for direct question / true or false rounds' }, { status: 400 })
      }

      if (roundR?.round_type === 'true_or_false') {
        const revealedAtTf = new Date().toISOString()
        const { data: updatedTfEvent, error: tfErr } = await supabase
          .from('quiz_question_events')
          .update({
            correct_answer_revealed_at: revealedAtTf,
            status: 'dropped',
          })
          .eq('id', questionEventId)
          .select('*')
          .single()
        if (tfErr) return NextResponse.json({ error: tfErr.message }, { status: 500 })
        return NextResponse.json({ success: true, event: updatedTfEvent })
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

    if (action === 'start_rapid_fire') {
      const roundId = body?.roundId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!roundId || !teamLabel) {
        return NextResponse.json({ error: 'roundId and teamLabel are required' }, { status: 400 })
      }
      if (!TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'teamLabel must be A/B/C/D' }, { status: 400 })
      }

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,round_type,current_question_index,rapid_fire_duration_seconds')
        .eq('id', roundId)
        .eq('session_id', sessionId)
        .single()
      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
      if (round.round_type !== 'rapid_fire') {
        return NextResponse.json({ error: 'Round is not rapid fire' }, { status: 400 })
      }

      const durationSeconds = Number(body?.durationSeconds || round.rapid_fire_duration_seconds || 45)
      const { data: question } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('round_id', roundId)
        .eq('question_order', Number(round.current_question_index || 0) + 1)
        .maybeSingle()
      if (!question) return NextResponse.json({ error: 'No more questions in this round' }, { status: 400 })

      const { data: event, error: eventErr } = await supabase
        .from('quiz_question_events')
        .insert({
          round_id: roundId,
          question_id: question.id,
          status: 'revealed',
          attempt_number: 1,
          rapid_fire_team: teamLabel,
          directed_team: teamLabel,
        })
        .select('*')
        .single()
      if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 })

      await supabase
        .from('quiz_rounds')
        .update({ current_question_index: Number(question.question_order || 0) })
        .eq('id', roundId)

      const { data: rapidFireSession, error: rfErr } = await supabase
        .from('quiz_rapid_fire_sessions')
        .insert({
          question_event_id: event.id,
          team_label: teamLabel,
          started_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .select('*')
        .single()
      if (rfErr) return NextResponse.json({ error: rfErr.message }, { status: 500 })

      void broadcastTimerStarted(sessionId, supabase, {
        questionEventId: event.id,
        durationSeconds,
        team: teamLabel,
      })

      return NextResponse.json({
        success: true,
        event,
        question,
        rapidFireSession,
        timer: { durationSeconds, team: teamLabel, questionEventId: event.id },
      })
    }

    if (action === 'rapid_fire_correct') {
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

      const teamLabel = (event.rapid_fire_team || event.directed_team) as TeamLabel
      if (!teamLabel || !TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'Rapid fire team missing on question event' }, { status: 400 })
      }

      const { data: session } = await supabase
        .from('quiz_live_sessions')
        .select('points_full, points_half')
        .eq('id', sessionId)
        .single()
      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,current_question_index')
        .eq('id', event.round_id)
        .single()
      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      const pointsAwarded = resolvePoints(1, Number(session?.points_full || 10), Number(session?.points_half || 5), 'rapid_fire')

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

      const { data: activeRapid } = await supabase
        .from('quiz_rapid_fire_sessions')
        .select('id,questions_attempted,questions_correct,score_earned')
        .eq('team_label', teamLabel)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeRapid?.id) {
        await supabase
          .from('quiz_rapid_fire_sessions')
          .update({
            questions_attempted: Number(activeRapid.questions_attempted || 0) + 1,
            questions_correct: Number(activeRapid.questions_correct || 0) + 1,
            score_earned: Number(activeRapid.score_earned || 0) + pointsAwarded,
          })
          .eq('id', activeRapid.id)
      }

      const { data: nextQuestion } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('round_id', round.id)
        .eq('question_order', Number(round.current_question_index || 0) + 1)
        .maybeSingle()

      let nextEvent: any = null
      if (nextQuestion) {
        const { data: createdNext } = await supabase
          .from('quiz_question_events')
          .insert({
            round_id: round.id,
            question_id: nextQuestion.id,
            status: 'revealed',
            attempt_number: 1,
            rapid_fire_team: teamLabel,
            directed_team: teamLabel,
          })
          .select('*')
          .single()
        nextEvent = createdNext || null
        await supabase
          .from('quiz_rounds')
          .update({ current_question_index: Number(nextQuestion.question_order || 0) })
          .eq('id', round.id)
      }

      const updatedScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({
        success: true,
        pointsAwarded,
        teamLabel,
        updatedScores,
        nextEvent,
        nextQuestion,
      })
    }

    if (action === 'rapid_fire_wrong') {
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

      const teamLabel = (event.rapid_fire_team || event.directed_team) as TeamLabel
      if (!teamLabel || !TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'Rapid fire team missing on question event' }, { status: 400 })
      }

      await supabase.from('quiz_question_events').update({ status: 'dropped' }).eq('id', questionEventId)

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,current_question_index')
        .eq('id', event.round_id)
        .single()
      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      const { data: activeRapid } = await supabase
        .from('quiz_rapid_fire_sessions')
        .select('id,questions_attempted')
        .eq('team_label', teamLabel)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeRapid?.id) {
        await supabase
          .from('quiz_rapid_fire_sessions')
          .update({
            questions_attempted: Number(activeRapid.questions_attempted || 0) + 1,
          })
          .eq('id', activeRapid.id)
      }

      const { data: nextQuestion } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('round_id', round.id)
        .eq('question_order', Number(round.current_question_index || 0) + 1)
        .maybeSingle()

      let nextEvent: any = null
      if (nextQuestion) {
        const { data: createdNext } = await supabase
          .from('quiz_question_events')
          .insert({
            round_id: round.id,
            question_id: nextQuestion.id,
            status: 'revealed',
            attempt_number: 1,
            rapid_fire_team: teamLabel,
            directed_team: teamLabel,
          })
          .select('*')
          .single()
        nextEvent = createdNext || null
        await supabase
          .from('quiz_rounds')
          .update({ current_question_index: Number(nextQuestion.question_order || 0) })
          .eq('id', round.id)
      }

      return NextResponse.json({
        success: true,
        teamLabel,
        nextEvent,
        nextQuestion,
      })
    }

    if (action === 'end_rapid_fire') {
      const roundId = body?.roundId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!roundId || !teamLabel) {
        return NextResponse.json({ error: 'roundId and teamLabel are required' }, { status: 400 })
      }
      if (!TEAM_LABELS.includes(teamLabel)) {
        return NextResponse.json({ error: 'teamLabel must be A/B/C/D' }, { status: 400 })
      }

      const { data: activeRapid } = await supabase
        .from('quiz_rapid_fire_sessions')
        .select('id')
        .eq('team_label', teamLabel)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeRapid?.id) {
        await supabase
          .from('quiz_rapid_fire_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', activeRapid.id)
      }

      const endedAt = new Date().toISOString()
      const { data: activeEvent } = await supabase
        .from('quiz_question_events')
        .select('id,status')
        .eq('round_id', roundId)
        .eq('rapid_fire_team', teamLabel)
        .in('status', ['revealed', 'options_revealed', 'buzzer_open'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let endedEvent: any = null
      if (activeEvent?.id) {
        const { data: updatedEvent } = await supabase
          .from('quiz_question_events')
          .update({
            status: 'dropped',
            correct_answer_revealed_at: endedAt,
          })
          .eq('id', activeEvent.id)
          .select('*')
          .single()
        endedEvent = updatedEvent || null
      }

      await supabase.from('quiz_rounds').update({ status: 'active' }).eq('id', roundId)
      const updatedScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({ success: true, teamLabel, updatedScores, endedEvent })
    }

    if (action === 'open_buzzer') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }
      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update({ status: 'buzzer_open', directed_team: null, buzzer_answer_deadline_at: null })
        .eq('id', questionEventId)
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
    }

    if (action === 'close_buzzer') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }
      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update({ status: 'dropped' })
        .eq('id', questionEventId)
        .select('*')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
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
      await supabase
        .from('quiz_live_sessions')
        .update({
          current_round_id: null,
          status: 'lobby',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('current_round_id', roundId)
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
        .select('id, status, current_round_id, updated_at, team_slots, is_test_session')
        .single()

      if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
      }

      const finalScoreboard = await buildFinalScoreboard(sessionId, updatedSession, supabase)

      return NextResponse.json({
        success: true,
        session: updatedSession,
        roundsCompletedCount: (updatedRounds || []).length,
        finalScoreboard,
      })
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

