'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  subscribeQuizDataRefresh,
  subscribeToSession,
  type ParticipantAnswerSubmittedPayload,
} from '@/lib/services/quizSessionService'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import { RoundNavigator } from '@/components/quiz/RoundNavigator'
import { DirectQuestionControls } from '@/components/quiz/DirectQuestionControls'
import { TrueOrFalseControls } from '@/components/quiz/TrueOrFalseControls'
import { RapidFireControls } from '@/components/quiz/RapidFireControls'
import { BuzzerControls } from '@/components/quiz/BuzzerControls'
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
    answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    answer_option_text: string | null
  } | null
  pendingBuzzerAnswer?: {
    team_label: string
    answer_text: string
    answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    answer_option_text: string | null
  } | null
}

interface FinalScoreboardRound {
  id: string
  title: string
  roundOrder: number
}

interface FinalScoreboardTeam {
  teamLabel: TeamLabel
  teamName: string
  total: number
  rounds: Record<string, number>
}

interface FinalScoreboardPayload {
  rounds: FinalScoreboardRound[]
  teams: FinalScoreboardTeam[]
}

export default function HostSessionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params?.id

  const [state, setState] = useState<SessionState | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamLabel>('A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionLanguage, setQuestionLanguage] = useState<'en' | 'odia'>('en')
  const [checkedResponseResult, setCheckedResponseResult] = useState<{
    verdict: 'correct' | 'wrong'
    correctAnswerLabel: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    correctAnswerText: string | null
  } | null>(null)
  const [buzzEvents, setBuzzEvents] = useState<
    Array<{ id: string; team_label: TeamLabel; buzz_order: number | null; buzzed_at?: string | null }>
  >([])
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const [showEndRoundConfirm, setShowEndRoundConfirm] = useState(false)
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false)
  const [finalScoreboard, setFinalScoreboard] = useState<FinalScoreboardPayload | null>(null)
  const lastQuestionEventIdRef = useRef<string | null>(null)

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
        if (
          !prev?.currentQuestionEvent ||
          (prev.activeRound?.round_type !== 'direct_question' &&
            prev.activeRound?.round_type !== 'true_or_false')
        ) {
          return prev
        }
        if (prev.currentQuestionEvent.id !== payload.questionEventId) return prev
        const raw = String(payload.answerText ?? '').trim().toUpperCase()
        if (!raw) return prev
        const optionLabel =
          raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D' ? (raw as 'A' | 'B' | 'C' | 'D') : null
        const cq = prev.currentQuestion
        const tfLabel = raw === 'TRUE' || raw === 'FALSE' ? (raw as 'TRUE' | 'FALSE') : null
        const optionText = optionLabel
          ? (String(cq?.[`option_${optionLabel.toLowerCase()}`] ?? '') || null)
          : tfLabel
            ? tfLabel
            : null
        return {
          ...prev,
          ...(prev.activeRound?.round_type === 'buzzer'
            ? {
                pendingBuzzerAnswer: {
                  team_label: payload.teamLabel,
                  answer_text: raw,
                  answer_option_label: optionLabel || tfLabel,
                  answer_option_text: optionText,
                },
              }
            : {
                pendingDirectAnswer: {
                  team_label: payload.teamLabel,
                  answer_text: raw,
                  answer_option_label: optionLabel || tfLabel,
                  answer_option_text: optionText,
                },
              }),
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
        onTimerStarted: () => void fetchState(),
        onBuzzerOpen: (payload) => {
          setBuzzEvents([])
          void fetchState()
          if (payload?.questionEventId && state?.currentQuestionEvent?.id !== payload.questionEventId) {
            setCheckedResponseResult(null)
          }
        },
        onBuzzReceived: (payload) => {
          setBuzzEvents((prev) => {
            const exists = prev.find((item) => item.team_label === payload.teamLabel)
            const next = exists
              ? prev.map((item) =>
                  item.team_label === payload.teamLabel
                    ? { ...item, buzz_order: payload.buzzOrder ?? item.buzz_order }
                    : item,
                )
              : [
                  ...prev,
                  {
                    id: `${payload.questionEventId}:${payload.teamLabel}`,
                    team_label: payload.teamLabel as TeamLabel,
                    buzz_order: payload.buzzOrder ?? null,
                    buzzed_at: new Date().toISOString(),
                  },
                ]
            return next.sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))
          })
          void fetchState()
        },
        onRapidFireTeamChange: () => void fetchState(),
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

  useEffect(() => {
    const questionEventId = state?.currentQuestionEvent?.id
    if (!sessionId || !questionEventId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`quiz-buzzes:${questionEventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_buzz_events',
          filter: `question_event_id=eq.${questionEventId}`,
        },
        (change) => {
          const row = change.new as {
            id: string
            team_label: TeamLabel
            buzz_order: number | null
            buzzed_at?: string | null
          }

          setBuzzEvents((prev) => {
            if (prev.some((item) => item.team_label === row.team_label)) return prev

            return [...prev, row].sort(
              (a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999),
            )
          })

          void fetchState()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sessionId, state?.currentQuestionEvent?.id, fetchState])

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
    const currentId = state?.currentQuestionEvent?.id ?? null
    const previousId = lastQuestionEventIdRef.current
    if (previousId && currentId && previousId !== currentId) {
      setCheckedResponseResult(null)
    }
    lastQuestionEventIdRef.current = currentId
  }, [state?.currentQuestionEvent?.id])
  useEffect(() => {
    setBuzzEvents([])
  }, [state?.currentQuestionEvent?.id])

  useEffect(() => {
    if (!state?.currentQuestionEvent?.directed_team) return
    if (state.currentQuestionEvent.status === 'revealed' || state.currentQuestionEvent.status === 'options_revealed') {
      setCheckedResponseResult(null)
    }
  }, [state?.currentQuestionEvent?.id, state?.currentQuestionEvent?.directed_team, state?.currentQuestionEvent?.status])

  const checkResponse = async () => {
    if (!state?.currentQuestionEvent) return
    const data = await runAction('check_direct_response', {
      questionEventId: state.currentQuestionEvent.id,
    })
    const rawAnswer = String(data?.correctAnswer || '').trim().toUpperCase()
    const answerLabel =
      rawAnswer === 'A' || rawAnswer === 'B' || rawAnswer === 'C' || rawAnswer === 'D'
        ? (rawAnswer as 'A' | 'B' | 'C' | 'D')
        : rawAnswer === 'TRUE' || rawAnswer === 'FALSE'
          ? (rawAnswer as 'TRUE' | 'FALSE')
        : null
    const answerText = answerLabel
      ? answerLabel === 'TRUE' || answerLabel === 'FALSE'
        ? answerLabel
        : (String(
            data?.correctAnswerOptionText || state?.currentQuestion?.[`option_${answerLabel.toLowerCase()}`] || '',
          ) || null)
      : (rawAnswer || null)
    if (data?.verdict === 'correct' || data?.verdict === 'wrong') {
      setCheckedResponseResult({
        verdict: data.verdict,
        correctAnswerLabel: answerLabel,
        correctAnswerText: answerText,
      })
    }
  }

  const getActiveBuzzTeam = (): TeamLabel | null => {
    if (!buzzEvents.length) return null
    const first = [...buzzEvents].sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))[0]
    return first?.team_label || null
  }

  if (!state) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading host panel...</div>
  }

  const handleConfirmEndRound = async () => {
    if (!activeRound) return
    setShowEndRoundConfirm(false)
    await runAction('end_round', { roundId: activeRound.id })
  }

  const handleConfirmEndSession = async () => {
    setShowEndSessionConfirm(false)
    const data = await runAction('end_session')
    if (data?.finalScoreboard) {
      setFinalScoreboard(data.finalScoreboard as FinalScoreboardPayload)
      setShowFinalScoreboard(true)
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white">
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium ${
                questionLanguage === 'en' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setQuestionLanguage('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-sm font-medium ${
                questionLanguage === 'odia' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setQuestionLanguage('odia')}
            >
              Odia
            </button>
          </div>
          <button
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
            onClick={() => setShowEndRoundConfirm(true)}
            disabled={!activeRound || busy}
          >
            End Round
          </button>
          <button
            className="rounded-lg bg-[#C0392B] px-3 py-2 text-sm font-medium text-white"
            onClick={() => setShowEndSessionConfirm(true)}
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
                  questionLanguage={questionLanguage}
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
                  onCheckAnswer={() => void checkResponse()}
                  onSkip={() =>
                    state.currentQuestionEvent &&
                    runAction('skip_question', { questionEventId: state.currentQuestionEvent.id })
                  }
                  busy={busy}
                  selectableTeams={hostSelectableTeams}
                  activeRoundQuestions={state.activeRoundQuestions ?? null}
                  teamDisplayNames={teamNames}
                  pendingDirectAnswer={state.pendingDirectAnswer ?? null}
                  checkedResponseResult={checkedResponseResult}
                  questionLanguage={questionLanguage}
                />
              ) : activeRound.round_type === 'rapid_fire' ? (
                <RapidFireControls
                  round={activeRound}
                  question={state.currentQuestion}
                  event={state.currentQuestionEvent}
                  busy={busy}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  onStartRapidFire={(teamLabel, durationSeconds) =>
                    runAction('start_rapid_fire', {
                      roundId: activeRound.id,
                      teamLabel,
                      durationSeconds,
                    })
                  }
                  onCorrect={() =>
                    state.currentQuestionEvent &&
                    runAction('rapid_fire_correct', {
                      questionEventId: state.currentQuestionEvent.id,
                    })
                  }
                  onWrong={() =>
                    state.currentQuestionEvent &&
                    runAction('rapid_fire_wrong', {
                      questionEventId: state.currentQuestionEvent.id,
                    })
                  }
                  onEndTurn={() =>
                    runAction('end_rapid_fire', {
                      roundId: activeRound.id,
                      teamLabel: (state.currentQuestionEvent?.rapid_fire_team || selectedTeam) as TeamLabel,
                    })
                  }
                  teamDisplayNames={teamNames}
                  questionLanguage={questionLanguage}
                />
              ) : activeRound.round_type === 'buzzer' ? (
                <BuzzerControls
                  question={state.currentQuestion}
                  event={state.currentQuestionEvent}
                  pendingBuzzerAnswer={state.pendingBuzzerAnswer ?? null}
                  checkedResponseResult={checkedResponseResult}
                  buzzEvents={buzzEvents}
                  busy={busy}
                  onNextQuestion={() =>
                    runAction('reveal_question', {
                      roundId: activeRound.id,
                      directedTeam: selectedTeam,
                    })
                  }
                  onOpenBuzzer={() =>
                    state.currentQuestionEvent &&
                    runAction('open_buzzer', { questionEventId: state.currentQuestionEvent.id })
                  }
                  onCheckResponse={() => void checkResponse()}
                  onMarkCorrect={() =>
                    state.currentQuestionEvent &&
                    getActiveBuzzTeam() &&
                    runAction('mark_correct', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: getActiveBuzzTeam(),
                    })
                  }
                  onMarkWrong={async () => {
                    const activeTeam = getActiveBuzzTeam()
                    if (!state.currentQuestionEvent || !activeTeam) return
                    setBuzzEvents((prev) => prev.filter((item) => item.team_label !== activeTeam))
                    await runAction('mark_wrong_pass', {
                      questionEventId: state.currentQuestionEvent.id,
                      teamLabel: activeTeam,
                    })
                    await fetchState()
                  }}
                  onSkip={() =>
                    state.currentQuestionEvent &&
                    runAction('close_buzzer', { questionEventId: state.currentQuestionEvent.id })
                  }
                  questionLanguage={questionLanguage}
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

      {showEndRoundConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">End this round?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will close the active round and return the session to lobby state.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowEndRoundConfirm(false)}
              >
                Continue round
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-medium text-white hover:bg-[#A93226]"
                onClick={handleConfirmEndRound}
                disabled={busy}
              >
                End round
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEndSessionConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">End this session?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This action completes the quiz session. A final scoreboard will be shown after confirmation.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowEndSessionConfirm(false)}
              >
                Continue session
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-medium text-white hover:bg-[#A93226]"
                onClick={handleConfirmEndSession}
                disabled={busy}
              >
                End session
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFinalScoreboard && finalScoreboard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-6xl rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">Final Scoreboard</h2>
            <p className="mt-1 text-sm text-gray-600">Session complete. Final scores by round are shown below.</p>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Team</th>
                    {finalScoreboard.rounds.map((round) => (
                      <th key={round.id} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                        {round.title}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {finalScoreboard.teams.map((team) => (
                    <tr key={team.teamLabel} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.teamName}</td>
                      {finalScoreboard.rounds.map((round) => (
                        <td key={`${team.teamLabel}-${round.id}`} className="px-4 py-3 text-sm text-gray-700">
                          {team.rounds[round.id] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm font-semibold text-[#C0392B]">{team.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-medium text-white hover:bg-[#A93226]"
                onClick={() => router.push('/host')}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

