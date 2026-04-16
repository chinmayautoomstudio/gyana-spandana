'use client'

import { Button } from '@/components/ui/Button'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { BuzzQueue } from '@/components/quiz/BuzzQueue'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface BuzzerControlsProps {
  question: any | null
  event: any | null
  pendingBuzzerAnswer?: {
    team_label: string
    answer_text: string
    answer_option_label: 'A' | 'B' | 'C' | 'D' | null
    answer_option_text: string | null
  } | null
  checkedResponseResult?: {
    verdict: 'correct' | 'wrong'
    correctAnswerLabel: 'A' | 'B' | 'C' | 'D' | null
    correctAnswerText: string | null
  } | null
  buzzEvents: Array<{
    id: string
    team_label: TeamLabel
    buzz_order: number | null
    buzzed_at?: string | null
  }>
  busy?: boolean
  onNextQuestion: () => void
  onOpenBuzzer: () => void
  onCheckResponse: () => void
  onMarkCorrect: () => void
  onMarkWrong: () => void
  onSkip: () => void
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
}: BuzzerControlsProps) {
  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'
  const isBuzzerOpen = event?.status === 'buzzer_open'
  const activeTeam = buzzEvents
    ?.slice()
    ?.sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))?.[0]?.team_label
  const firstResponder = activeTeam || null

  return (
    <section className="space-y-4">
      {isIdle ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm text-gray-600">Buzzer round is ready for the next question.</p>
          <Button onClick={onNextQuestion} isLoading={busy}>
            Next Question
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <QuestionDisplay question={question} showOptions readOnly />
            {!isBuzzerOpen ? (
              <Button onClick={onOpenBuzzer} isLoading={busy}>
                Open Buzzer
              </Button>
            ) : (
              <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                BUZZER OPEN
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
                  {pendingBuzzerAnswer.answer_option_text ? (
                    <p className="mt-1 text-xs text-amber-800">{pendingBuzzerAnswer.answer_option_text}</p>
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
                        {checkedResponseResult.correctAnswerText
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
            <Button onClick={onCheckResponse} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam || !pendingBuzzerAnswer}>
              Check Response
            </Button>
            <Button onClick={onMarkCorrect} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam}>
              Correct
            </Button>
            <Button variant="secondary" onClick={onMarkWrong} isLoading={busy} disabled={!isBuzzerOpen || !activeTeam}>
              Wrong / Next
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
