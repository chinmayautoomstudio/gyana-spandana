'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/quiz/TeamBadge'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import type { TeamLabel } from '@/lib/utils/teamColors'

export type ActiveRoundQuestionOption = {
  id: string
  question_order: number
  question_type: string | null
  preview: string
}

interface DirectQuestionControlsProps {
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
  onJudgeCorrect: () => void
  onJudgeWrong: () => void
  onPassDirect: () => void
  onRevealCorrectAnswer: () => void
  busy?: boolean
  selectableTeams?: TeamLabel[]
  roundType?: string | null
  activeRoundQuestions?: ActiveRoundQuestionOption[] | null
  teamDisplayNames?: Record<TeamLabel, string>
  pendingDirectAnswer?: { team_label: string; answer_text: string } | null
}

export function DirectQuestionControls({
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
  onJudgeCorrect,
  onJudgeWrong,
  onPassDirect,
  onRevealCorrectAnswer,
  busy = false,
  selectableTeams = ['A', 'B', 'C', 'D'],
  roundType = null,
  activeRoundQuestions = null,
  teamDisplayNames,
  pendingDirectAnswer = null,
}: DirectQuestionControlsProps) {
  const isDirectRound = roundType === 'direct_question'
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')

  useEffect(() => {
    const list = activeRoundQuestions || []
    if (list.length === 0) {
      setSelectedQuestionId('')
      return
    }
    setSelectedQuestionId((prev) => {
      if (prev && list.some((q) => q.id === prev)) return prev
      return list[0].id
    })
  }, [activeRoundQuestions])

  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'

  const showOptions = event?.status === 'options_revealed'
  const directedTeam = (event?.directed_team || selectedTeam) as TeamLabel
  const teamChoices = selectableTeams.length > 0 ? selectableTeams : (['A', 'B', 'C', 'D'] as TeamLabel[])

  const revealCorrect = Boolean(event?.correct_answer_revealed_at)

  const isAdjudicating =
    isDirectRound &&
    event &&
    event.status === 'revealed' &&
    !revealCorrect

  const showLegacyMcq =
    event &&
    !isAdjudicating &&
    (!isDirectRound || showOptions)

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
          text={
            showOptions
              ? '2nd attempt - Half marks'
              : event?.status === 'revealed'
                ? isDirectRound
                  ? 'Direct question — host judges answers'
                  : '1st attempt - Full marks'
                : 'Next question target'
          }
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
              <label htmlFor="host-question-pick" className="text-sm font-medium text-gray-700">
                Select question
              </label>
              <select
                id="host-question-pick"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedQuestionId}
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
                  onClick={() => onNextQuestion(selectedQuestionId || undefined)}
                  isLoading={busy}
                  disabled={!selectedQuestionId}
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
          <QuestionDisplay
            question={question}
            showOptions={showLegacyMcq && showOptions}
            readOnly
            revealCorrectAnswer={revealCorrect}
          />

          {isAdjudicating ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-950">Direct question — adjudication</p>
              {pendingDirectAnswer ? (
                <div className="rounded-lg border border-amber-300 bg-white p-3 text-sm">
                  <p className="font-medium text-gray-800">
                    Team {pendingDirectAnswer.team_label} answer
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">
                    {pendingDirectAnswer.answer_text || '(empty)'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-amber-900">Waiting for the team to submit a written answer…</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={onJudgeCorrect} isLoading={busy} disabled={!pendingDirectAnswer}>
                  Correct (award points)
                </Button>
                <Button variant="secondary" onClick={onJudgeWrong} isLoading={busy} disabled={!pendingDirectAnswer}>
                  Wrong
                </Button>
                <Button variant="outline" onClick={onPassDirect} isLoading={busy}>
                  Pass to next team
                </Button>
                <Button variant="outline" onClick={onRevealCorrectAnswer} isLoading={busy}>
                  Reveal correct answer
                </Button>
                <Button variant="ghost" onClick={onSkip} isLoading={busy}>
                  Skip question
                </Button>
              </div>
              <p className="text-xs text-amber-900">
                Wrong does not show the answer. Use Pass after Wrong to move to the next team (half marks on a
                later correct answer). Reveal is only after every team has been marked wrong.
              </p>
            </div>
          ) : showLegacyMcq ? (
            <div className="flex flex-wrap gap-2">
              {!showOptions && (
                <Button variant="outline" onClick={onRevealOptions} isLoading={busy}>
                  Reveal Options
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
          ) : null}
        </>
      )}
    </section>
  )
}
