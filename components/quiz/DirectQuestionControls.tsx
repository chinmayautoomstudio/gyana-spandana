import { Button } from '@/components/ui/Button'
import { TeamBadge } from '@/components/quiz/TeamBadge'
import { QuestionDisplay } from '@/components/quiz/QuestionDisplay'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface DirectQuestionControlsProps {
  question: any | null
  event: any | null
  questionNumber: number
  totalQuestions: number
  selectedTeam: TeamLabel
  onSelectTeam: (label: TeamLabel) => void
  onNextQuestion: () => void
  onRevealOptions: () => void
  onMarkCorrect: () => void
  onMarkWrongPass: () => void
  onSkip: () => void
  busy?: boolean
  /** When set (e.g. test sessions with partial slots), only these labels are choosable for the next question. */
  selectableTeams?: TeamLabel[]
}

export function DirectQuestionControls({
  question,
  event,
  questionNumber,
  totalQuestions,
  selectedTeam,
  onSelectTeam,
  onNextQuestion,
  onRevealOptions,
  onMarkCorrect,
  onMarkWrongPass,
  onSkip,
  busy = false,
  selectableTeams = ['A', 'B', 'C', 'D'],
}: DirectQuestionControlsProps) {
  const isIdle = !event || event.status === 'answered' || event.status === 'dropped'
  const showOptions = event?.status === 'options_revealed'
  const directedTeam = (event?.directed_team || selectedTeam) as TeamLabel
  const teamChoices = selectableTeams.length > 0 ? selectableTeams : (['A', 'B', 'C', 'D'] as TeamLabel[])

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
                ? '1st attempt - Full marks'
                : 'Next question target'
          }
        />
      </div>

      {isIdle ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Choose directed team for first attempt</p>
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
                Team {label}
              </button>
            ))}
          </div>
          <Button onClick={onNextQuestion} isLoading={busy}>
            Next Question
          </Button>
        </div>
      ) : (
        <>
          <QuestionDisplay question={question} showOptions={showOptions} readOnly />
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
        </>
      )}
    </section>
  )
}

