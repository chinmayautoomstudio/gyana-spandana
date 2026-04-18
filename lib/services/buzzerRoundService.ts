import { buzzerWrongPenaltyPoints } from '@/lib/services/scoringService'
import { getOccupiedLabels, nextOccupiedLabel } from '@/lib/quiz/teamSlots'
import type { TeamLabel } from '@/lib/utils/teamColors'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const

function nextTeamInOrder(current: TeamLabel): TeamLabel {
  const idx = TEAM_LABELS.indexOf(current)
  return TEAM_LABELS[(idx + 1) % TEAM_LABELS.length]
}

export type BuzzerWrongApplyResult =
  | { ok: true; penalty: number; updatedEvent: Record<string, unknown> }
  | { ok: false; error: string; status: number }

/**
 * Ends a buzzer question after wrong answer, host wrong, or timeout: penalty score, dropped event, no pass to next buzzer.
 */
export async function applyBuzzerWrongOutcome(
  supabase: any,
  params: {
    sessionId: string
    questionEventId: string
    teamLabel: TeamLabel
    attemptNumber: number
    insertPassLog: boolean
    afterTimeout: boolean
  },
): Promise<BuzzerWrongApplyResult> {
  const { sessionId, questionEventId, teamLabel, attemptNumber, insertPassLog, afterTimeout } = params
  const now = new Date().toISOString()

  const { data: sessionRow, error: sessionErr } = await supabase
    .from('quiz_live_sessions')
    .select('points_full, is_test_session, team_slots')
    .eq('id', sessionId)
    .single()
  if (sessionErr || !sessionRow) {
    return { ok: false, error: sessionErr?.message || 'Session not found', status: 500 }
  }

  const penalty = buzzerWrongPenaltyPoints(Number(sessionRow.points_full || 10))

  if (insertPassLog) {
    const { error: passErr } = await supabase.from('quiz_pass_log').insert({
      question_event_id: questionEventId,
      team_label: teamLabel,
      attempt_number: attemptNumber,
      passed_or_wrong: true,
    })
    if (passErr) return { ok: false, error: passErr.message, status: 500 }
  }

  const { data: pendingAtt } = await supabase
    .from('quiz_direct_attempts')
    .select('id, verdict')
    .eq('question_event_id', questionEventId)
    .eq('team_label', teamLabel)
    .maybeSingle()

  if (pendingAtt?.id && pendingAtt.verdict === 'pending') {
    const { error: upAttErr } = await supabase
      .from('quiz_direct_attempts')
      .update({ verdict: 'wrong', updated_at: now })
      .eq('id', pendingAtt.id)
    if (upAttErr) return { ok: false, error: upAttErr.message, status: 500 }
  } else if (!pendingAtt) {
    const { error: insAttErr } = await supabase.from('quiz_direct_attempts').insert({
      session_id: sessionId,
      question_event_id: questionEventId,
      team_label: teamLabel,
      answer_text: '',
      verdict: 'wrong',
      updated_at: now,
    })
    if (insAttErr) return { ok: false, error: insAttErr.message, status: 500 }
  }

  const { data: scoreRow, error: scoreSelErr } = await supabase
    .from('quiz_session_scores')
    .select('id,total_score,questions_answered')
    .eq('session_id', sessionId)
    .eq('team_label', teamLabel)
    .single()
  if (scoreSelErr || !scoreRow) {
    return { ok: false, error: scoreSelErr?.message || 'Score row missing for team', status: 500 }
  }

  const { error: scoreUpErr } = await supabase
    .from('quiz_session_scores')
    .update({
      total_score: Number(scoreRow.total_score || 0) + penalty,
      questions_answered: Number(scoreRow.questions_answered || 0) + 1,
      updated_at: now,
    })
    .eq('id', scoreRow.id)
  if (scoreUpErr) return { ok: false, error: scoreUpErr.message, status: 500 }

  const { data: updatedEvent, error: evErr } = await supabase
    .from('quiz_question_events')
    .update({
      status: 'dropped',
      answered_by_team: teamLabel,
      points_awarded: penalty,
      buzzer_answer_deadline_at: null,
    })
    .eq('id', questionEventId)
    .select('*')
    .single()
  if (evErr || !updatedEvent) {
    return { ok: false, error: evErr?.message || 'Failed to update question event', status: 500 }
  }

  if (afterTimeout) {
    const occupied = getOccupiedLabels((sessionRow.team_slots || {}) as Record<string, string>)
    const useTestRotation = Boolean(sessionRow.is_test_session) && occupied.length > 0
    const nextDirected = useTestRotation
      ? nextOccupiedLabel(teamLabel, occupied)
      : nextTeamInOrder(teamLabel)
    const { error: nextErr } = await supabase
      .from('quiz_live_sessions')
      .update({ buzzer_next_directed_team: nextDirected, updated_at: now })
      .eq('id', sessionId)
    if (nextErr) return { ok: false, error: nextErr.message, status: 500 }
  }

  return { ok: true, penalty, updatedEvent }
}
