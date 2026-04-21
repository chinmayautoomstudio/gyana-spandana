import { createClient } from '@/lib/supabase/client'

const CHANNEL_PREFIX = 'quiz:session:'

export type QuizEventType =
  | 'round_started'
  | 'question_revealed'
  | 'options_revealed'
  | 'media_revealed'
  | 'timer_started'
  | 'timer_update'
  | 'buzzer_open'
  | 'buzz_received'
  | 'answer_result'
  | 'scores_updated'
  | 'question_skipped'
  | 'round_ended'
  | 'session_ended'
  | 'rapid_fire_team_change'
  | 'participant_answer_submitted'
  | 'direct_verdict_applied'

export interface QuizEvent {
  type: QuizEventType
  payload: Record<string, unknown>
  timestamp: string
}

export interface RoundStartedPayload {
  roundId: string
  roundType: string
  roundTitle: string
  roundOrder: number
}

export interface QuestionRevealedPayload {
  questionEventId: string
  questionText: string
  questionType: string
  directedTeam?: string
  attemptNumber: number
  questionNumber: number
  totalQuestions: number
}

export interface OptionsRevealedPayload {
  questionEventId: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  directedTeam?: string
}

export interface TimerStartedPayload {
  questionEventId: string
  durationSeconds: number
  team?: string
}

export interface BuzzerOpenPayload {
  questionEventId: string
}

export interface BuzzReceivedPayload {
  questionEventId: string
  teamLabel: string
  buzzOrder: number
}

export interface AnswerResultPayload {
  questionEventId: string
  correct: boolean
  teamLabel: string
  pointsAwarded: number
  correctAnswer: string
  updatedScores: ScoreMap
}

export interface ScoresUpdatedPayload {
  scores: ScoreMap
}

export interface ParticipantAnswerSubmittedPayload {
  questionEventId: string
  teamLabel: string
  /** Present when emitted from the answer API; omit for legacy broadcasts. */
  answerText?: string
  /** Present for auto-graded rounds like Rapid Fire. */
  verdict?: 'pending' | 'correct' | 'wrong'
  submittedAt: string
  /** Rapid Fire: next question event after auto-advance (`correct_answer` omitted on `nextQuestion`). */
  nextEvent?: Record<string, unknown> | null
  nextQuestion?: Record<string, unknown> | null
  turnSummary?: { correct: number; incorrect: number }
  rapidFireCompleted?: boolean
}

/** Emitted after host judges a direct question; no correct answer in payload. */
export interface DirectVerdictAppliedPayload {
  questionEventId: string
  teamLabel: string
  verdict: 'correct' | 'wrong'
  appliedAt: string
}

export interface RoundEndedPayload {
  roundId: string
  roundType: string
  finalScores: ScoreMap
}

export interface RapidFireTeamChangePayload {
  team?: string
  durationSeconds?: number
}

export type ScoreMap = {
  A: number
  B: number
  C: number
  D: number
}

export interface QuizEventHandlers {
  onRoundStarted?: (payload: RoundStartedPayload) => void
  onQuestionRevealed?: (payload: QuestionRevealedPayload) => void
  onOptionsRevealed?: (payload: OptionsRevealedPayload) => void
  onTimerStarted?: (payload: TimerStartedPayload) => void
  onBuzzerOpen?: (payload: BuzzerOpenPayload) => void
  onBuzzReceived?: (payload: BuzzReceivedPayload) => void
  onAnswerResult?: (payload: AnswerResultPayload) => void
  onParticipantAnswerSubmitted?: (payload: ParticipantAnswerSubmittedPayload) => void
  onDirectVerdictApplied?: (payload: DirectVerdictAppliedPayload) => void
  onScoresUpdated?: (payload: ScoresUpdatedPayload) => void
  onRoundEnded?: (payload: RoundEndedPayload) => void
  onSessionEnded?: () => void
  onRapidFireTeamChange?: (payload: RapidFireTeamChangePayload) => void
}

const channels: Map<string, ReturnType<ReturnType<typeof createClient>['channel']>> = new Map()

export function subscribeToSession(sessionId: string, handlers: QuizEventHandlers): () => void {
  const supabase = createClient()
  const channelName = `${CHANNEL_PREFIX}${sessionId}`

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'quiz_event' }, ({ payload }: { payload: QuizEvent }) => {
      switch (payload.type) {
        case 'round_started':
          handlers.onRoundStarted?.(payload.payload as unknown as RoundStartedPayload)
          break
        case 'question_revealed':
          handlers.onQuestionRevealed?.(payload.payload as unknown as QuestionRevealedPayload)
          break
        case 'options_revealed':
          handlers.onOptionsRevealed?.(payload.payload as unknown as OptionsRevealedPayload)
          break
        case 'timer_started':
          handlers.onTimerStarted?.(payload.payload as unknown as TimerStartedPayload)
          break
        case 'buzzer_open':
          handlers.onBuzzerOpen?.(payload.payload as unknown as BuzzerOpenPayload)
          break
        case 'buzz_received':
          handlers.onBuzzReceived?.(payload.payload as unknown as BuzzReceivedPayload)
          break
        case 'answer_result':
          handlers.onAnswerResult?.(payload.payload as unknown as AnswerResultPayload)
          break
        case 'participant_answer_submitted':
          handlers.onParticipantAnswerSubmitted?.(
            payload.payload as unknown as ParticipantAnswerSubmittedPayload,
          )
          break
        case 'direct_verdict_applied':
          handlers.onDirectVerdictApplied?.(
            payload.payload as unknown as DirectVerdictAppliedPayload,
          )
          break
        case 'scores_updated':
          handlers.onScoresUpdated?.(payload.payload as unknown as ScoresUpdatedPayload)
          break
        case 'round_ended':
          handlers.onRoundEnded?.(payload.payload as unknown as RoundEndedPayload)
          break
        case 'session_ended':
          handlers.onSessionEnded?.()
          break
        case 'rapid_fire_team_change':
          handlers.onRapidFireTeamChange?.(payload.payload as unknown as RapidFireTeamChangePayload)
          break
        default:
          break
      }
    })
    .subscribe()

  channels.set(sessionId, channel)

  return () => {
    supabase.removeChannel(channel)
    channels.delete(sessionId)
  }
}

/**
 * Refetch-friendly realtime: postgres changes on question events and direct attempts.
 * Use alongside broadcast `subscribeToSession` so UIs update when DB rows change without a broadcast.
 */
export function subscribeQuizDataRefresh(
  sessionId: string,
  roundIds: string[],
  onRefresh: () => void,
): () => void {
  const supabase = createClient()
  const channelName = `quiz-pg-refresh:${sessionId}`
  const channel = supabase.channel(channelName)

  const PG_REFRESH_DEBOUNCE_MS = 400
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  const debouncedRefresh = () => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      onRefresh()
    }, PG_REFRESH_DEBOUNCE_MS)
  }

  if (roundIds.length > 0) {
    const filter = `round_id=in.(${roundIds.join(',')})`
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quiz_question_events', filter },
      () => debouncedRefresh(),
    )
  }

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'quiz_direct_attempts',
      filter: `session_id=eq.${sessionId}`,
    },
    () => debouncedRefresh(),
  )

  channel.subscribe()

  return () => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    supabase.removeChannel(channel)
  }
}

export async function broadcastEvent(
  sessionId: string,
  type: QuizEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient()
  const channelName = `${CHANNEL_PREFIX}${sessionId}`
  const channel = channels.get(sessionId) || supabase.channel(channelName)

  await channel.send({
    type: 'broadcast',
    event: 'quiz_event',
    payload: {
      type,
      payload,
      timestamp: new Date().toISOString(),
    } as QuizEvent,
  })
}

