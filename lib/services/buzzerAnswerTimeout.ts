import { applyBuzzerWrongOutcome } from '@/lib/services/buzzerRoundService'
import type { TeamLabel } from '@/lib/utils/teamColors'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const

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

async function getScoreMap(sessionId: string, supabase: any): Promise<Record<TeamLabel, number>> {
  const { data: scores } = await supabase
    .from('quiz_session_scores')
    .select('team_label,total_score')
    .eq('session_id', sessionId)

  return TEAM_LABELS.reduce(
    (acc, label) => {
      acc[label] = scores?.find((s: any) => s.team_label === label)?.total_score || 0
      return acc
    },
    {} as Record<TeamLabel, number>,
  )
}

export type BuzzerAnswerTimeoutRunResult =
  | {
      ok: true
      applied: true
      penalty: number
      teamLabel: TeamLabel
      event: Record<string, unknown>
      updatedScores: Record<TeamLabel, number>
    }
  | { ok: false; status: number; error: string }

/**
 * Host or participant: after buzzer answer deadline, apply wrong + penalty + next buzzer hint.
 * Caller must enforce auth (host PATCH or participant on active team).
 */
export async function runBuzzerAnswerTimeout(
  supabase: any,
  sessionId: string,
  questionEventId: string,
): Promise<BuzzerAnswerTimeoutRunResult> {
  const { data: evTimeout } = await supabase
    .from('quiz_question_events')
    .select('*')
    .eq('id', questionEventId)
    .single()
  if (!evTimeout) {
    return { ok: false, status: 404, error: 'Question event not found' }
  }
  if (evTimeout.status !== 'buzzer_open') {
    return { ok: false, status: 400, error: 'Buzzer is not open for this question' }
  }
  if (!evTimeout.buzzer_answer_deadline_at) {
    return { ok: false, status: 400, error: 'No answer deadline is set for this question' }
  }
  const deadlineMs = new Date(String(evTimeout.buzzer_answer_deadline_at)).getTime()
  if (!Number.isFinite(deadlineMs) || Date.now() < deadlineMs) {
    return { ok: false, status: 400, error: 'Answer period has not expired yet' }
  }

  const { data: roundT } = await supabase
    .from('quiz_rounds')
    .select('round_type')
    .eq('id', evTimeout.round_id)
    .single()
  if (roundT?.round_type !== 'buzzer') {
    return { ok: false, status: 400, error: 'Only for buzzer rounds' }
  }

  const [{ data: buzzRowsT, error: buzzErrT }, { data: passRowsT, error: passErrT }] = await Promise.all([
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
  if (buzzErrT) return { ok: false, status: 500, error: buzzErrT.message }
  if (passErrT) return { ok: false, status: 500, error: passErrT.message }

  const excludedT = new Set((passRowsT || []).map((row: any) => String(row.team_label)))
  const activeBuzzT = (buzzRowsT || []).find((row: any) => !excludedT.has(String(row.team_label)))
  const activeTeamT = activeBuzzT?.team_label as TeamLabel | undefined
  if (!activeTeamT || !(TEAM_LABELS as readonly string[]).includes(activeTeamT)) {
    return { ok: false, status: 400, error: 'No active team is available to time out' }
  }

  const appliedT = await applyBuzzerWrongOutcome(supabase, {
    sessionId,
    questionEventId,
    teamLabel: activeTeamT,
    attemptNumber: Number(evTimeout.attempt_number || 1),
    insertPassLog: false,
    afterTimeout: true,
  })
  if (!appliedT.ok) {
    return { ok: false, status: appliedT.status, error: appliedT.error }
  }
  await broadcastDirectVerdictApplied(sessionId, supabase, {
    questionEventId,
    teamLabel: activeTeamT,
    verdict: 'wrong',
  })
  const updatedScoresT = await getScoreMap(sessionId, supabase)
  return {
    ok: true,
    applied: true,
    penalty: appliedT.penalty,
    teamLabel: activeTeamT,
    event: appliedT.updatedEvent as Record<string, unknown>,
    updatedScores: updatedScoresT,
  }
}
