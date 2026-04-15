'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { subscribeQuizDataRefresh, subscribeToSession } from '@/lib/services/quizSessionService'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { Button } from '@/components/ui/Button'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface SessionState {
  session: any
  rounds: any[]
  activeRound: any | null
  currentQuestionEvent: any | null
  currentQuestion: any | null
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
  const [trueFalseLockedEventId, setTrueFalseLockedEventId] = useState<string | null>(null)
  const [selectedDirectOption, setSelectedDirectOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
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

  useEffect(() => {
    setSelectedTrueFalse(null)
    setTrueFalseLockedEventId(null)
  }, [state?.currentQuestionEvent?.id])

  useEffect(() => {
    const answer = String(state?.participantDirectAttempt?.answer_text || '').trim().toUpperCase()
    if (answer === 'A' || answer === 'B' || answer === 'C' || answer === 'D') {
      setSelectedDirectOption(answer)
      return
    }
    setSelectedDirectOption(null)
  }, [state?.currentQuestionEvent?.id, state?.participantDirectAttempt?.answer_text])

  const submitDirectAnswer = async () => {
    if (!sessionId || !state?.currentQuestionEvent?.id || !selectedDirectOption) return
    setAnswerBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionEventId: state.currentQuestionEvent.id,
          answerText: selectedDirectOption,
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
  const isTrueFalseRound = state.activeRound?.round_type === 'true_or_false'
  const revealCorrect = Boolean(state.currentQuestionEvent?.correct_answer_revealed_at)
  const showOptions = isTrueFalseRound && state.currentQuestionEvent?.status === 'options_revealed'

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
  const trueFalseEventId = state.currentQuestionEvent?.id || null
  const trueFalsePhaseOpen =
    isTrueFalseRound &&
    Boolean(state.currentQuestion) &&
    state.currentQuestionEvent?.status === 'options_revealed' &&
    !revealCorrect
  const canChooseTrueFalse =
    trueFalsePhaseOpen &&
    isMyTurn &&
    !!trueFalseEventId &&
    trueFalseLockedEventId !== trueFalseEventId

  const onTrueFalseSelect = (value: 'TRUE' | 'FALSE') => {
    setSelectedTrueFalse(value)
    if (canChooseTrueFalse && trueFalseEventId) {
      // There is no persisted participant T/F submission endpoint yet.
      // Lock after one local choice per question event to reflect turn-based UX.
      setTrueFalseLockedEventId(trueFalseEventId)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
        {state.session.is_test_session ? (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Test session — rehearsal run; not a scored competition round.
            </div>
        ) : null}
          <p className="text-sm text-gray-500">Session</p>
          <h1 className="text-2xl font-bold text-gray-900">{state.session.title}</h1>
          <p className="text-sm text-gray-600">
            {state.activeRound
              ? `Round: ${state.activeRound.title || state.activeRound.round_type}`
              : 'Round: Questions will be assigned soon.'}
          </p>
          <p className="mt-2 text-sm font-medium text-[#C0392B]">
            {myTeamLabel
              ? `Participant team: Team ${myTeamLabel}`
              : 'Your team is not mapped in this session'}
          </p>
          {directedTeam && (
            <p className="text-sm text-gray-700">
              Current turn: Team {directedTeam}
              {isMyTurn ? ' (Your turn)' : ''}
            </p>
          )}
        </div>

        {!state.currentQuestion ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            Questions will be assigned soon.
          </div>
        ) : (
          <QuestionDisplay
            question={state.currentQuestion}
            showOptions={showOptions}
            readOnly={!canChooseTrueFalse}
            selectedTrueFalse={selectedTrueFalse}
            onTrueFalseSelect={onTrueFalseSelect}
            revealCorrectAnswer={revealCorrect}
          />
        )}

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
                <p className="text-sm font-medium text-gray-800">Select your answer (direct question)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      { key: 'A', text: state.currentQuestion.option_a },
                      { key: 'B', text: state.currentQuestion.option_b },
                      { key: 'C', text: state.currentQuestion.option_c },
                      { key: 'D', text: state.currentQuestion.option_d },
                    ] as const
                  ).map(({ key, text }) => (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedDirectOption === key
                          ? 'border-[#C0392B] bg-[#C0392B]/10 text-[#C0392B]'
                          : 'border-gray-300 bg-white text-gray-800'
                      }`}
                      onClick={() => setSelectedDirectOption(key)}
                    >
                      <span className="font-semibold">{key}) </span>
                      <span>{text || '(Not set)'}</span>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => void submitDirectAnswer()}
                  isLoading={answerBusy}
                  disabled={!selectedDirectOption}
                >
                  Submit answer
                </Button>
                <p className="text-xs text-gray-500">
                  You can update your selected option until the host judges your answer.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-gray-800">
                Your answer was submitted. Waiting for the host…
              </p>
            )}
          </div>
        ) : null}

        {isTrueFalseRound && state.currentQuestion ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {!trueFalsePhaseOpen ? (
              <p className="text-sm text-gray-600">
                Waiting for host to reveal True/False options...
              </p>
            ) : !isMyTurn ? (
              <p className="text-sm text-gray-600">
                Waiting for the directed team to answer...
              </p>
            ) : trueFalseLockedEventId === trueFalseEventId ? (
              <p className="text-sm font-medium text-gray-800">
                Your True/False choice is locked for this question. Waiting for host judgement...
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                Select TRUE or FALSE above. Your first choice is treated as final for this turn.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
