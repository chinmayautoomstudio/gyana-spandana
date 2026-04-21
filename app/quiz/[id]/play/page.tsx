'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useResolvedParams } from '@/lib/navigation/unwrapNavigation'
import { createClient } from '@/lib/supabase/client'
import { subscribeQuizDataRefresh, subscribeToSession } from '@/lib/services/quizSessionService'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { Button } from '@/components/ui/Button'
import { buzzerWrongPenaltyPoints } from '@/lib/services/scoringService'
import type { TeamLabel } from '@/lib/utils/teamColors'
import { LiveScoreboard } from '@/components/quiz/LiveScoreboard'

const RAPID_FIRE_SUBMIT_GRACE_SECONDS = 2
const QUIZ_SYNC_DEBUG =
  process.env.NEXT_PUBLIC_QUIZ_SYNC_DEBUG === 'true' && process.env.NODE_ENV !== 'production'

interface SessionState {
  session: any
  rounds: any[]
  activeRound: any | null
  currentQuestionEvent: any | null
  currentQuestion: any | null
  participantDirectAttempt?: { answer_text: string; verdict: string } | null
  /** From GET: server-backed Rapid Fire turn countdown (started_at + duration_seconds). */
  rapidFireTimer?: { startedAt: string; durationSeconds: number } | null
  rapidFireTurnSummary?: { correct: number; incorrect: number } | null
  /** True when the active Rapid Fire session has ended (time or bank exhausted). */
  rapidFireTurnComplete?: boolean
  /** From GET: server epoch ms at response time — used to correct buzzer deadline vs client clock skew. */
  serverTimestampMs?: number
  scores?: Record<TeamLabel, number>
  team_display_names?: Record<TeamLabel, string>
  scoresByRoundType?: Record<TeamLabel, Record<string, number>>
}

export default function ParticipantPlayPage() {
  const resolvedParams = useResolvedParams()
  const sessionId =
    typeof resolvedParams?.id === 'string'
      ? resolvedParams.id
      : Array.isArray(resolvedParams?.id)
        ? resolvedParams.id[0]
        : undefined
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<SessionState | null>(null)

  const teamNames = useMemo((): Record<TeamLabel, string> => {
    if (state?.team_display_names) return state.team_display_names
    const slots = (state?.session?.team_slots || {}) as Record<string, string>
    return {
      A: `Team ${slots.A ? slots.A.slice(0, 8) : 'A'}`,
      B: `Team ${slots.B ? slots.B.slice(0, 8) : 'B'}`,
      C: `Team ${slots.C ? slots.C.slice(0, 8) : 'C'}`,
      D: `Team ${slots.D ? slots.D.slice(0, 8) : 'D'}`,
    }
  }, [state?.team_display_names, state?.session?.team_slots])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myTeamLabel, setMyTeamLabel] = useState<TeamLabel | null>(null)
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<'TRUE' | 'FALSE' | null>(null)
  const [trueFalseLockedEventId, setTrueFalseLockedEventId] = useState<string | null>(null)
  const [selectedDirectOption, setSelectedDirectOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [answerBusy, setAnswerBusy] = useState(false)
  const [rapidFireRemaining, setRapidFireRemaining] = useState<number | null>(null)
  const [buzzerPressedForEventId, setBuzzerPressedForEventId] = useState<string | null>(null)
  const buzzAttemptLockEventRef = useRef<string | null>(null)
  const buzzerTimeoutSentForEventRef = useRef<string | null>(null)
  /** client ms - server ms (subtract from Date.now()/buzzerClock for server-equivalent time). */
  const clockOffsetMsRef = useRef(0)
  const [myBuzzOrder, setMyBuzzOrder] = useState<number | null>(null)
  const [questionLanguage, setQuestionLanguage] = useState<'en' | 'odia'>('en')
  const [buzzerClock, setBuzzerClock] = useState(() => Date.now())
  const [rapidFireClock, setRapidFireClock] = useState(() => Date.now())
  const fetchSeqRef = useRef(0)
  const pendingRefreshMetaRef = useRef<{ source: string; eventType?: string; eventTimestamp?: string } | null>(null)

  const fetchState = useCallback(async () => {
    if (!sessionId) return
    const fetchSeq = ++fetchSeqRef.current
    const requestStartedMs = Date.now()
    const meta = pendingRefreshMetaRef.current
    pendingRefreshMetaRef.current = null
    // Fix 7: lean participant endpoint — omits host-only queries (activeRoundQuestions etc.)
    const res = await fetch(`/api/quiz/session/${sessionId}/participant`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load session')
    if (fetchSeq !== fetchSeqRef.current) return null
    setState(data)
    if (typeof data?.serverTimestampMs === 'number') {
      clockOffsetMsRef.current = Date.now() - data.serverTimestampMs
    }
    if (QUIZ_SYNC_DEBUG && meta) {
      const nowMs = Date.now()
      const eventAgeMs =
        meta.eventTimestamp && Number.isFinite(new Date(meta.eventTimestamp).getTime())
          ? nowMs - new Date(meta.eventTimestamp).getTime()
          : null
      console.info('[quiz-sync][participant-refresh]', {
        sessionId,
        source: meta.source,
        eventType: meta.eventType || null,
        requestDurationMs: nowMs - requestStartedMs,
        eventToRenderMs: eventAgeMs,
        eventId: (data as SessionState)?.currentQuestionEvent?.id || null,
        eventStatus: (data as SessionState)?.currentQuestionEvent?.status || null,
      })
    }
    return data as SessionState
  }, [sessionId])
  const requestRefresh = useCallback((source = 'unknown', eventType?: string, eventTimestamp?: string) => {
    pendingRefreshMetaRef.current = { source, eventType, eventTimestamp }
    void fetchState()
  }, [fetchState])

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
        onRoundStarted: () => requestRefresh('broadcast', 'round_started'),
        onQuestionRevealed: () => requestRefresh('broadcast', 'question_revealed'),
        onOptionsRevealed: () => requestRefresh('broadcast', 'options_revealed'),
        onTimerStarted: (payload) => {
          const seconds = Number(payload?.durationSeconds || 0)
          setRapidFireRemaining(Number.isFinite(seconds) && seconds > 0 ? seconds : null)
          const startedAt = typeof payload?.startedAt === 'string' ? payload.startedAt : ''
          if (startedAt && Number.isFinite(seconds) && seconds > 0) {
            setState((prev) =>
              prev
                ? {
                    ...prev,
                    rapidFireTimer: { startedAt, durationSeconds: seconds },
                  }
                : prev,
            )
          }
          requestRefresh('broadcast', 'timer_started')
        },
        onBuzzerOpen: (_payload) => {
          setBuzzerPressedForEventId(null)
          setMyBuzzOrder(null)
          requestRefresh('broadcast', 'buzzer_open')
        },
        onBuzzReceived: (payload) => {
          if (myTeamLabel && payload.teamLabel === myTeamLabel) {
            setMyBuzzOrder(Number(payload.buzzOrder || 0) || null)
            setBuzzerPressedForEventId(payload.questionEventId)
          }
          requestRefresh('broadcast', 'buzz_received')
        },
        onAnswerResult: () => requestRefresh('broadcast', 'answer_result'),
        onParticipantAnswerSubmitted: () => requestRefresh('broadcast', 'participant_answer_submitted'),
        onDirectVerdictApplied: (payload) => {
          // Fix 1: optimistic update — instantly show verdict, then background-sync
          setState((prev) => {
            if (!prev?.participantDirectAttempt) return prev
            if (prev.currentQuestionEvent?.id !== payload?.questionEventId) return prev
            return {
              ...prev,
              participantDirectAttempt: {
                ...prev.participantDirectAttempt,
                verdict: payload.verdict,
              },
            }
          })
          requestRefresh('broadcast', 'direct_verdict_applied')
        },
        onScoresUpdated: () => requestRefresh('broadcast', 'scores_updated'),
        onRoundEnded: () => requestRefresh('broadcast', 'round_ended'),
        onSessionEnded: () => requestRefresh('broadcast', 'session_ended'),
      })
    }

    return () => unsub()
  }, [sessionId, supabase, fetchState, myTeamLabel, requestRefresh])

  const roundIdsKey = (state?.rounds ?? []).map((r: { id: string }) => r.id).sort().join(',')

  useEffect(() => {
    if (!sessionId || !roundIdsKey) return
    const roundIds = roundIdsKey.split(',').filter(Boolean)
    return subscribeQuizDataRefresh(sessionId, roundIds, () => requestRefresh('postgres_changes'))
  }, [sessionId, roundIdsKey, requestRefresh])

  /** When Realtime misses updates, still pick up new questions and host actions. */
  useEffect(() => {
    if (!sessionId || loading) return
    if (!state?.session) return
    if (state.session.status === 'completed') return

    const POLL_MS = 10_000 // Fix 6: was 4000; Realtime covers hot events, poll only recovers from disconnect
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      requestRefresh('poll')
    }
    const id = setInterval(tick, POLL_MS)
    return () => clearInterval(id)
  }, [sessionId, loading, state?.session?.id, state?.session?.status, requestRefresh])

  useEffect(() => {
    setSelectedTrueFalse(null)
    setTrueFalseLockedEventId(null)
  }, [state?.currentQuestionEvent?.id])

  useEffect(() => {
    setBuzzerPressedForEventId(null)
    setMyBuzzOrder(null)
    buzzerTimeoutSentForEventRef.current = null
    if (state?.activeRound?.round_type !== 'rapid_fire') {
      setRapidFireRemaining(null)
    }
  }, [state?.currentQuestionEvent?.id, state?.activeRound?.round_type])

  useEffect(() => {
    if (rapidFireRemaining == null || rapidFireRemaining <= 0) return
    const timer = setInterval(() => {
      setRapidFireRemaining((prev) => {
        if (prev == null || prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [rapidFireRemaining])

  useEffect(() => {
    if (state?.activeRound?.round_type !== 'buzzer') return
    if (state?.currentQuestionEvent?.status !== 'buzzer_open') return
    const deadline = state?.currentQuestionEvent?.buzzer_answer_deadline_at as string | undefined
    if (!deadline) return
    const ans = String(state?.participantDirectAttempt?.answer_text || '').trim().toUpperCase()
    if (ans === 'A' || ans === 'B' || ans === 'C' || ans === 'D') return
    const t = setInterval(() => setBuzzerClock(Date.now()), 500)
    return () => clearInterval(t)
  }, [
    state?.activeRound?.round_type,
    state?.currentQuestionEvent?.status,
    state?.currentQuestionEvent?.buzzer_answer_deadline_at,
    state?.currentQuestionEvent?.id,
    state?.participantDirectAttempt?.answer_text,
  ])

  useEffect(() => {
    if (state?.activeRound?.round_type !== 'rapid_fire') return
    if (!state?.rapidFireTimer?.startedAt) return
    const t = setInterval(() => setRapidFireClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [
    state?.activeRound?.round_type,
    state?.rapidFireTimer?.startedAt,
    state?.rapidFireTimer?.durationSeconds,
  ])

  useEffect(() => {
    const answer = String(state?.participantDirectAttempt?.answer_text || '').trim().toUpperCase()
    if (answer === 'A' || answer === 'B' || answer === 'C' || answer === 'D') {
      setSelectedDirectOption(answer)
      return
    }
    setSelectedDirectOption(null)
  }, [state?.currentQuestionEvent?.id, state?.participantDirectAttempt?.answer_text])

  useEffect(() => {
    const answer = String(state?.participantDirectAttempt?.answer_text || '').trim().toUpperCase()
    const eventId = state?.currentQuestionEvent?.id || null
    if (answer === 'TRUE' || answer === 'FALSE') {
      setSelectedTrueFalse(answer)
      if (eventId) {
        setTrueFalseLockedEventId(eventId)
      }
      return
    }
    if (eventId && trueFalseLockedEventId === eventId) return
    setSelectedTrueFalse(null)
  }, [state?.currentQuestionEvent?.id, state?.participantDirectAttempt?.answer_text, trueFalseLockedEventId])

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
      // Fix 2: optimistic lock — confirm answer instantly, sync in background
      setState((prev) =>
        prev
          ? {
              ...prev,
              participantDirectAttempt: { answer_text: selectedDirectOption!, verdict: 'pending' },
            }
          : prev,
      )
      void fetchState()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAnswerBusy(false)
    }
  }

  const submitRapidFireAnswer = async () => {
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

      if (data?.nextEvent && data?.nextQuestion) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                currentQuestionEvent: data.nextEvent,
                currentQuestion: data.nextQuestion,
                participantDirectAttempt: null,
                rapidFireTurnSummary: data.turnSummary ?? prev.rapidFireTurnSummary ?? null,
                rapidFireTurnComplete: Boolean(data.rapidFireCompleted),
              }
            : prev,
        )
        setSelectedDirectOption(null)
      } else {
        setRapidFireRemaining(0)
        await fetchState()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAnswerBusy(false)
    }
  }

  const submitTrueFalseAnswer = async () => {
    if (!sessionId || !state?.currentQuestionEvent?.id || !selectedTrueFalse) return
    setAnswerBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quiz/session/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionEventId: state.currentQuestionEvent.id,
          answerText: selectedTrueFalse,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to submit')
      if (trueFalseEventId) {
        setTrueFalseLockedEventId(trueFalseEventId)
      }
      // Fix 2: optimistic lock — confirm answer instantly, sync in background
      setState((prev) =>
        prev
          ? {
              ...prev,
              participantDirectAttempt: { answer_text: selectedTrueFalse!, verdict: 'pending' },
            }
          : prev,
      )
      void fetchState()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAnswerBusy(false)
    }
  }

  useEffect(() => {
    if (!sessionId || !state?.currentQuestionEvent?.id || !myTeamLabel) return
    if (state.activeRound?.round_type !== 'buzzer') return
    const ev = state.currentQuestionEvent
    if (ev.status !== 'buzzer_open') return
    const deadlineAt = ev.buzzer_answer_deadline_at as string | undefined
    if (!deadlineAt) return
    const deadlineMs = new Date(deadlineAt).getTime()
    const serverSyncedNowLocal = buzzerClock - clockOffsetMsRef.current
    if (!Number.isFinite(deadlineMs) || serverSyncedNowLocal < deadlineMs) return

    const buzzerEventId = ev.id
    const buzzerTimeExpiredLocal = serverSyncedNowLocal >= deadlineMs
    const canBuzzLocal =
      state.activeRound?.round_type === 'buzzer' &&
      ev.status === 'buzzer_open' &&
      Boolean(myTeamLabel) &&
      Boolean(buzzerEventId) &&
      buzzerPressedForEventId !== buzzerEventId &&
      !buzzerTimeExpiredLocal

    const directed = (ev.directed_team || null) as TeamLabel | null
    const isActiveBuzzerTeamLocal =
      Boolean(myTeamLabel) && (directed ? directed === myTeamLabel : myBuzzOrder === 1)
    const isBuzzerActiveResponderLocal =
      state.activeRound?.round_type === 'buzzer' &&
      ev.status === 'buzzer_open' &&
      !canBuzzLocal &&
      isActiveBuzzerTeamLocal &&
      Boolean(deadlineAt)

    if (!isBuzzerActiveResponderLocal) return

    const submittedMcq = String(state?.participantDirectAttempt?.answer_text || '')
      .trim()
      .toUpperCase()
    if (submittedMcq === 'A' || submittedMcq === 'B' || submittedMcq === 'C' || submittedMcq === 'D') return

    const eventId = ev.id
    if (buzzerTimeoutSentForEventRef.current === eventId) return
    buzzerTimeoutSentForEventRef.current = eventId

    void (async () => {
      try {
        const res = await fetch(`/api/quiz/session/${sessionId}/buzzer-timeout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionEventId: eventId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok && !data?.skipped) {
          buzzerTimeoutSentForEventRef.current = null
          setError(String(data?.error || 'Failed to apply buzzer timeout'))
          return
        }
        await fetchState()
      } catch (e: unknown) {
        buzzerTimeoutSentForEventRef.current = null
        setError(e instanceof Error ? e.message : 'Failed to apply buzzer timeout')
      }
    })()
  }, [
    sessionId,
    state,
    myTeamLabel,
    myBuzzOrder,
    buzzerPressedForEventId,
    buzzerClock,
    fetchState,
  ])

  const submitBuzz = async (clientPressedAtMs: number) => {
    if (!sessionId || !state?.currentQuestionEvent?.id || !myTeamLabel) return
    const eventId = state.currentQuestionEvent.id
    if (buzzerPressedForEventId === eventId) return
    if (buzzAttemptLockEventRef.current === eventId) return
    buzzAttemptLockEventRef.current = eventId
    setError(null)
    setBuzzerPressedForEventId(eventId)
    try {
      const res = await fetch(`/api/quiz/session/${sessionId}/buzz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionEventId: state.currentQuestionEvent.id,
          teamLabel: myTeamLabel,
          clientPressedAtMs,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to buzz in')
      setMyBuzzOrder(Number(data?.buzzOrder || 0) || null)
      await fetchState()
    } catch (e: any) {
      setError(e.message)
      buzzAttemptLockEventRef.current = null
      setBuzzerPressedForEventId(null)
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading session...</div>
  }

  if (error && !state) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
  }

  if (!state) return null

  if (state.session?.status === 'completed') {
    return (
      <div className="min-h-screen w-full bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Session Complete</p>
            <h1 className="mt-2 text-2xl font-bold text-emerald-950">{state.session.title}</h1>
            <p className="mt-4 text-base text-emerald-900">Thank you for participating in Gyana Spardha.</p>
            <p className="mt-2 text-sm text-emerald-800">This session is now closed. Rejoin is disabled for participants.</p>
          </div>
        </div>
      </div>
    )
  }

  const directedTeam = (state.currentQuestionEvent?.directed_team || null) as TeamLabel | null
  const isMyTurn = Boolean(directedTeam && myTeamLabel && directedTeam === myTeamLabel)
  const isDirectRound = state.activeRound?.round_type === 'direct_question'
  const isTrueFalseRound = state.activeRound?.round_type === 'true_or_false'
  const isRapidFireRound = state.activeRound?.round_type === 'rapid_fire'
  const isBuzzerRound = state.activeRound?.round_type === 'buzzer'
  const revealCorrect = Boolean(state.currentQuestionEvent?.correct_answer_revealed_at)

  const rt = state.rapidFireTimer
  /** Align with server clock using participant GET `serverTimestampMs` (same pattern as buzzer). */
  const rfNow = rapidFireClock - clockOffsetMsRef.current
  let rapidFireSecondsFromServer: number | null = null
  if (rt?.startedAt != null && rt.durationSeconds != null) {
    const startedMs = new Date(rt.startedAt).getTime()
    if (Number.isFinite(startedMs)) {
      const elapsed = Math.floor((rfNow - startedMs) / 1000)
      rapidFireSecondsFromServer = Math.max(0, Number(rt.durationSeconds) - elapsed)
    }
  }
  const rapidFireSecondsDisplay =
    rapidFireSecondsFromServer !== null ? rapidFireSecondsFromServer : rapidFireRemaining
  const rapidFireGraceActive = (() => {
    if (!isRapidFireRound || rt?.startedAt == null || rt.durationSeconds == null) return false
    const startedMs = new Date(rt.startedAt).getTime()
    if (!Number.isFinite(startedMs)) return false
    const deadlineMs = startedMs + Number(rt.durationSeconds) * 1000
    const graceDeadlineMs = deadlineMs + RAPID_FIRE_SUBMIT_GRACE_SECONDS * 1000
    return rfNow >= deadlineMs && rfNow < graceDeadlineMs
  })()

  const showOptions =
    (isTrueFalseRound && state.currentQuestionEvent?.status === 'options_revealed') ||
    (isRapidFireRound &&
      ['revealed', 'options_revealed', 'buzzer_open'].includes(String(state.currentQuestionEvent?.status || ''))) ||
    (isBuzzerRound && String(state.currentQuestionEvent?.status || '') === 'buzzer_open')
  const rapidFireEventActive =
    isRapidFireRound && ['revealed', 'options_revealed', 'buzzer_open'].includes(String(state.currentQuestionEvent?.status || ''))
  const rapidFireQuestionVisible =
    isRapidFireRound &&
    Boolean(state.currentQuestion) &&
    rapidFireEventActive &&
    (rapidFireSecondsDisplay == null || rapidFireSecondsDisplay > 0 || rapidFireGraceActive)

  const attempt = state.participantDirectAttempt
  const evStatus = String(state.currentQuestionEvent?.status || '')
  const verdict = attempt?.verdict
  const hasFinalVerdict =
    Boolean(attempt) && verdict !== 'pending' && (verdict === 'correct' || verdict === 'wrong')
  const buzzerQuestionVisible =
    !isBuzzerRound || evStatus === 'buzzer_open' || hasFinalVerdict || revealCorrect
  const showDirectParticipantPanel =
    isDirectRound &&
    Boolean(state.currentQuestion) &&
    !revealCorrect &&
    Boolean(state.currentQuestionEvent) &&
    (evStatus === 'revealed' || (evStatus === 'answered' && hasFinalVerdict))

  const showDirectPostRevealSummary =
    isDirectRound &&
    Boolean(state.currentQuestion) &&
    revealCorrect &&
    Boolean(state.currentQuestionEvent) &&
    Boolean(attempt)

  const submittedRaw = String(attempt?.answer_text || '').trim().toUpperCase()
  const letterFromAttempt: 'A' | 'B' | 'C' | 'D' | null =
    submittedRaw === 'A' || submittedRaw === 'B' || submittedRaw === 'C' || submittedRaw === 'D'
      ? (submittedRaw as 'A' | 'B' | 'C' | 'D')
      : null
  const letterFromSelection: 'A' | 'B' | 'C' | 'D' | null =
    selectedDirectOption === 'A' ||
    selectedDirectOption === 'B' ||
    selectedDirectOption === 'C' ||
    selectedDirectOption === 'D'
      ? selectedDirectOption
      : null
  const submittedLetter: 'A' | 'B' | 'C' | 'D' | null =
    letterFromAttempt ?? (hasFinalVerdict ? letterFromSelection : null)

  const buzzerMcqSubmittedPending =
    isBuzzerRound &&
    evStatus === 'buzzer_open' &&
    Boolean(letterFromAttempt) &&
    verdict === 'pending'

  const officialAnswerRaw = String(state.currentQuestion?.correct_answer || '').trim().toUpperCase()
  const officialChar = officialAnswerRaw.charAt(0)
  const officialLetter: 'A' | 'B' | 'C' | 'D' | null =
    officialChar === 'A' || officialChar === 'B' || officialChar === 'C' || officialChar === 'D'
      ? officialChar
      : null

  const directPhaseOpen =
    isDirectRound &&
    evStatus === 'revealed' &&
    !revealCorrect &&
    isMyTurn
  const canEditDirectAnswer =
    directPhaseOpen && (!attempt || verdict === 'pending')
  const trueFalseEventId = state.currentQuestionEvent?.id || null
  const buzzerEventId = state.currentQuestionEvent?.id || null
  const buzzerDeadlineAt = state.currentQuestionEvent?.buzzer_answer_deadline_at as string | undefined
  const buzzerDeadlineMs = buzzerDeadlineAt ? new Date(buzzerDeadlineAt).getTime() : NaN
  const serverSyncedNow = buzzerClock - clockOffsetMsRef.current
  const buzzerTimeExpired =
    Number.isFinite(buzzerDeadlineMs) && serverSyncedNow >= buzzerDeadlineMs
  const buzzerSecondsLeft =
    buzzerDeadlineAt && Number.isFinite(buzzerDeadlineMs)
      ? Math.max(0, Math.ceil((buzzerDeadlineMs - serverSyncedNow) / 1000))
      : null
  const canBuzz =
    isBuzzerRound &&
    state.currentQuestionEvent?.status === 'buzzer_open' &&
    Boolean(myTeamLabel) &&
    !!buzzerEventId &&
    buzzerPressedForEventId !== buzzerEventId &&
    !buzzerTimeExpired
  const activeBuzzerTeam = (state.currentQuestionEvent?.directed_team || null) as TeamLabel | null
  const isActiveBuzzerTeam =
    Boolean(myTeamLabel) &&
    (activeBuzzerTeam
      ? activeBuzzerTeam === myTeamLabel
      : myBuzzOrder === 1)
  const isBuzzerActiveResponder =
    isBuzzerRound &&
    state.currentQuestionEvent?.status === 'buzzer_open' &&
    !canBuzz &&
    isActiveBuzzerTeam &&
    Boolean(buzzerDeadlineAt)
  const canSubmitBuzzerAnswer =
    isBuzzerActiveResponder && !buzzerTimeExpired && !buzzerMcqSubmittedPending
  const buzzerPenaltyPts = buzzerWrongPenaltyPoints(Number(state.session?.points_full ?? 10))
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
  const rapidFirePhaseOpen =
    isRapidFireRound &&
    Boolean(state.currentQuestion) &&
    ['revealed', 'options_revealed', 'buzzer_open'].includes(evStatus) &&
    !revealCorrect &&
    isMyTurn &&
    (rapidFireSecondsDisplay == null || rapidFireSecondsDisplay > 0 || rapidFireGraceActive)
  const questionReadOnly = isTrueFalseRound ? !canChooseTrueFalse : !rapidFirePhaseOpen
  const rapidFireTurnSummary = isRapidFireRound ? state.rapidFireTurnSummary ?? null : null
  const rapidFireCounterComplete =
    isRapidFireRound &&
    Boolean(rapidFireTurnSummary) &&
    (state.rapidFireTurnComplete ||
      (rapidFireSecondsFromServer !== null && rapidFireSecondsFromServer <= 0 && !rapidFireGraceActive))

  const onTrueFalseSelect = (value: 'TRUE' | 'FALSE') => {
    setSelectedTrueFalse(value)
  }
  const localizedText = (english: string | null | undefined, odia: string | null | undefined) => {
    const en = String(english || '').trim()
    const od = String(odia || '').trim()
    return questionLanguage === 'odia' ? od || en : en || od
  }
  const localizedOptionText = (label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null) => {
    if (!label || !state?.currentQuestion) return ''
    if (label === 'TRUE') return localizedText('TRUE', state.currentQuestion.option_a_odia)
    if (label === 'FALSE') return localizedText('FALSE', state.currentQuestion.option_b_odia)
    const key = `option_${label.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'
    const keyOdia =
      `option_${label.toLowerCase()}_odia` as
        | 'option_a_odia'
        | 'option_b_odia'
        | 'option_c_odia'
        | 'option_d_odia'
    return localizedText(state.currentQuestion[key], state.currentQuestion[keyOdia])
  }

  const emptyScoresByRoundType = { A: {}, B: {}, C: {}, D: {} } as Record<TeamLabel, Record<string, number>>
  const scoresMap = (state.scores ?? { A: 0, B: 0, C: 0, D: 0 }) as Record<TeamLabel, number>

  return (
    <div className="min-h-screen w-full bg-white px-4 py-6 sm:px-6">
      <LiveScoreboard
        teams={teamNames}
        scores={scoresMap}
        rounds={state.rounds || []}
        scoresByRoundType={state.scoresByRoundType ?? emptyScoresByRoundType}
      />
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-end">
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
          </div>
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

        {isBuzzerRound &&
        evStatus === 'buzzer_open' &&
        Boolean(buzzerDeadlineAt) &&
        Boolean(state.currentQuestion) ? (
          <div className="rounded-2xl border-2 border-[#C0392B] bg-[#C0392B]/5 px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C0392B]">Buzzer round</p>
            {buzzerMcqSubmittedPending && isMyTurn ? (
              <>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  Team <span className="font-bold">{directedTeam || myTeamLabel}</span> — answer submitted
                </p>
                <p className="mt-2 text-sm text-gray-700">Waiting for the host…</p>
              </>
            ) : buzzerSecondsLeft !== null ? (
              <>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  {directedTeam ? (
                    <>
                      Team <span className="font-bold">{directedTeam}</span> may answer
                    </>
                  ) : (
                    <>First buzzer may answer</>
                  )}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-[#C0392B]">
                  {buzzerTimeExpired ? 0 : buzzerSecondsLeft}
                  <span className="text-xl font-semibold text-gray-800">s</span>
                </p>
                {buzzerTimeExpired ? (
                  <p className="mt-1 text-sm text-gray-700">Answer window closed. Waiting for host…</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-600">Shared countdown for all teams</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-800">Buzzer is open — press Buzz In! to respond.</p>
            )}
          </div>
        ) : null}

        {isRapidFireRound &&
        ['revealed', 'options_revealed', 'buzzer_open'].includes(evStatus) &&
        Boolean(state.currentQuestion) &&
        (rapidFireSecondsDisplay == null || rapidFireSecondsDisplay > 0 || rapidFireGraceActive) ? (
          <div className="rounded-2xl border-2 border-orange-400 bg-orange-50/90 px-4 py-5 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-900">Rapid Fire</p>
            {rapidFireSecondsDisplay != null && rapidFireSecondsDisplay > 0 ? (
              <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-orange-950">
                {rapidFireSecondsDisplay}
                <span className="ml-1 text-2xl font-semibold text-orange-900">s</span>
              </p>
            ) : rapidFireGraceActive ? (
              <>
                <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-orange-950">
                  0
                  <span className="ml-1 text-2xl font-semibold text-orange-900">s</span>
                </p>
                <p className="mt-1 text-xs text-orange-900">Grace window: finalizing in-flight submissions…</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-orange-900">Syncing timer…</p>
            )}
          </div>
        ) : null}

        {isRapidFireRound && rapidFireTurnSummary ? (
          <div
            className={`rounded-xl p-4 ${
              rapidFireCounterComplete
                ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-950'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-950'
            }`}
          >
            <p className="text-sm font-semibold">
              {rapidFireCounterComplete ? 'Rapid Fire score - turn complete' : 'Rapid Fire score'}
            </p>
            <p className="mt-1 text-sm">
              Correct: {rapidFireTurnSummary.correct} | Incorrect: {rapidFireTurnSummary.incorrect}
            </p>
          </div>
        ) : null}

        {!state.currentQuestion || (isRapidFireRound && !rapidFireQuestionVisible) || !buzzerQuestionVisible ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-600">
            {isRapidFireRound
              ? !rapidFireEventActive
                ? 'Rapid Fire turn ended. Waiting for host...'
                : !isMyTurn
                  ? 'Waiting for your turn in Rapid Fire...'
                  : rapidFireSecondsDisplay == null
                    ? 'Timer syncing...'
                    : rapidFireGraceActive
                      ? 'Grace window active. Submit now if your answer is ready...'
                    : rapidFireSecondsDisplay <= 0
                      ? 'Rapid Fire turn ended. Waiting for host...'
                      : 'Loading your Rapid Fire question...'
              : isBuzzerRound && evStatus !== 'buzzer_open'
                ? 'Waiting for host to open buzzer...'
                : 'Questions will be assigned soon.'}
          </div>
        ) : (
          <QuestionDisplay
            question={state.currentQuestion}
            showOptions={showOptions}
            readOnly={questionReadOnly}
            selectedTrueFalse={selectedTrueFalse}
            onTrueFalseSelect={onTrueFalseSelect}
            revealCorrectAnswer={revealCorrect}
            selectedMcqOption={selectedDirectOption}
            language={questionLanguage}
            onMcqOptionSelect={(value) => {
              if (rapidFirePhaseOpen) setSelectedDirectOption(value)
            }}
          />
        )}

        {isRapidFireRound && state.currentQuestion && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {!rapidFirePhaseOpen ? (
              <p className="text-sm text-gray-600">
                {isMyTurn ? 'Waiting for the next Rapid Fire question...' : 'Waiting for your turn...'}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  {rapidFireGraceActive
                    ? 'Grace window active (2s): submit now to count this response.'
                    : 'Select one option, then submit to auto-advance.'}
                </p>
                <Button
                  onClick={() => void submitRapidFireAnswer()}
                  isLoading={answerBusy}
                  disabled={!selectedDirectOption}
                >
                  Submit Rapid Fire answer
                </Button>
              </div>
            )}
          </div>
        )}

        {showDirectPostRevealSummary ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">Your result (direct question)</p>
            {!submittedLetter ? (
              <p className="text-sm text-gray-600">No recorded choice for your team on this question.</p>
            ) : officialLetter ? (
              submittedLetter === officialLetter ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950">
                  Your answer ({submittedLetter}) matches the correct answer.
                </p>
              ) : (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-950">
                  Your answer ({submittedLetter}) is incorrect. The correct answer was {officialLetter}.
                </p>
              )
            ) : (
              <p className="text-sm text-gray-700">
                Your answer: {submittedLetter}. See the question above for the official correct answer.
              </p>
            )}
            {verdict === 'correct' || verdict === 'wrong' ? (
              <p className="text-xs text-gray-500">
                Host judgement: {verdict === 'correct' ? 'Marked correct' : 'Marked incorrect'}
                {verdict === 'wrong' && submittedLetter === officialLetter
                  ? ' (official answer now shown for reference)'
                  : ''}
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {showDirectParticipantPanel ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            {hasFinalVerdict && !submittedLetter ? (
              <p className="text-sm text-gray-700">
                {verdict === 'correct'
                  ? 'Your answer was marked correct.'
                  : 'Your answer was marked incorrect. The correct answer is not shown here.'}
              </p>
            ) : hasFinalVerdict && submittedLetter ? (
              <>
                <div
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    verdict === 'correct'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-red-200 bg-red-50 text-red-950'
                  }`}
                >
                  {verdict === 'correct'
                    ? 'Your response has been checked — Correct.'
                    : 'Your response has been checked — Wrong. The correct answer has not been revealed yet.'}
                </div>
                <p className="text-sm font-medium text-gray-800">Your answer (direct question)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
                  {(
                    [
                      { key: 'A' as const, text: localizedOptionText('A') },
                      { key: 'B' as const, text: localizedOptionText('B') },
                      { key: 'C' as const, text: localizedOptionText('C') },
                      { key: 'D' as const, text: localizedOptionText('D') },
                    ] as const
                  ).map(({ key, text }) => {
                    const isChosen = key === submittedLetter
                    const correct = verdict === 'correct' && isChosen
                    const incorrect = verdict === 'wrong' && isChosen
                    const ring =
                      correct
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/40'
                        : incorrect
                          ? 'border-red-600 bg-red-50 text-red-950 ring-2 ring-red-500/40'
                          : isChosen
                            ? 'border-gray-400 bg-gray-50 text-gray-800'
                            : 'border-gray-200 bg-white text-gray-500 opacity-70'
                    return (
                      <div
                        key={key}
                        role="listitem"
                        className={`rounded-lg border px-3 py-2 text-left text-sm ${ring}`}
                        aria-label={
                          isChosen
                            ? verdict === 'correct'
                              ? 'Your choice — correct'
                              : verdict === 'wrong'
                                ? 'Your choice — incorrect'
                                : `Option ${key}`
                            : `Option ${key}`
                        }
                      >
                        <span className="font-semibold">{key}) </span>
                        <span>{text || '(Not set)'}</span>
                      </div>
                    )
                  })}
                </div>
                {verdict === 'wrong' ? (
                  <p className="text-xs text-gray-600">
                    The correct answer is not shown here. The host may pass the question to another team.
                  </p>
                ) : null}
              </>
            ) : !isMyTurn ? (
              <p className="text-sm text-gray-600">Waiting for the directed team to answer…</p>
            ) : canEditDirectAnswer ? (
              <>
                <p className="text-sm font-medium text-gray-800">Select your answer (direct question)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      { key: 'A' as const, text: localizedOptionText('A') },
                      { key: 'B' as const, text: localizedOptionText('B') },
                      { key: 'C' as const, text: localizedOptionText('C') },
                      { key: 'D' as const, text: localizedOptionText('D') },
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
              <div className="space-y-2">
                <p className="text-sm text-gray-700">Select TRUE or FALSE above, then submit your answer.</p>
                <Button
                  onClick={() => void submitTrueFalseAnswer()}
                  isLoading={answerBusy}
                  disabled={!selectedTrueFalse}
                >
                  Submit True/False answer
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {isBuzzerRound && state.currentQuestion && buzzerQuestionVisible ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            {hasFinalVerdict ? (
              <>
                <div
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    verdict === 'correct'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-red-200 bg-red-50 text-red-950'
                  }`}
                >
                  {verdict === 'correct'
                    ? 'Your buzzer response has been checked — Correct.'
                    : 'Your buzzer response has been checked — Wrong.'}
                </div>
                {verdict === 'wrong' ? (
                  <p className="text-xs text-gray-600">This question is closed. A wrong-answer penalty may apply.</p>
                ) : null}
                {submittedLetter ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
                    {(
                      [
                        { key: 'A' as const, text: localizedOptionText('A') },
                        { key: 'B' as const, text: localizedOptionText('B') },
                        { key: 'C' as const, text: localizedOptionText('C') },
                        { key: 'D' as const, text: localizedOptionText('D') },
                      ] as const
                    ).map(({ key, text }) => {
                      const isChosen = key === submittedLetter
                      const correct = verdict === 'correct' && isChosen
                      const incorrect = verdict === 'wrong' && isChosen
                      const ring =
                        correct
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/40'
                          : incorrect
                            ? 'border-red-600 bg-red-50 text-red-950 ring-2 ring-red-500/40'
                            : isChosen
                              ? 'border-gray-400 bg-gray-50 text-gray-800'
                              : 'border-gray-200 bg-white text-gray-500 opacity-70'
                      return (
                        <div key={key} role="listitem" className={`rounded-lg border px-3 py-2 text-left text-sm ${ring}`}>
                          <span className="font-semibold">{key}) </span>
                          <span>{text || '(Not set)'}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">Your submitted buzzer option was recorded.</p>
                )}
              </>
            ) : state.currentQuestionEvent?.status !== 'buzzer_open' ? (
              <p className="text-sm text-gray-600">Waiting for host to open buzzer...</p>
            ) : canBuzz ? (
              <button
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault()
                  const t = Date.now()
                  void submitBuzz(t)
                }}
                onClick={() => void submitBuzz(Date.now())}
                className="w-full rounded-2xl bg-[#C0392B] px-4 py-8 text-3xl font-bold text-white active:scale-[0.99]"
              >
                BUZZ IN!
              </button>
            ) : buzzerMcqSubmittedPending && isActiveBuzzerTeam ? (
              <p className="text-sm font-medium text-gray-800">
                Your answer was submitted. Waiting for the host…
              </p>
            ) : canSubmitBuzzerAnswer ? (
              <>
                <div className="rounded-xl border-2 border-[#C0392B] bg-[#C0392B]/5 px-4 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C0392B]">
                    Time to submit your answer
                  </p>
                  <p className="mt-2 text-4xl font-bold tabular-nums text-[#C0392B]">
                    {buzzerSecondsLeft ?? 0}
                    <span className="text-xl font-semibold text-gray-800">s</span>
                  </p>
                  <p className="mt-2 text-xs text-gray-700">
                    Wrong answer or timeout:{' '}
                    <span className="font-semibold">{buzzerPenaltyPts}</span> pts (50% of full question value).
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  You buzzed first. Select one option from the choices shown above:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${
                        selectedDirectOption === key
                          ? 'border-[#C0392B] bg-[#C0392B]/10 text-[#C0392B]'
                          : 'border-gray-300 bg-white text-gray-800'
                      }`}
                      onClick={() => setSelectedDirectOption(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                {selectedDirectOption ? (
                  <p className="text-xs text-gray-600">
                    Selected: {selectedDirectOption}) {localizedOptionText(selectedDirectOption) || '(Not set)'}
                  </p>
                ) : null}
                <Button onClick={() => void submitDirectAnswer()} isLoading={answerBusy} disabled={!selectedDirectOption}>
                  Submit buzzer answer
                </Button>
              </>
            ) : buzzerTimeExpired && state.currentQuestionEvent?.status === 'buzzer_open' ? (
              <p className="text-sm text-gray-700">Answer time expired. Waiting for host…</p>
            ) : (
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <p className="text-lg font-semibold text-gray-800">Buzzed!</p>
                {myBuzzOrder ? <p className="text-sm text-gray-600">Your order: #{myBuzzOrder}</p> : null}
                {!isActiveBuzzerTeam && myBuzzOrder ? (
                  <p className="mt-1 text-xs text-gray-600">Waiting for teams ahead of you to answer.</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
