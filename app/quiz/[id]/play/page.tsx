'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { subscribeQuizDataRefresh, subscribeToSession } from '@/lib/services/quizSessionService'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { ScoreSidebar } from '@/components/quiz/ScoreSidebar'
import { Button } from '@/components/ui/Button'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface SessionState {
  session: any
  rounds: any[]
  activeRound: any | null
  currentQuestionEvent: any | null
  currentQuestion: any | null
  scores: Record<TeamLabel, number>
  team_display_names?: Record<TeamLabel, string>
  participantDirectAttempt?: { answer_text: string; verdict: string } | null
}

export default function ParticipantPlayPage() {
  const params = useParams<{ id: string }>()
  const sessionId = params?.id
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<SessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myTeamLabel, setMyTeamLabel] = useState<TeamLabel | null>(null)
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<'TRUE' | 'FALSE' | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerBusy, setAnswerBusy] = useState(false)

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
        const match =
          (['A', 'B', 'C', 'D'] as TeamLabel[]).find((label) => slots[label] === participant?.team_id) || null
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

  useEffect(() => {
    if (!sessionId || !state?.rounds?.length) return
    const roundIds = (state.rounds as { id: string }[]).map((r) => r.id)
    return subscribeQuizDataRefresh(sessionId, roundIds, () => void fetchState())
  }, [sessionId, state?.rounds, fetchState])

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

  useEffect(() => {
    setSelectedTrueFalse(null)
  }, [state?.currentQuestionEvent?.id])

  useEffect(() => {
    const a = state?.participantDirectAttempt?.answer_text
    setAnswerDraft(typeof a === 'string' ? a : '')
  }, [state?.currentQuestionEvent?.id, state?.participantDirectAttempt?.answer_text])

  const submitDirectAnswer = async () => {
    if (!sessionId || !state?.currentQuestionEvent?.id) return
    setAnswerBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionEventId: state.currentQuestionEvent.id,
          answerText: answerDraft,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to submit')
      await fetchState()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAnswerBusy(false)
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading session...</div>
  }

  if (error && !state) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
  }

  if (!state) return null

  const directedTeam = (state.currentQuestionEvent?.directed_team || null) as TeamLabel | null
  const isMyTurn = Boolean(directedTeam && myTeamLabel && directedTeam === myTeamLabel)
  const isDirectRound = state.activeRound?.round_type === 'direct_question'
  const revealCorrect = Boolean(state.currentQuestionEvent?.correct_answer_revealed_at)
  const showOptions = !isDirectRound && state.currentQuestionEvent?.status === 'options_revealed'

  const attempt = state.participantDirectAttempt
  const directPhaseOpen =
    isDirectRound &&
    state.currentQuestionEvent?.status === 'revealed' &&
    !revealCorrect &&
    isMyTurn
  const canEditDirectAnswer =
    directPhaseOpen && (!attempt || attempt.verdict === 'pending')
  const blockedAfterJudgment =
    directPhaseOpen && attempt && attempt.verdict !== 'pending'

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <ScoreSidebar teams={teamNames} scores={state.scores} />
      <div className="space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {state.session.is_test_session ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Test session — rehearsal run; not a scored competition round.
            </div>
          ) : null}
          <p className="text-sm text-gray-500">Session</p>
          <h1 className="text-2xl font-bold text-gray-900">{state.session.title}</h1>
          <p className="text-sm text-gray-600">
            {state.activeRound
              ? `Round: ${state.activeRound.title || state.activeRound.round_type}`
              : 'Waiting for round to start'}
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

        <QuestionDisplay
          question={state.currentQuestion}
          showOptions={showOptions}
          readOnly={!isMyTurn}
          selectedTrueFalse={selectedTrueFalse}
          onTrueFalseSelect={setSelectedTrueFalse}
          revealCorrectAnswer={revealCorrect}
        />

        {isDirectRound && state.currentQuestion && !revealCorrect && state.currentQuestionEvent?.status === 'revealed' ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            {!isMyTurn ? (
              <p className="text-sm text-gray-600">Waiting for the directed team to answer…</p>
            ) : blockedAfterJudgment ? (
              <p className="text-sm text-gray-700">
                {attempt?.verdict === 'wrong'
                  ? 'Your answer was marked incorrect. The host may pass the question to another team.'
                  : 'Waiting for the host…'}
              </p>
            ) : canEditDirectAnswer ? (
              <>
                <label htmlFor="direct-answer" className="text-sm font-medium text-gray-800">
                  Your answer (direct question)
                </label>
                <textarea
                  id="direct-answer"
                  className="min-h-[120px] w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900"
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="Type your answer…"
                />
                <Button onClick={() => void submitDirectAnswer()} isLoading={answerBusy}>
                  Submit answer
                </Button>
                <p className="text-xs text-gray-500">
                  You can update your text until the host marks your answer. One pending attempt per turn.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-gray-800">
                Your answer was submitted. Waiting for the host…
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
