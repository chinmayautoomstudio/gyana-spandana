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
}

export function QuestionDisplay({ question, showOptions, readOnly = true }: QuestionDisplayProps) {
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
          <div className="rounded-lg border border-gray-200 p-4 text-center font-semibold">TRUE</div>
          <div className="rounded-lg border border-gray-200 p-4 text-center font-semibold">FALSE</div>
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

