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
  } | null
  showOptions: boolean
  readOnly?: boolean
  selectedTrueFalse?: 'TRUE' | 'FALSE' | null
  onTrueFalseSelect?: (value: 'TRUE' | 'FALSE') => void
}

export function QuestionDisplay({
  question,
  showOptions,
  readOnly = true,
  selectedTrueFalse = null,
  onTrueFalseSelect,
}: QuestionDisplayProps) {
  if (!question) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        No active question.
      </div>
    )
  }

  if (!showOptions) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <FormattedQuestionText text={question.question_text} />
      </div>
    )
  }

  if (question.question_type === 'true_false') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <FormattedQuestionText text={question.question_text} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onTrueFalseSelect?.('TRUE')}
            className={`rounded-lg border p-4 text-center font-semibold transition-colors ${
              selectedTrueFalse === 'TRUE'
                ? 'border-green-600 bg-green-50 text-green-700'
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
                : 'border-gray-200 bg-white text-gray-800'
            } ${readOnly ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-50'}`}
          >
            FALSE
          </button>
        </div>
      </div>
    )
  }

  return (
    <MCQQuestion
      question={{
        id: question.id,
        question_text: question.question_text,
        option_a: question.option_a || '',
        option_b: question.option_b || '',
        option_c: question.option_c || '',
        option_d: question.option_d || '',
        correct_answer: 'A',
        points: 1,
      }}
      selectedAnswer={null}
      onAnswerSelect={() => {}}
      showCorrectAnswer={false}
      disabled={readOnly}
    />
  )
}

