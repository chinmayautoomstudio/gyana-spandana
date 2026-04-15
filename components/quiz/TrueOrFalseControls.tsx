'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/quiz/TeamBadge'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import type { TeamLabel } from '@/lib/utils/teamColors'
import type { ActiveRoundQuestionOption } from '@/components/quiz/DirectQuestionControls'

interface TrueOrFalseControlsProps {
  question: any | null
  event: any | null
  questionNumber: number
  totalQuestions: number
  selectedTeam: TeamLabel
  onSelectTeam: (label: TeamLabel) => void
  onNextQuestion: (questionId?: string) => void
  onNextSequential: () => void
  onRevealOptions: () => void
  onMarkCorrect: () => void
  onMarkWrongPass: () => void
  onSkip: () => void
  busy?: boolean
  selectableTeams?: TeamLabel[]
  activeRoundQuestions?: ActiveRoundQuestionOption[] | null
  teamDisplayNames?: Record<TeamLabel, string>
}

export function TrueOrFalseControls({
  question,
  event,
  questionNumber,
  totalQuestions,
  selectedTeam,
  onSelectTeam,
  onNextQuestion,
  onNextSequential,
  onRevealOptions,
  onMarkCorrect,
  onMarkWrongPass,
  onSkip,
  busy = false,
  selectableTeams = ['A', 'B', 'C', 'D'],
  activeRoundQuestions = null,
  teamDisplayNames,
}: TrueOrFalseControlsProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')
  const teamChoices = selectableTeams.length > 0 ? selectableTeams : (['A', 'B', 'C', 'D'] as TeamLabel[])
  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'
  const revealCorrect = Boolean(event?.correct_answer_revealed_at)
  const showOptions = event?.status === 'options_revealed'
  const directedTeam = (event?.directed_team || selectedTeam) as TeamLabel

  const effectiveSelectedQuestionId = useMemo(() => {
    const list = activeRoundQuestions || []
    if (list.length === 0) return ''
    if (selectedQuestionId && list.some((q) => q.id === selectedQuestionId)) return selectedQuestionId
    return list[0].id
  }, [activeRoundQuestions, selectedQuestionId])

  const teamButtonLabel = (label: TeamLabel) => {
    const name = teamDisplayNames?.[label]
    if (name && name !== 'Unassigned') return `${name} (${label})`
    return `Team ${label}`
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Question Progress</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.max(0, questionNumber)} / {Math.max(0, totalQuestions)}
          </p>
        </div>
        <TeamBadge
          label={directedTeam}
          text={showOptions ? 'Options open — Team turn active' : 'Directed team for this question'}
        />
      </div>

      {isIdle ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Choose directed team for the next question</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {teamChoices.map((label) => (
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
                {teamButtonLabel(label)}
              </button>
            ))}
          </div>

          {activeRoundQuestions && activeRoundQuestions.length > 0 ? (
            <div className="space-y-2">
              <label htmlFor="host-tf-question-pick" className="text-sm font-medium text-gray-700">
                Select question
              </label>
              <select
                id="host-tf-question-pick"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={effectiveSelectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
              >
                {activeRoundQuestions.map((q) => (
                  <option key={q.id} value={q.id}>
                    Q{q.question_order}
                    {q.question_type ? ` · ${q.question_type}` : ''} · {q.preview}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onNextQuestion(effectiveSelectedQuestionId || undefined)}
                  isLoading={busy}
                  disabled={!effectiveSelectedQuestionId}
                >
                  Ask selected question
                </Button>
                <Button variant="outline" onClick={() => onNextSequential()} isLoading={busy}>
                  Next in order
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => onNextSequential()} isLoading={busy}>
              Next Question
            </Button>
          )}
        </div>
      ) : (
        <>
          <QuestionDisplay question={question} showOptions={showOptions} readOnly revealCorrectAnswer={revealCorrect} />

          <div className="flex flex-wrap gap-2">
            {!showOptions && (
              <Button variant="outline" onClick={onRevealOptions} isLoading={busy}>
                Reveal True/False options
              </Button>
            )}
            <Button onClick={onMarkCorrect} isLoading={busy}>
              Correct
            </Button>
            <Button variant="secondary" onClick={onMarkWrongPass} isLoading={busy}>
              Wrong / Pass
            </Button>
            <Button variant="ghost" onClick={onSkip} isLoading={busy}>
              Skip
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
