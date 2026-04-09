'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { subscribeToSession } from '@/lib/services/quizSessionService'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface SessionState {
  session: any
  rounds: any[]
  activeRound: any | null
  currentQuestionEvent: any | null
  currentQuestion: any | null
  scores: Record<TeamLabel, number>
}

export default function ParticipantPlayPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myTeamLabel, setMyTeamLabel] = useState<TeamLabel | null>(null)

  const fetchState = useCallback(async () => {
    if (!sessionId) return
    const res = await fetch(`/api/quiz/session/${sessionId}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load session')
    setState(data)
    return data as SessionState
  }, [sessionId])

  useEffect(() => {
    let unsub = () => {}
    void (async () => {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Please login to play')

        const loadedState = await fetchState()
        const { data: participant } = await supabase
          .from('participants')
          .select('team_id')
          .eq('user_id', user.id)
          .single()

        const slots = (loadedState?.session?.team_slots || {}) as Record<string, string>
        const match = (['A', 'B', 'C', 'D'] as TeamLabel[]).find((label) => slots[label] === participant?.team_id) || null
        setMyTeamLabel(match)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
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
        onSessionEnded: () => void fetchState(),
      })
    }

    return () => unsub()
  }, [sessionId, supabase, fetchState])

  const teamNames = useMemo(() => {
    const slots = state?.session?.team_slots || {}
    return {
      A: `Team ${slots.A ? slots.A.slice(0, 8) : 'A'}`,
      B: `Team ${slots.B ? slots.B.slice(0, 8) : 'B'}`,
      C: `Team ${slots.C ? slots.C.slice(0, 8) : 'C'}`,
      D: `Team ${slots.D ? slots.D.slice(0, 8) : 'D'}`,
    } as Record<TeamLabel, string>
  }, [state?.session?.team_slots])

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading session...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
  }

  if (!state) return null

  const directedTeam = (state.currentQuestionEvent?.directed_team || null) as TeamLabel | null
  const isMyTurn = directedTeam && myTeamLabel && directedTeam === myTeamLabel
  const showOptions = state.currentQuestionEvent?.status === 'options_revealed'

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <ScoreSidebar teams={teamNames} scores={state.scores} />
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Session</p>
          <h1 className="text-2xl font-bold text-gray-900">{state.session.title}</h1>
          <p className="text-sm text-gray-600">
            {state.activeRound ? `Round: ${state.activeRound.title || state.activeRound.round_type}` : 'Waiting for round to start'}
          </p>
          <p className="mt-2 text-sm font-medium text-[#C0392B]">
            {myTeamLabel
              ? `You are Team ${myTeamLabel}`
              : 'Your team is not mapped in this session'}
          </p>
          {directedTeam && (
            <p className="text-sm text-gray-700">
              Current turn: Team {directedTeam}
              {isMyTurn ? ' (Your turn)' : ''}
            </p>
          )}
        </div>

        <QuestionDisplay question={state.currentQuestion} showOptions={showOptions} readOnly={!isMyTurn} />
      </div>
    </div>
  )
}

