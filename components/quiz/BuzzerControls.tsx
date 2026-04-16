'use client'

import { Button } from '@/components/ui/Button'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import { BuzzQueue } from '@/components/quiz/BuzzQueue'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface BuzzerControlsProps {
  question: any | null
  event: any | null
  buzzEvents: Array<{
    id: string
    team_label: TeamLabel
    buzz_order: number | null
    buzzed_at?: string | null
  }>
  busy?: boolean
  onNextQuestion: () => void
  onOpenBuzzer: () => void
  onMarkCorrect: () => void
  onMarkWrong: () => void
  onSkip: () => void
}

export function BuzzerControls({
  question,
  event,
  buzzEvents,
  busy = false,
  onNextQuestion,
  onOpenBuzzer,
  onMarkCorrect,
  onMarkWrong,
  onSkip,
}: BuzzerControlsProps) {
  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'
  const isBuzzerOpen = event?.status === 'buzzer_open'
  const activeTeam = buzzEvents
    ?.slice()
    ?.sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))?.[0]?.team_label

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
            <BuzzQueue items={buzzEvents} activeTeam={activeTeam || null} />
          </div>

          <div className="flex flex-wrap gap-2">
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
