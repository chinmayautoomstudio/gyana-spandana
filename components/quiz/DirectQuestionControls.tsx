'use client'

import { useMemo, useState } from 'react'
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
  onCheckResponse: () => void
  onPassDirect: () => void
  onRevealCorrectAnswer: () => void
  busy?: boolean
  selectableTeams?: TeamLabel[]
  roundType?: string | null
  activeRoundQuestions?: ActiveRoundQuestionOption[] | null
  teamDisplayNames?: Record<TeamLabel, string>
  pendingDirectAnswer?: {
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
  onCheckResponse,
  onPassDirect,
  onRevealCorrectAnswer,
  busy = false,
  selectableTeams = ['A', 'B', 'C', 'D'],
  roundType = null,
  activeRoundQuestions = null,
  teamDisplayNames,
  pendingDirectAnswer = null,
  checkedResponseResult = null,
}: DirectQuestionControlsProps) {
  const isDirectRound = roundType === 'direct_question'
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')
  const effectiveSelectedQuestionId = useMemo(() => {
    const list = activeRoundQuestions || []
    if (list.length === 0) return ''
    if (selectedQuestionId && list.some((q) => q.id === selectedQuestionId)) return selectedQuestionId
    return list[0].id
  }, [activeRoundQuestions, selectedQuestionId])

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
          {event?.status === 'answered' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
              <p className="font-semibold">
                Answer marked correct for Team {event.answered_by_team || directedTeam}
                {Number(event.points_awarded || 0) > 0 ? ` (+${Number(event.points_awarded)} points)` : ''}.
              </p>
              <p className="mt-1 text-emerald-900">Ready to proceed to the next question.</p>
            </div>
          ) : null}
          {event?.status === 'dropped' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">Question closed without points.</p>
              <p className="mt-1 text-amber-900">Proceed to the next question.</p>
            </div>
          ) : null}
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
                  Next Question
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
            showOptions={Boolean(isAdjudicating) || (showLegacyMcq && showOptions)}
            readOnly
            revealCorrectAnswer={revealCorrect}
          />

          {isAdjudicating ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-950">Direct question — check response</p>
                {pendingDirectAnswer ? (
                  <>
                    <div className="rounded-lg border border-amber-300 bg-white p-3 text-sm">
                      <p className="font-medium text-gray-800">
                        Team {pendingDirectAnswer.team_label} answer
                      </p>
                      {pendingDirectAnswer.answer_option_label ? (
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                          Selected option: <span className="font-semibold">{pendingDirectAnswer.answer_option_label}</span>
                          {pendingDirectAnswer.answer_option_text
                            ? `) ${pendingDirectAnswer.answer_option_text}`
                            : ''}
                        </p>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                          {pendingDirectAnswer.answer_text || '(empty)'}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={onCheckResponse} isLoading={busy} disabled={!pendingDirectAnswer}>
                        Check Response
                      </Button>
                      <Button onClick={onJudgeCorrect} isLoading={busy}>
                        Check: Correct
                      </Button>
                      <Button variant="secondary" onClick={onJudgeWrong} isLoading={busy}>
                        Check: Wrong
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-amber-900">Waiting for the team to submit an answer…</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Round controls</p>
                {checkedResponseResult ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950">
                    <p className="font-semibold">
                      Checked result: {checkedResponseResult.verdict === 'correct' ? 'Correct' : 'Wrong'}
                    </p>
                    <p className="mt-1">
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
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={onPassDirect} isLoading={busy}>
                    Pass to next team
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRevealCorrectAnswer}
                    isLoading={busy}
                    disabled={Boolean(pendingDirectAnswer)}
                  >
                    Reveal correct answer
                  </Button>
                  <Button variant="ghost" onClick={onSkip} isLoading={busy}>
                    Skip question
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  Check the pending response first, then use Pass/Reveal/Skip. Reveal is only after every team has
                  been marked wrong.
                </p>
              </div>
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
