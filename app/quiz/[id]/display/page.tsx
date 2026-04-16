'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { subscribeQuizDataRefresh, subscribeToSession } from '@/lib/services/quizSessionService'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
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

export default function DisplayBoardPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id

  const [state, setState] = useState<SessionState | null>(null)
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
        onRoundStarted: () => void fetchState(),
        onQuestionRevealed: () => void fetchState(),
        onOptionsRevealed: () => void fetchState(),
        onAnswerResult: () => void fetchState(),
        onScoresUpdated: () => void fetchState(),
        onRoundEnded: () => void fetchState(),
      })
    }
    return () => unsub()
  }, [sessionId, fetchState])

  const roundIdsKey = (state?.rounds ?? []).map((r: { id: string }) => r.id).sort().join(',')

  useEffect(() => {
    if (!sessionId || !roundIdsKey) return
    const roundIds = roundIdsKey.split(',').filter(Boolean)
    return subscribeQuizDataRefresh(sessionId, roundIds, () => void fetchState())
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

  if (error) {
    return <div className="p-6 text-red-300">{error}</div>
  }

  if (!state) {
    return <div className="p-6 text-gray-200">Loading display board...</div>
  }

  const isDirectRound = state.activeRound?.round_type === 'direct_question'
  const isTrueFalseRound = state.activeRound?.round_type === 'true_or_false'
  const revealCorrect = Boolean(state.currentQuestionEvent?.correct_answer_revealed_at)
  const showOptions = isTrueFalseRound && state.currentQuestionEvent?.status === 'options_revealed'
  const directedTeam = state.currentQuestionEvent?.directed_team as TeamLabel | undefined

  const phaseText = (() => {
    if (!state.activeRound) return 'Waiting for round'
    if (!state.currentQuestionEvent) return 'Waiting for question'
    if (isDirectRound) {
      if (revealCorrect) return 'Direct question answer revealed'
      if (state.currentQuestionEvent.status === 'revealed') {
        return directedTeam ? `Direct question — Team ${directedTeam} answering` : 'Direct question in progress'
      }
      return 'Direct question complete'
    }
    if (isTrueFalseRound) {
      if (state.currentQuestionEvent.status === 'options_revealed') {
        return directedTeam ? `True/False — Team ${directedTeam} answering` : 'True/False options open'
      }
      if (state.currentQuestionEvent.status === 'revealed') return 'True/False question revealed'
      return 'True/False question complete'
    }
    return 'Round in progress'
  })()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
      {state.session.is_test_session ? (
        <div className="mb-4 rounded-lg border border-amber-500/60 bg-amber-950/40 px-4 py-2 text-center text-sm font-medium text-amber-200">
          TEST SESSION — rehearsal display
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl lg:text-3xl font-bold">GYANA SPARDHA</h1>
        <div className="text-right">
          <p className="text-sm lg:text-base text-gray-200">
            {state.activeRound ? state.activeRound.title || state.activeRound.round_type : 'Waiting for round'}
          </p>
          <p className="text-xs lg:text-sm text-gray-300">{phaseText}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl bg-white/10 p-3">
          <ScoreSidebar teams={teamNames} scores={state.scores} />
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <QuestionDisplay
            question={state.currentQuestion}
            showOptions={showOptions}
            readOnly
            revealCorrectAnswer={revealCorrect}
          />
        </div>
      </div>
    </div>
  )
}

