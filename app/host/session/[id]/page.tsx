'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeToSession } from '@/lib/services/quizSessionService'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import { RoundNavigator } from '@/components/quiz/RoundNavigator'
import { DirectQuestionControls } from '@/components/quiz/DirectQuestionControls'
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
}

export default function HostSessionPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id

  const [state, setState] = useState<SessionState | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamLabel>('A')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    if (!sessionId) return
    const res = await fetch(`/api/quiz/session/${sessionId}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load session')
    setState(data)
  }, [sessionId])

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
        onScoresUpdated: () => void fetchState(),
        onRoundStarted: () => void fetchState(),
      })
    }
    return () => unsub()
  }, [sessionId, fetchState])

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
  const totalQuestions = Number(activeRound?.current_question_index || 0) + 1

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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
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
            disabled={busy}
          >
            End Session
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[250px_1fr_220px]">
        <ScoreSidebar teams={teamNames} scores={state.scores} />

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          {!activeRound ? (
            <div className="space-y-3">
              <p className="text-gray-700">No active round. Start one from the round navigator.</p>
              {state.rounds
                .filter((r) => r.status === 'pending')
                .slice(0, 1)
                .map((round) => (
                  <button
                    key={round.id}
                    className="rounded-lg bg-[#C0392B] px-3 py-2 text-sm font-medium text-white"
                    onClick={() => runAction('start_round', { roundId: round.id })}
                    disabled={busy}
                  >
                    Start {round.title || round.round_type}
                  </button>
                ))}
            </div>
          ) : (
            <DirectQuestionControls
              question={state.currentQuestion}
              event={state.currentQuestionEvent}
              questionNumber={Number(activeRound.current_question_index || 0)}
              totalQuestions={totalQuestions}
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onNextQuestion={() =>
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
            />
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

