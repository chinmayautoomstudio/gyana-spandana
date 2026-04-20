'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/quiz/TeamBadge'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface RapidFireControlsProps {
  round: any | null
  question: any | null
  event: any | null
  busy?: boolean
  selectedTeam: TeamLabel
  onSelectTeam: (label: TeamLabel) => void
  onPrepareRapidFire: (teamLabel: TeamLabel) => Promise<{ question: any } | null>
  onStartRapidFire: (teamLabel: TeamLabel, durationSeconds: number) => Promise<any>
  onCorrect: () => void
  onWrong: () => void
  onEndTurn: () => void
  teamDisplayNames?: Record<TeamLabel, string>
  questionLanguage?: 'en' | 'odia'
  rapidFireTimer?: { startedAt: string; durationSeconds: number } | null
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
  onCorrect,
  onWrong,
  onEndTurn,
  teamDisplayNames,
  questionLanguage = 'en',
  rapidFireTimer = null,
}: RapidFireControlsProps) {
  const [durationSeconds, setDurationSeconds] = useState<number>(Number(round?.rapid_fire_duration_seconds || 45))
  const [phase, setPhase] = useState<'idle' | 'preview' | 'running'>('idle')
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null)
  const [localFallbackSeconds, setLocalFallbackSeconds] = useState<number>(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [clock, setClock] = useState(() => Date.now())
  const timeoutHandledRef = useRef(false)

  const activeTeam = (event?.rapid_fire_team || selectedTeam) as TeamLabel
  const isQuestionActive = Boolean(event && ['revealed', 'options_revealed', 'buzzer_open'].includes(event.status))
  const hasServerTimer = Boolean(rapidFireTimer?.startedAt && rapidFireTimer?.durationSeconds != null)

  const remainingSeconds = useMemo(() => {
    if (hasServerTimer && rapidFireTimer) {
      const startedAtMs = new Date(rapidFireTimer.startedAt).getTime()
      if (Number.isFinite(startedAtMs)) {
        const elapsed = Math.floor((clock - startedAtMs) / 1000)
        return Math.max(0, Number(rapidFireTimer.durationSeconds) - elapsed)
      }
    }
    return Math.max(0, localFallbackSeconds)
  }, [clock, hasServerTimer, localFallbackSeconds, rapidFireTimer])

  const isRunning = phase === 'running' && isQuestionActive && remainingSeconds > 0

  useEffect(() => {
    setDurationSeconds(Number(round?.rapid_fire_duration_seconds || 45))
    setPhase('idle')
    setPreviewQuestion(null)
    setLocalFallbackSeconds(0)
    setCorrectCount(0)
    timeoutHandledRef.current = false
  }, [round?.id, round?.rapid_fire_duration_seconds])

  useEffect(() => {
    if (phase === 'running' && !isQuestionActive) {
      setPhase('idle')
      setPreviewQuestion(null)
      setLocalFallbackSeconds(0)
      timeoutHandledRef.current = false
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
    setPhase('idle')
    void onEndTurn()
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
    setCorrectCount(0)
    setLocalFallbackSeconds(durationSeconds)
    timeoutHandledRef.current = false
  }

  const handleCorrect = () => {
    setCorrectCount((prev) => prev + 1)
    onCorrect()
  }

  const handleWrong = () => {
    onWrong()
  }

  const teamLabelText = teamDisplayNames?.[activeTeam] && teamDisplayNames[activeTeam] !== 'Unassigned'
    ? `${teamDisplayNames[activeTeam]} (${activeTeam})`
    : `Team ${activeTeam}`
  const displayQuestion = phase === 'preview' ? previewQuestion : question || previewQuestion

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TeamBadge label={activeTeam} text="Rapid Fire turn" />
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-right">
          <p className="text-xs text-gray-500">Timer</p>
          <p className="text-2xl font-bold tracking-wide text-gray-900">{formattedTime}</p>
        </div>
      </div>

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
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCorrect} isLoading={busy} disabled={!isQuestionActive || remainingSeconds <= 0}>
                  Correct
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleWrong}
                  isLoading={busy}
                  disabled={!isQuestionActive || remainingSeconds <= 0}
                >
                  Wrong
                </Button>
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
              <p className="text-sm text-gray-600">Correct answers this turn: {correctCount}</p>
            </>
          )}
        </>
      )}
    </section>
  )
}
