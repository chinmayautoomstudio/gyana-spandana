'use client'

import { useEffect, useMemo, useState } from 'react'
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
  onStartRapidFire: (teamLabel: TeamLabel, durationSeconds: number) => void
  onCorrect: () => void
  onWrong: () => void
  onEndTurn: () => void
  teamDisplayNames?: Record<TeamLabel, string>
}

export function RapidFireControls({
  round,
  question,
  event,
  busy = false,
  selectedTeam,
  onSelectTeam,
  onStartRapidFire,
  onCorrect,
  onWrong,
  onEndTurn,
  teamDisplayNames,
}: RapidFireControlsProps) {
  const [durationSeconds, setDurationSeconds] = useState<number>(Number(round?.rapid_fire_duration_seconds || 45))
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  const activeTeam = (event?.rapid_fire_team || selectedTeam) as TeamLabel
  const isQuestionActive = Boolean(event && ['revealed', 'options_revealed', 'buzzer_open'].includes(event.status))
  const isRunning = hasStarted && isQuestionActive && remainingSeconds > 0

  useEffect(() => {
    setDurationSeconds(Number(round?.rapid_fire_duration_seconds || 45))
  }, [round?.id, round?.rapid_fire_duration_seconds])

  useEffect(() => {
    if (hasStarted && !isQuestionActive) {
      setHasStarted(false)
      setRemainingSeconds(0)
    }
  }, [hasStarted, isQuestionActive])

  useEffect(() => {
    if (!isRunning) return
    let endTriggered = false
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (!endTriggered) {
            endTriggered = true
            setHasStarted(false)
            void onEndTurn()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, onEndTurn])

  const formattedTime = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60)
    const secs = remainingSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [remainingSeconds])

  const handleStart = () => {
    setHasStarted(true)
    setRemainingSeconds(durationSeconds)
    setCorrectCount(0)
    onStartRapidFire(selectedTeam, durationSeconds)
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TeamBadge label={activeTeam} text="Rapid Fire turn" />
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-right">
          <p className="text-xs text-gray-500">Timer</p>
          <p className="text-2xl font-bold tracking-wide text-gray-900">{formattedTime}</p>
        </div>
      </div>

      {!hasStarted ? (
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
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <Button onClick={handleStart} isLoading={busy}>
            Start Rapid Fire
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm text-gray-600">{teamLabelText} is answering</p>
            <QuestionDisplay question={question} showOptions readOnly revealCorrectAnswer />
          </div>
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
                setHasStarted(false)
                setRemainingSeconds(0)
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
    </section>
  )
}
