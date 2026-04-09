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

export interface RoundEndedPayload {
  roundId: string
  roundType: string
  finalScores: ScoreMap
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
  onAnswerResult?: (payload: AnswerResultPayload) => void
  onScoresUpdated?: (payload: ScoresUpdatedPayload) => void
  onRoundEnded?: (payload: RoundEndedPayload) => void
  onSessionEnded?: () => void
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
        case 'answer_result':
          handlers.onAnswerResult?.(payload.payload as unknown as AnswerResultPayload)
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

