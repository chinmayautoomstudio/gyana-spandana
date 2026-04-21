import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RAPID_FIRE_SUBMIT_GRACE_MS } from '@/lib/quiz/rapidFireConstants'
import { fetchLatestRapidFireSessionForRoundTeam } from '@/lib/quiz/loadLatestRapidFireSession'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

/**
 * Fix 7 — Lean participant GET endpoint.
 *
 * Omits host-only fields that the participant page never uses:
 *   - activeRoundQuestions   (question picker)
 *   - pendingDirectAnswer    (judging panel)
 *   - pendingBuzzerAnswer    (judging panel)
 *   - completedEvents join   (needed only for activeRoundQuestions)
 *   - resolveHostOrAdmin     (always false for participants)
 *
 * Returns: session, rounds, activeRound, currentQuestionEvent,
 *          currentQuestion (correct_answer stripped unless revealed),
 *          scores, team_display_names, scoresByRoundType (live scoreboard),
 *          participantDirectAttempt, rapidFireTimer, serverTimestampMs.
 */

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
    const { data: rows } = await supabase
      .from('teams')
      .select('id, team_name')
      .in('id', ids)
      .eq('is_eliminated', false)
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
      acc[label] = name ?? 'Unassigned'
    }
    return acc
  }, {} as Record<TeamLabel, string>)
}

/** Per-team points summed by `quiz_rounds.round_type` (for live scoreboard UI). */
async function getScoresByRoundType(
  rounds: any[],
  supabase: any,
): Promise<Record<TeamLabel, Record<string, number>>> {
  const empty = TEAM_LABELS.reduce((acc, l) => {
    acc[l] = {}
    return acc
  }, {} as Record<TeamLabel, Record<string, number>>)

  if (!rounds?.length) return empty

  const roundIds = rounds.map((r: any) => String(r?.id || '')).filter((id: string) => id.length > 0)
  if (!roundIds.length) return empty

  const roundTypeById: Record<string, string> = {}
  for (const r of rounds) {
    if (r?.id) roundTypeById[String(r.id)] = String(r.round_type || '')
  }

  const { data: events } = await supabase
    .from('quiz_question_events')
    .select('round_id,answered_by_team,points_awarded')
    .in('round_id', roundIds)
    .in('status', ['answered', 'dropped'])
    .not('answered_by_team', 'is', null)

  const result: Record<TeamLabel, Record<string, number>> = TEAM_LABELS.reduce((acc, l) => {
    acc[l] = {}
    return acc
  }, {} as Record<TeamLabel, Record<string, number>>)

  for (const ev of events ?? []) {
    const label = String((ev as { answered_by_team?: string }).answered_by_team || '').toUpperCase() as TeamLabel
    if (!TEAM_LABELS.includes(label)) continue
    const rt = roundTypeById[String((ev as { round_id?: string }).round_id)] || 'unknown'
    result[label][rt] = (result[label][rt] || 0) + Number((ev as { points_awarded?: number | null }).points_awarded || 0)
  }
  return result
}

function stripCorrectAnswer(question: any | null, eventAllows: boolean) {
  if (!question) return question
  if (eventAllows) return question
  const rest = { ...question }
  delete rest.correct_answer
  return rest
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    // Batch 1: session + rounds + auth in parallel
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

    const roundId = activeRound?.id

    // Batch 2: latest event + scores + scoreboard fields in parallel
    const eventPromise = roundId
      ? supabase
          .from('quiz_question_events')
          .select('*')
          .eq('round_id', roundId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })

    const [{ data: event }, scores, team_display_names, scoresByRoundType] = await Promise.all([
      eventPromise,
      getScoreMap(sessionId, supabase),
      getTeamDisplayNames(session, supabase),
      getScoresByRoundType(rounds || [], supabase),
    ])

    const latestEvent = event || null
    const ev = latestEvent as any
    const questionId = ev?.question_id as string | undefined

    // Batch 3: current question row + participant attempt in parallel
    const currentQuestionPromise = questionId
      ? supabase.from('quiz_questions').select('*').eq('id', questionId).single()
      : Promise.resolve({ data: null })

    let myTeamLabel: TeamLabel | null = null
    if (authUser) {
      const slotsPart = (session.team_slots || {}) as Record<string, string>
      const { data: participantRow } = await supabase
        .from('participants')
        .select('team_id')
        .eq('user_id', authUser.id)
        .maybeSingle()
      myTeamLabel = TEAM_LABELS.find((l) => slotsPart[l] === participantRow?.team_id) || null
    }

    const needParticipantAttempt =
      latestEvent &&
      authUser &&
      (activeRound?.round_type === 'direct_question' ||
        activeRound?.round_type === 'buzzer' ||
        activeRound?.round_type === 'true_or_false' ||
        activeRound?.round_type === 'rapid_fire') &&
      ['revealed', 'options_revealed', 'buzzer_open', 'answered', 'dropped'].includes(
        String(ev?.status),
      )

    let participantAttemptPromise: any = Promise.resolve({ data: null })
    const myLabelForAttempt: TeamLabel | null = myTeamLabel

    if (needParticipantAttempt && authUser) {
      if (myLabelForAttempt && ev?.id) {
        participantAttemptPromise = supabase
          .from('quiz_direct_attempts')
          .select('answer_text, verdict')
          .eq('question_event_id', ev.id)
          .eq('team_label', myLabelForAttempt)
          .maybeSingle()
      }
    }

    const [{ data: questionRow }, { data: pAtt }] = await Promise.all([
      currentQuestionPromise,
      participantAttemptPromise,
    ])

    const revealCorrect = Boolean(ev?.correct_answer_revealed_at)
    // Participants never get the correct answer unless it has been revealed
    let currentQuestion = stripCorrectAnswer(questionRow || null, revealCorrect)

    const participantDirectAttempt = pAtt
      ? {
          answer_text: String(pAtt.answer_text ?? ''),
          verdict: String(pAtt.verdict ?? 'pending'),
        }
      : null

    // Rapid Fire timer (same logic as full endpoint)
    let rapidFireTimer: { startedAt: string; durationSeconds: number } | null = null
    let rapidFireTurnSummary: { correct: number; incorrect: number } | null = null
    let rapidFireSessionMeta: { started_at: string | null; duration_seconds: number | null; ended_at: string | null } | null =
      null
    if (
      activeRound?.round_type === 'rapid_fire' &&
      latestEvent &&
      ['revealed', 'options_revealed', 'buzzer_open', 'answered', 'dropped'].includes(String(ev?.status || ''))
    ) {
      const rfTeam = String((ev as any)?.rapid_fire_team || '').trim().toUpperCase()
      if (TEAM_LABELS.includes(rfTeam as TeamLabel) && roundId) {
        const rfSess = await fetchLatestRapidFireSessionForRoundTeam(supabase, String(roundId), rfTeam)
        rapidFireSessionMeta = rfSess
        if (rfSess?.started_at != null && rfSess.duration_seconds != null && rfSess.ended_at == null) {
          rapidFireTimer = {
            startedAt: String(rfSess.started_at),
            durationSeconds: Number(rfSess.duration_seconds),
          }
        }
        if (rfSess) {
          const attempted = Number(rfSess.questions_attempted || 0)
          const correct = Number(rfSess.questions_correct || 0)
          rapidFireTurnSummary = { correct, incorrect: Math.max(0, attempted - correct) }
        }
      }
    }

    if (activeRound?.round_type === 'rapid_fire' && latestEvent) {
      const rapidTeam = String((ev?.rapid_fire_team || ev?.directed_team || '')).trim().toUpperCase() as TeamLabel | ''
      const isRapidTeam = Boolean(myTeamLabel && rapidTeam && myTeamLabel === rapidTeam)
      let timerActive = true
      if (rapidFireSessionMeta?.ended_at) {
        timerActive = false
      }
      if (rapidFireTimer?.startedAt && rapidFireTimer.durationSeconds != null) {
        const startedMs = new Date(rapidFireTimer.startedAt).getTime()
        if (Number.isFinite(startedMs)) {
          timerActive =
            Date.now() < startedMs + Number(rapidFireTimer.durationSeconds) * 1000 + RAPID_FIRE_SUBMIT_GRACE_MS
        }
      }
      if (!isRapidTeam || !timerActive) {
        currentQuestion = null
      }
    }

    const rapidFireTurnComplete =
      activeRound?.round_type === 'rapid_fire' && Boolean(rapidFireSessionMeta?.ended_at)

    return NextResponse.json({
      session,
      rounds: rounds || [],
      activeRound,
      currentQuestionEvent: latestEvent,
      currentQuestion,
      scores,
      team_display_names,
      scoresByRoundType,
      participantDirectAttempt,
      rapidFireTimer,
      rapidFireTurnSummary,
      rapidFireTurnComplete,
      serverTimestampMs: Date.now(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
