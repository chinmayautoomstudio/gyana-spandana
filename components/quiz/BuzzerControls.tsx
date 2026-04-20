'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { BuzzQueue } from '@/components/quiz/BuzzQueue'
import { buzzerWrongPenaltyPoints } from '@/lib/services/scoringService'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface BuzzerControlsProps {
  question: any | null
  event: any | null
  pendingBuzzerAnswer?: {
    team_label: string
    answer_text: string
    answer_option_label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    answer_option_text: string | null
  } | null
  checkedResponseResult?: {
    verdict: 'correct' | 'wrong'
    correctAnswerLabel: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null
    correctAnswerText: string | null
  } | null
  buzzEvents: Array<{
    id: string
    team_label: TeamLabel
    buzz_order: number | null
    buzzed_at?: string | null
    client_pressed_at_ms?: number | null
  }>
  busy?: boolean
  onNextQuestion: () => void
  onOpenBuzzer: () => void
  onCheckResponse: () => void
  onMarkCorrect: () => void
  onMarkWrong: () => void
  onSkip: () => void
  questionLanguage?: 'en' | 'odia'
  /** Session full points (for wrong-answer penalty hint). */
  pointsFull?: number
  /** When the buzzer answer period expires, host auto-applies timeout (once per question). */
  onBuzzerTimeout?: () => void | Promise<void>
}

export function BuzzerControls({
  question,
  event,
  pendingBuzzerAnswer = null,
  checkedResponseResult = null,
  buzzEvents,
  busy = false,
  onNextQuestion,
  onOpenBuzzer,
  onCheckResponse,
  onMarkCorrect,
  onMarkWrong,
  onSkip,
  questionLanguage = 'en',
  pointsFull = 10,
  onBuzzerTimeout,
}: BuzzerControlsProps) {
  const pickText = (
    english: string | null | undefined,
    odia: string | null | undefined,
  ) => {
    const en = String(english || '').trim()
    const od = String(odia || '').trim()
    return questionLanguage === 'odia' ? od || en : en || od
  }
  const optionTextByLabel = (label: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE' | null) => {
    if (!label || !question) return ''
    if (label === 'TRUE') return pickText('TRUE', question.option_a_odia)
    if (label === 'FALSE') return pickText('FALSE', question.option_b_odia)
    const key = `option_${label.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'
    const keyOdia =
      `option_${label.toLowerCase()}_odia` as
        | 'option_a_odia'
        | 'option_b_odia'
        | 'option_c_odia'
        | 'option_d_odia'
    return pickText(question[key], question[keyOdia])
  }
  const penaltyPreview = buzzerWrongPenaltyPoints(pointsFull)
  const deadlineIso = event?.buzzer_answer_deadline_at as string | undefined
  const [nowMs, setNowMs] = useState(() => Date.now())
  const timeoutFiredRef = useRef<string | null>(null)

  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'
  const isBuzzerOpen = event?.status === 'buzzer_open'

  useEffect(() => {
    timeoutFiredRef.current = null
  }, [event?.id])

  useEffect(() => {
    if (!isBuzzerOpen || !deadlineIso) return
    const id = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(id)
  }, [isBuzzerOpen, deadlineIso])

  useEffect(() => {
    if (!isBuzzerOpen || !deadlineIso || !onBuzzerTimeout || !event?.id) return
    const deadlineMs = new Date(deadlineIso).getTime()
    if (!Number.isFinite(deadlineMs)) return
    if (Date.now() < deadlineMs) return
    if (timeoutFiredRef.current === event.id) return
    timeoutFiredRef.current = event.id
    void onBuzzerTimeout()
  }, [isBuzzerOpen, deadlineIso, event?.id, onBuzzerTimeout, nowMs])

  const secondsLeft =
    deadlineIso && Number.isFinite(new Date(deadlineIso).getTime())
      ? Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - nowMs) / 1000))
      : null
  const activeTeam = buzzEvents
    ?.slice()
    ?.sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))?.[0]?.team_label
  const firstResponder = activeTeam || null

  return (
    <section className="space-y-4">
      {isIdle ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          {checkedResponseResult ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                checkedResponseResult.verdict === 'correct'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-red-200 bg-red-50 text-red-950'
              }`}
            >
              <p className="font-semibold">
                Checked result: {checkedResponseResult.verdict === 'correct' ? 'Correct' : 'Wrong'}
              </p>
              {(checkedResponseResult.correctAnswerLabel || checkedResponseResult.correctAnswerText) && (
                <p className="mt-1 text-xs">
                  Official answer:{' '}
                  {checkedResponseResult.correctAnswerLabel ? (
                    <>
                      <span className="font-semibold">{checkedResponseResult.correctAnswerLabel}</span>
                      {optionTextByLabel(checkedResponseResult.correctAnswerLabel)
                        ? `) ${optionTextByLabel(checkedResponseResult.correctAnswerLabel)}`
                        : checkedResponseResult.correctAnswerText
                          ? `) ${checkedResponseResult.correctAnswerText}`
                          : ''}
                    </>
                  ) : (
                    <span>{checkedResponseResult.correctAnswerText || '(not set)'}</span>
                  )}
                </p>
              )}
            </div>
          ) : null}
          <p className="mb-3 text-sm text-gray-600">Buzzer round is ready for the next question.</p>
          <Button onClick={onNextQuestion} isLoading={busy}>
            Next Question
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <QuestionDisplay question={question} showOptions readOnly language={questionLanguage} />
            {!isBuzzerOpen ? (
              <Button onClick={onOpenBuzzer} isLoading={busy}>
                Open Buzzer
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                  BUZZER OPEN
                </div>
                {secondsLeft !== null ? (
                  <p className="text-sm text-gray-700">
                    Answer window: <span className="font-semibold tabular-nums">{secondsLeft}s</span> remaining
                    {activeTeam ? ` (Team ${activeTeam})` : ''}
                  </p>
                ) : null}
                <p className="text-xs text-gray-600">
                  Wrong answer or timeout: <span className="font-semibold">{penaltyPreview}</span> pts (50% of full
                  value). Question ends; no pass to next buzzer.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Buzz Queue</p>
            {firstResponder ? (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900">
                Team {firstResponder} buzzed first
              </div>
            ) : null}
            {activeTeam ? (
              pendingBuzzerAnswer?.team_label === activeTeam ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-semibold">
                    Team {activeTeam} selected{' '}
                    {pendingBuzzerAnswer.answer_option_label || pendingBuzzerAnswer.answer_text || 'an option'}
                  </p>
                  {optionTextByLabel(pendingBuzzerAnswer.answer_option_label) ? (
                    <p className="mt-1 text-xs text-amber-800">
                      {optionTextByLabel(pendingBuzzerAnswer.answer_option_label)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  Waiting for answer from Team {activeTeam}
                </div>
              )
            ) : null}
            {checkedResponseResult ? (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  checkedResponseResult.verdict === 'correct'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-red-200 bg-red-50 text-red-950'
                }`}
              >
                <p className="font-semibold">
                  Checked result: {checkedResponseResult.verdict === 'correct' ? 'Correct' : 'Wrong'}
                </p>
                {checkedResponseResult.correctAnswerLabel || checkedResponseResult.correctAnswerText ? (
                  <p className="mt-1 text-xs">
                    Official answer:{' '}
                    {checkedResponseResult.correctAnswerLabel ? (
                      <>
                        <span className="font-semibold">{checkedResponseResult.correctAnswerLabel}</span>
                        {optionTextByLabel(checkedResponseResult.correctAnswerLabel)
                          ? `) ${optionTextByLabel(checkedResponseResult.correctAnswerLabel)}`
                          : checkedResponseResult.correctAnswerText
                            ? `) ${checkedResponseResult.correctAnswerText}`
                            : ''}
                      </>
                    ) : (
                      <span>{checkedResponseResult.correctAnswerText || '(not set)'}</span>
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            <BuzzQueue items={buzzEvents} activeTeam={activeTeam || null} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onCheckResponse} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam}>
              Check Response
            </Button>
            <Button onClick={onMarkCorrect} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam}>
              Correct
            </Button>
            <Button variant="secondary" onClick={onMarkWrong} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam}>
              Wrong ({penaltyPreview} pts)
            </Button>
            <Button variant="ghost" onClick={onSkip} isLoading={busy}>
              Skip Question
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
