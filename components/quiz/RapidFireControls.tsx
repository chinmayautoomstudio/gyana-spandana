'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/quiz/TeamBadge'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import type { TeamLabel } from '@/lib/utils/teamColors'

const MCQ: readonly ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D']

function localizedText(
  language: 'en' | 'odia',
  english: string | null | undefined,
  odia: string | null | undefined,
): string {
  const en = String(english || '').trim()
  const od = String(odia || '').trim()
  if (language === 'odia') return od || en
  return en || od
}

function truncate(s: string, max: number) {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function correctMcqLetter(correct: string | null | undefined): 'A' | 'B' | 'C' | 'D' | null {
  const c = String(correct || '')
    .trim()
    .toUpperCase()
    .charAt(0)
  return c === 'A' || c === 'B' || c === 'C' || c === 'D' ? c : null
}

interface RapidFireControlsProps {
  round: any | null
  question: any | null
  event: any | null
  busy?: boolean
  selectedTeam: TeamLabel
  onSelectTeam: (label: TeamLabel) => void
  onPrepareRapidFire: (teamLabel: TeamLabel) => Promise<{ question: any } | null>
  onStartRapidFire: (teamLabel: TeamLabel, durationSeconds: number) => Promise<any>
  onEndTurn: () => void
  participantResponse?: {
    team_label: string
    answer_text: string
    verdict?: string | null
    answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    answer_option_text: string | null
  } | null
  turnSummary?: { correct: number; incorrect: number } | null
  teamDisplayNames?: Record<TeamLabel, string>
  questionLanguage?: 'en' | 'odia'
  rapidFireTimer?: { startedAt: string; durationSeconds: number } | null
  rapidFireQuestionBank?: any[] | null
  rapidFireTurnComplete?: boolean
  /** From session GET; used to align remaining time with server clock. */
  serverTimestampMs?: number | null
}

export function RapidFireControls({
  round,
  question,
  event,
  busy = false,
  selectedTeam,
  onSelectTeam,
  onPrepareRapidFire,
  onStartRapidFire,
  onEndTurn,
  participantResponse = null,
  turnSummary = null,
  teamDisplayNames,
  questionLanguage = 'en',
  rapidFireTimer = null,
  rapidFireQuestionBank = null,
  rapidFireTurnComplete = false,
  serverTimestampMs = null,
}: RapidFireControlsProps) {
  const [durationSeconds, setDurationSeconds] = useState<number>(Number(round?.rapid_fire_duration_seconds || 45))
  const [phase, setPhase] = useState<'idle' | 'preview' | 'running'>('idle')
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null)
  const [localFallbackSeconds, setLocalFallbackSeconds] = useState<number>(0)
  const [clock, setClock] = useState(() => Date.now())
  const timeoutHandledRef = useRef(false)
  const serverOffsetMsRef = useRef(0)

  useEffect(() => {
    if (typeof serverTimestampMs === 'number' && Number.isFinite(serverTimestampMs)) {
      serverOffsetMsRef.current = Date.now() - serverTimestampMs
    }
  }, [serverTimestampMs])

  const activeTeam = (event?.rapid_fire_team || selectedTeam) as TeamLabel
  const isQuestionActive = Boolean(event && ['revealed', 'options_revealed', 'buzzer_open'].includes(event.status))
  const hasServerTimer = Boolean(rapidFireTimer?.startedAt && rapidFireTimer?.durationSeconds != null)

  const remainingSeconds = useMemo(() => {
    if (hasServerTimer && rapidFireTimer) {
      const startedAtMs = new Date(rapidFireTimer.startedAt).getTime()
      if (Number.isFinite(startedAtMs)) {
        const alignedNow =
          typeof serverTimestampMs === 'number' && Number.isFinite(serverTimestampMs)
            ? clock - serverOffsetMsRef.current
            : clock
        const elapsed = Math.floor((alignedNow - startedAtMs) / 1000)
        return Math.max(0, Number(rapidFireTimer.durationSeconds) - elapsed)
      }
    }
    return Math.max(0, localFallbackSeconds)
  }, [clock, hasServerTimer, localFallbackSeconds, rapidFireTimer, serverTimestampMs])

  const isRunning = phase === 'running' && isQuestionActive && remainingSeconds > 0

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setDurationSeconds(Number(round?.rapid_fire_duration_seconds || 45))
      setPhase('idle')
      setPreviewQuestion(null)
      setLocalFallbackSeconds(0)
      timeoutHandledRef.current = false
    }, 0)
    return () => window.clearTimeout(resetId)
  }, [round?.id, round?.rapid_fire_duration_seconds])

  useEffect(() => {
    if (phase === 'running' && !isQuestionActive) {
      const resetId = window.setTimeout(() => {
        setPhase('idle')
        setPreviewQuestion(null)
        setLocalFallbackSeconds(0)
        timeoutHandledRef.current = false
      }, 0)
      return () => window.clearTimeout(resetId)
    }
  }, [phase, isQuestionActive])

  useEffect(() => {
    if (!isRunning) return
    const tick = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [isRunning])

  useEffect(() => {
    if (phase !== 'running' || hasServerTimer) return
    const timer = setInterval(() => {
      setLocalFallbackSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          timeoutHandledRef.current = true
          setPhase('idle')
          void onEndTurn()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, hasServerTimer, onEndTurn])

  useEffect(() => {
    if (phase !== 'running' || remainingSeconds > 0 || timeoutHandledRef.current) return
    timeoutHandledRef.current = true
    const resetId = window.setTimeout(() => {
      setPhase('idle')
    }, 0)
    void onEndTurn()
    return () => window.clearTimeout(resetId)
  }, [phase, remainingSeconds, onEndTurn])

  const formattedTime = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60)
    const secs = remainingSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [remainingSeconds])

  const handleLoadQuestion = async () => {
    const result = await onPrepareRapidFire(selectedTeam)
    const preparedQuestion = result?.question ?? null
    if (!preparedQuestion) return
    setPreviewQuestion(preparedQuestion)
    setPhase('preview')
  }

  const handleStart = async () => {
    const started = await onStartRapidFire(selectedTeam, durationSeconds)
    if (!started) return
    setPhase('running')
    setClock(Date.now())
    setLocalFallbackSeconds(durationSeconds)
    timeoutHandledRef.current = false
  }

  const teamLabelText =
    teamDisplayNames?.[activeTeam] && teamDisplayNames[activeTeam] !== 'Unassigned'
      ? `${teamDisplayNames[activeTeam]} (${activeTeam})`
      : `Team ${activeTeam}`
  const displayQuestion = phase === 'preview' ? previewQuestion : question || previewQuestion

  const activeQuestionId =
    phase === 'preview' ? (previewQuestion?.id as string | undefined) : (event?.question_id as string | undefined)

  const showProminentTurnSummary =
    turnSummary != null &&
    (rapidFireTurnComplete || (phase !== 'idle' && remainingSeconds <= 0))

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TeamBadge label={activeTeam} text="Rapid Fire turn" />
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-right">
          <p className="text-xs text-gray-500">Timer</p>
          <p className="text-2xl font-bold tracking-wide text-gray-900">{formattedTime}</p>
        </div>
      </div>

      {rapidFireQuestionBank && rapidFireQuestionBank.length > 0 ? (
        <details open className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
          <summary className="cursor-pointer select-none text-sm font-semibold text-slate-800">
            Question bank ({rapidFireQuestionBank.length}) — compact
          </summary>
          <div className="mt-2 max-h-[min(42vh,26rem)] space-y-2 overflow-y-auto pr-1">
            {rapidFireQuestionBank.map((q: any, idx: number) => {
              const rowId = String(q?.id || `row-${idx}`)
              const isCurrent = Boolean(activeQuestionId && rowId === String(activeQuestionId))
              const stem = localizedText(
                questionLanguage,
                q.question_text,
                q.question_text_odia,
              )
              const correct = correctMcqLetter(q.correct_answer)
              const picked =
                isCurrent &&
                participantResponse?.answer_option_label &&
                ['A', 'B', 'C', 'D'].includes(String(participantResponse.answer_option_label))
                  ? (String(participantResponse.answer_option_label).toUpperCase() as 'A' | 'B' | 'C' | 'D')
                  : null
              return (
                <div
                  key={rowId}
                  className={`rounded-lg border px-2 py-2 ${
                    isCurrent ? 'border-orange-400 bg-orange-50/60 ring-1 ring-orange-300' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Q{q.question_order ?? '—'}</span>
                    <p className="min-w-0 flex-1 text-sm text-slate-900" title={stem}>
                      {truncate(stem, 140)}
                    </p>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
                    {MCQ.map((letter) => {
                      const en = q[`option_${letter.toLowerCase()}`] as string | undefined
                      const od = q[`option_${letter.toLowerCase()}_odia`] as string | undefined
                      const text = truncate(localizedText(questionLanguage, en, od), 52)
                      const isCorrect = correct === letter
                      const isPicked = picked === letter
                      let cellClass = 'border border-slate-200 bg-slate-50/80 px-1.5 py-1 text-left'
                      if (isCorrect && isPicked) {
                        cellClass =
                          'border border-emerald-500 bg-emerald-100 px-1.5 py-1 text-left ring-1 ring-emerald-600'
                      } else if (isCorrect) {
                        cellClass = 'border border-emerald-400 bg-emerald-50 px-1.5 py-1 text-left'
                      } else if (isPicked) {
                        cellClass = 'border border-amber-400 bg-amber-50 px-1.5 py-1 text-left ring-1 ring-amber-500'
                      }
                      return (
                        <div key={letter} className={cellClass} title={localizedText(questionLanguage, en, od)}>
                          <span className="text-[10px] font-bold text-slate-600">{letter}</span>
                          <p className="text-[11px] leading-snug text-slate-800">{text || '—'}</p>
                        </div>
                      )
                    })}
                  </div>
                  {isCurrent && picked ? (
                    <p className="mt-1 text-[11px] font-medium text-slate-700">
                      Participant picked <span className="font-bold text-amber-800">{picked}</span>
                      {correct ? (
                        <>
                          {' '}
                          · Correct <span className="font-bold text-emerald-800">{correct}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {showProminentTurnSummary ? (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-4 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Rapid Fire — turn complete</p>
          <p className="mt-2 text-lg font-semibold text-emerald-950">
            Correct: <span className="tabular-nums">{turnSummary.correct}</span> · Incorrect:{' '}
            <span className="tabular-nums">{turnSummary.incorrect}</span>
          </p>
        </div>
      ) : null}

      {phase === 'idle' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Choose team for this rapid fire turn</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['A', 'B', 'C', 'D'] as TeamLabel[]).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelectTeam(label)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  selectedTeam === label
                    ? 'border-[#C0392B] bg-[#C0392B]/10 text-[#C0392B]'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {teamDisplayNames?.[label] && teamDisplayNames[label] !== 'Unassigned'
                  ? `${teamDisplayNames[label]} (${label})`
                  : `Team ${label}`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="rapid-duration" className="text-sm text-gray-600">
              Duration (seconds)
            </label>
            <input
              id="rapid-duration"
              type="number"
              min={30}
              max={60}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Math.min(60, Math.max(30, Number(e.target.value || 45))))}
              className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C0392B] focus:outline-none focus:ring-2 focus:ring-[#C0392B]/30 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <Button onClick={handleLoadQuestion} isLoading={busy}>
            Load Question
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm text-gray-600">
              {phase === 'preview' ? `${teamLabelText} question preview` : `${teamLabelText} is answering`}
            </p>
            <QuestionDisplay
              question={displayQuestion}
              showOptions
              readOnly
              revealCorrectAnswer
              language={questionLanguage}
            />
          </div>
          {phase === 'preview' ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStart} isLoading={busy}>
                Start Rapid Fire
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('idle')
                  setPreviewQuestion(null)
                  timeoutHandledRef.current = false
                }}
                isLoading={busy}
              >
                Back
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                {participantResponse?.answer_option_label ? (
                  <>
                    <p>
                      Participant response:{' '}
                      <span className="font-semibold">{participantResponse.answer_option_label}</span>
                      {participantResponse.answer_option_text ? ` — ${participantResponse.answer_option_text}` : ''}
                    </p>
                    <p className="mt-1">
                      Auto-grade:{' '}
                      <span className="font-semibold">
                        {participantResponse.verdict === 'correct'
                          ? 'Correct'
                          : participantResponse.verdict === 'wrong'
                            ? 'Wrong'
                            : 'Awaiting submission'}
                      </span>
                    </p>
                  </>
                ) : (
                  <p>Waiting for participant answer submission...</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase('idle')
                    setPreviewQuestion(null)
                    setLocalFallbackSeconds(0)
                    timeoutHandledRef.current = false
                    onEndTurn()
                  }}
                  isLoading={busy}
                >
                  End Turn Early
                </Button>
              </div>
            </>
          )}
        </>
      )}
      {turnSummary && !showProminentTurnSummary ? (
        <p className="text-sm text-gray-600">
          Live tally — Correct: {turnSummary.correct}, Incorrect: {turnSummary.incorrect}
        </p>
      ) : null}
    </section>
  )
}
