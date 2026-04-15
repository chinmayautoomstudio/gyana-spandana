import { MCQQuestion } from '@/components/exam/MCQQuestion'
import { FormattedQuestionText } from '@/components/exam/FormattedQuestionText'

interface QuestionDisplayProps {
  question: {
    id: string
    question_text: string
    option_a?: string | null
    option_b?: string | null
    option_c?: string | null
    option_d?: string | null
    question_type?: string | null
    correct_answer?: string | null
  } | null
  showOptions: boolean
  readOnly?: boolean
  selectedTrueFalse?: 'TRUE' | 'FALSE' | null
  onTrueFalseSelect?: (value: 'TRUE' | 'FALSE') => void
  /** When true, show the official correct answer (after host reveal for direct rounds). */
  revealCorrectAnswer?: boolean
}

function formatCorrectAnswerLabel(
  questionType: string | null | undefined,
  correct: string | null | undefined,
  question: QuestionDisplayProps['question'],
): string {
  if (!correct || !question) return ''
  if (questionType === 'true_false') {
    return correct.toUpperCase() === 'TRUE' || correct === '1' ? 'TRUE' : 'FALSE'
  }
  const letter = correct.trim().toUpperCase().charAt(0)
  if (letter === 'A' || letter === 'B' || letter === 'C' || letter === 'D') {
    const key = `option_${letter.toLowerCase()}` as keyof typeof question
    const opt = question[key]
    if (typeof opt === 'string' && opt.trim()) return `${letter}) ${opt}`
    return letter
  }
  return correct
}

export function QuestionDisplay({
  question,
  showOptions,
  readOnly = true,
  selectedTrueFalse = null,
  onTrueFalseSelect,
  revealCorrectAnswer = false,
}: QuestionDisplayProps) {
  if (!question) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        Questions will be assigned soon.
      </div>
    )
  }

  if (!showOptions) {
    const highlight =
      revealCorrectAnswer && question.correct_answer
        ? formatCorrectAnswerLabel(question.question_type, question.correct_answer, question)
        : ''
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-900 space-y-4">
        <FormattedQuestionText text={question.question_text} />
        {highlight ? (
          <div className="rounded-lg border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            Correct answer: {highlight}
          </div>
        ) : null}
      </div>
    )
  }

  if (question.question_type === 'true_false') {
    const correctTf =
      revealCorrectAnswer && question.correct_answer
        ? question.correct_answer.toUpperCase() === 'TRUE' || question.correct_answer === '1'
          ? 'TRUE'
          : 'FALSE'
        : null
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-900 space-y-4">
        <FormattedQuestionText text={question.question_text} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onTrueFalseSelect?.('TRUE')}
            className={`rounded-lg border p-4 text-center font-semibold transition-colors ${
              selectedTrueFalse === 'TRUE'
                ? 'border-green-600 bg-green-50 text-green-700'
                : correctTf === 'TRUE' && revealCorrectAnswer
                  ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-500'
                  : 'border-gray-200 bg-white text-gray-800'
            } ${readOnly ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-50'}`}
          >
            TRUE
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onTrueFalseSelect?.('FALSE')}
            className={`rounded-lg border p-4 text-center font-semibold transition-colors ${
              selectedTrueFalse === 'FALSE'
                ? 'border-red-600 bg-red-50 text-red-700'
                : correctTf === 'FALSE' && revealCorrectAnswer
                  ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-500'
                  : 'border-gray-200 bg-white text-gray-800'
            } ${readOnly ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-50'}`}
          >
            FALSE
          </button>
        </div>
      </div>
    )
  }

  const mcqCorrect = (question.correct_answer || 'A').trim().toUpperCase().charAt(0) as
    | 'A'
    | 'B'
    | 'C'
    | 'D'

  return (
    <MCQQuestion
      question={{
        id: question.id,
        question_text: question.question_text,
        option_a: question.option_a || '',
        option_b: question.option_b || '',
        option_c: question.option_c || '',
        option_d: question.option_d || '',
        correct_answer: mcqCorrect,
        points: 1,
      }}
      selectedAnswer={null}
      onAnswerSelect={() => {}}
      showCorrectAnswer={revealCorrectAnswer}
      disabled={readOnly}
    />
  )
}

