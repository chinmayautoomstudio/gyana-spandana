'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  subscribeQuizDataRefresh,
  subscribeToSession,
  type ParticipantAnswerSubmittedPayload,
} from '@/lib/services/quizSessionService'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import { RoundNavigator } from '@/components/quiz/RoundNavigator'
import { DirectQuestionControls } from '@/components/quiz/DirectQuestionControls'
import { TrueOrFalseControls } from '@/components/quiz/TrueOrFalseControls'
import { getOccupiedLabels } from '@/lib/quiz/teamSlots'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface SessionState {
  session: any
  rounds: any[]
  activeRound: any | null
  currentQuestionEvent: any | null
  currentQuestion: any | null
  scores: Record<TeamLabel, number>
  team_display_names?: Record<TeamLabel, string>
  activeRoundQuestions?: Array<{
    id: string
    question_order: number
    question_type: string | null
    preview: string
  }> | null
  pendingDirectAnswer?: {
    team_label: string
    answer_text: string
    answer_option_label: 'A' | 'B' | 'C' | 'D' | null
    answer_option_text: string | null
  } | null
}

export default function HostSessionPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id

  const [state, setState] = useState<SessionState | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamLabel>('A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkedResponseResult, setCheckedResponseResult] = useState<{
    verdict: 'correct' | 'wrong'
    correctAnswerLabel: 'A' | 'B' | 'C' | 'D' | null
    correctAnswerText: string | null
  } | null>(null)

  const fetchState = useCallback(async () => {
    if (!sessionId) return
    const res = await fetch(`/api/quiz/session/${sessionId}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load session')
    setState(data)
  }, [sessionId])

  const applyParticipantAnswerOptimistic = useCallback(
    (payload: ParticipantAnswerSubmittedPayload) => {
      setState((prev) => {
        if (!prev?.currentQuestionEvent || prev.activeRound?.round_type !== 'direct_question') {
          return prev
        }
        if (prev.currentQuestionEvent.id !== payload.questionEventId) return prev
        const raw = String(payload.answerText ?? '').trim().toUpperCase()
        if (!raw) return prev
        const optionLabel =
          raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D' ? (raw as 'A' | 'B' | 'C' | 'D') : null
        const cq = prev.currentQuestion
        const optionText = optionLabel
          ? (String(cq?.[`option_${optionLabel.toLowerCase()}`] ?? '') || null)
          : null
        return {
          ...prev,
          pendingDirectAnswer: {
            team_label: payload.teamLabel,
            answer_text: raw,
            answer_option_label: optionLabel,
            answer_option_text: optionText,
          },
        }
      })
      void fetchState()
    },
    [fetchState],
  )

  useEffect(() => {
    let unsub = () => {}
    void (async () => {
      try {
        await fetchState()
      } catch (e: any) {
        setError(e.message)
      }
    })()
    if (sessionId) {
      unsub = subscribeToSession(sessionId, {
        onQuestionRevealed: () => void fetchState(),
        onOptionsRevealed: () => void fetchState(),
        onAnswerResult: () => void fetchState(),
        onParticipantAnswerSubmitted: applyParticipantAnswerOptimistic,
        onDirectVerdictApplied: () => void fetchState(),
        onScoresUpdated: () => void fetchState(),
        onRoundStarted: () => void fetchState(),
      })
    }
    return () => unsub()
  }, [sessionId, fetchState, applyParticipantAnswerOptimistic])

  const roundIdsKey = (state?.rounds ?? []).map((r: { id: string }) => r.id).sort().join(',')

  useEffect(() => {
    if (!sessionId || !roundIdsKey) return
    const roundIds = roundIdsKey.split(',').filter(Boolean)
    const unsub = subscribeQuizDataRefresh(sessionId, roundIds, () => void fetchState())
    return unsub
  }, [sessionId, roundIdsKey, fetchState])

  const teamNames = useMemo(() => {
    if (state?.team_display_names) return state.team_display_names
    const slots = state?.session?.team_slots || {}
    return {
      A: `Team ${slots.A ? slots.A.slice(0, 8) : 'A'}`,
      B: `Team ${slots.B ? slots.B.slice(0, 8) : 'B'}`,
      C: `Team ${slots.C ? slots.C.slice(0, 8) : 'C'}`,
      D: `Team ${slots.D ? slots.D.slice(0, 8) : 'D'}`,
    } as Record<TeamLabel, string>
  }, [state?.team_display_names, state?.session?.team_slots])

  const hostSelectableTeams = useMemo((): TeamLabel[] | undefined => {
    if (!state?.session?.is_test_session) return undefined
    const occ = getOccupiedLabels((state.session.team_slots || {}) as Record<string, string>)
    return occ.length > 0 ? occ : undefined
  }, [state?.session?.is_test_session, state?.session?.team_slots])

  useEffect(() => {
    if (!state?.session?.is_test_session) return
    const occ = getOccupiedLabels((state.session.team_slots || {}) as Record<string, string>)
    if (occ.length === 0) return
    setSelectedTeam((prev) => (occ.includes(prev) ? prev : occ[0]))
  }, [state?.session?.id, state?.session?.is_test_session, state?.session?.team_slots])

  const activeRound = state?.activeRound
  const isSessionCompleted = state?.session?.status === 'completed'
  const roundQuestionCount = state?.activeRoundQuestions?.length ?? 0
  const totalQuestions = Math.max(roundQuestionCount, 1)
  const questionNumber =
    state?.currentQuestion?.question_order ?? Number(activeRound?.current_question_index || 0)

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Failed to ${action}`)
      await fetchState()
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setCheckedResponseResult(null)
  }, [state?.currentQuestionEvent?.id])

  useEffect(() => {
    setCheckedResponseResult(null)
  }, [state?.currentQuestionEvent?.directed_team])

  const checkResponse = async () => {
    if (!state?.currentQuestionEvent) return
    const data = await runAction('check_direct_response', {
      questionEventId: state.currentQuestionEvent.id,
    })
    const rawAnswer = String(data?.correctAnswer || '').trim().toUpperCase()
    const answerLabel =
      rawAnswer === 'A' || rawAnswer === 'B' || rawAnswer === 'C' || rawAnswer === 'D'
        ? (rawAnswer as 'A' | 'B' | 'C' | 'D')
        : null
    const answerText = answerLabel
      ? (String(data?.correctAnswerOptionText || state?.currentQuestion?.[`option_${answerLabel.toLowerCase()}`] || '') || null)
      : (rawAnswer || null)
    if (data?.verdict === 'correct' || data?.verdict === 'wrong') {
      setCheckedResponseResult({
        verdict: data.verdict,
        correctAnswerLabel: answerLabel,
        correctAnswerText: answerText,
      })
    }
  }

  if (!state) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading host panel...</div>
  }

  return (
    <div className="space-y-4">
      {state.session.is_test_session ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Test session</span>
          <span className="text-amber-900"> — Rehearsal only. Flow matches a live quiz; you can use fewer than four teams.</span>
        </div>
      ) : null}
      {isSessionCompleted ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <span className="font-semibold">Session completed</span>
          <span className="text-emerald-900"> — This session is closed. Question flow controls are disabled.</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{state.session.title}</h1>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium"
            onClick={() => activeRound && runAction('end_round', { roundId: activeRound.id })}
            disabled={!activeRound || busy}
          >
            End Round
          </button>
          <button
            className="rounded-lg bg-[#C0392B] px-3 py-2 text-sm font-medium text-white"
            onClick={() => runAction('end_session')}
            disabled={busy || isSessionCompleted}
          >
            {isSessionCompleted ? 'Session Completed' : 'End Session'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[250px_1fr_220px]">
        <ScoreSidebar teams={teamNames} scores={state.scores} />

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          {isSessionCompleted ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Session is completed. Start/reveal/judgement actions are disabled.
            </div>
          ) : !activeRound ? (
            <div className="space-y-3">
              <p className="text-gray-700">No active round. Start one from the round navigator.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {state.rounds
                  .filter((r) => r.status === 'pending')
                  .map((round) => (
                    <button
                      key={round.id}
                      type="button"
                      className="rounded-lg bg-[#C0392B] px-3 py-2 text-sm font-medium text-white"
                      onClick={() => runAction('start_round', { roundId: round.id })}
                      disabled={busy}
                    >
                      Start {round.title || round.round_type}
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <>
              {activeRound.round_type === 'direct_question' ? (
                <DirectQuestionControls
                  question={state.currentQuestion}
                  event={state.currentQuestionEvent}
                  questionNumber={Number(questionNumber)}
                  totalQuestions={totalQuestions}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  onNextQuestion={(questionId) =>
                    runAction('reveal_question', {
                      roundId: activeRound.id,
                      directedTeam: selectedTeam,
                      ...(questionId ? { questionId } : {}),
                    })
                  }
                  onNextSequential={() =>
                    runAction('reveal_question', {
                      roundId: activeRound.id,
                      directedTeam: selectedTeam,
                    })
                  }
                  onRevealOptions={() =>
                    state.currentQuestionEvent &&
                    runAction('reveal_options', {
                      questionEventId: state.currentQuestionEvent.id,
                      directedTeam: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onMarkCorrect={() =>
                    state.currentQuestionEvent &&
                    runAction('mark_correct', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onMarkWrongPass={() =>
                    state.currentQuestionEvent &&
                    runAction('mark_wrong_pass', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onSkip={() =>
                    state.currentQuestionEvent &&
                    runAction('skip_question', { questionEventId: state.currentQuestionEvent.id })
                  }
                  onJudgeCorrect={() =>
                    state.currentQuestionEvent &&
                    runAction('judge_direct_answer', {
                      questionEventId: state.currentQuestionEvent.id,
                      verdict: 'correct',
                    })
                  }
                  onJudgeWrong={() =>
                    state.currentQuestionEvent &&
                    runAction('judge_direct_answer', {
                      questionEventId: state.currentQuestionEvent.id,
                      verdict: 'wrong',
                    })
                  }
                  onCheckResponse={checkResponse}
                  onPassDirect={() =>
                    state.currentQuestionEvent &&
                    runAction('pass_direct_question', { questionEventId: state.currentQuestionEvent.id })
                  }
                  onRevealCorrectAnswer={() =>
                    state.currentQuestionEvent &&
                    runAction('reveal_correct_answer', { questionEventId: state.currentQuestionEvent.id })
                  }
                  busy={busy}
                  selectableTeams={hostSelectableTeams}
                  roundType={activeRound?.round_type}
                  activeRoundQuestions={state.activeRoundQuestions ?? null}
                  teamDisplayNames={teamNames}
                  pendingDirectAnswer={state.pendingDirectAnswer ?? null}
                  checkedResponseResult={checkedResponseResult}
                />
              ) : activeRound.round_type === 'true_or_false' ? (
                <TrueOrFalseControls
                  question={state.currentQuestion}
                  event={state.currentQuestionEvent}
                  questionNumber={Number(questionNumber)}
                  totalQuestions={totalQuestions}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  onNextQuestion={(questionId) =>
                    runAction('reveal_question', {
                      roundId: activeRound.id,
                      directedTeam: selectedTeam,
                      ...(questionId ? { questionId } : {}),
                    })
                  }
                  onNextSequential={() =>
                    runAction('reveal_question', {
                      roundId: activeRound.id,
                      directedTeam: selectedTeam,
                    })
                  }
                  onRevealOptions={() =>
                    state.currentQuestionEvent &&
                    runAction('reveal_options', {
                      questionEventId: state.currentQuestionEvent.id,
                      directedTeam: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onMarkCorrect={() =>
                    state.currentQuestionEvent &&
                    runAction('mark_correct', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onMarkWrongPass={() =>
                    state.currentQuestionEvent &&
                    runAction('mark_wrong_pass', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: state.currentQuestionEvent.directed_team || selectedTeam,
                    })
                  }
                  onSkip={() =>
                    state.currentQuestionEvent &&
                    runAction('skip_question', { questionEventId: state.currentQuestionEvent.id })
                  }
                  busy={busy}
                  selectableTeams={hostSelectableTeams}
                  activeRoundQuestions={state.activeRoundQuestions ?? null}
                  teamDisplayNames={teamNames}
                />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  Host controls for this round type are not enabled in this scoped implementation.
                </div>
              )}
            </>
          )}
        </div>

        <RoundNavigator
          rounds={state.rounds || []}
          activeRoundId={activeRound?.id}
          onSelectRound={(roundId) => runAction('start_round', { roundId })}
        />
      </div>
    </div>
  )
}

