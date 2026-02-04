'use client'

import React from 'react'

interface Question {
  id: string
  points: number
}

interface QuestionNavigatorProps {
  questions: Question[]
  currentQuestionIndex: number
  answeredQuestionIds: Set<string>
  onQuestionSelect: (index: number) => void
  disabled?: boolean
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentQuestionIndex,
  answeredQuestionIds,
  onQuestionSelect,
  disabled = false
}) => {
  const getQuestionStatus = (index: number, questionId: string) => {
    if (answeredQuestionIds.has(questionId)) {
      return 'answered'
    }
    if (index === currentQuestionIndex) {
      return 'current'
    }
    return 'unanswered'
  }

  const getQuestionStyle = (index: number, questionId: string) => {
    const status = getQuestionStatus(index, questionId)
    
    switch (status) {
      case 'answered':
        return 'bg-green-500/20 text-green-700 border border-green-300'
      case 'current':
        return 'bg-[#C0392B] text-white ring-2 ring-[#C0392B] ring-offset-2'
      default:
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }
  }

  const answeredCount = answeredQuestionIds.size
  const unansweredCount = questions.length - answeredCount

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Questions</h3>
        <div className="flex gap-2 text-xs">
          <span className="text-green-700">{answeredCount}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{unansweredCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-[#C0392B] h-1.5 rounded-full transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question grid */}
      <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 max-h-96 overflow-y-auto">
        {questions.map((question, index) => {
          const status = getQuestionStatus(index, question.id)
          const isCurrent = index === currentQuestionIndex
          
          return (
            <button
              key={question.id}
              onClick={() => !disabled && onQuestionSelect(index)}
              disabled={disabled}
              className={`
                w-10 h-10 rounded-lg font-medium transition-all text-sm
                ${getQuestionStyle(index, question.id)}
                ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                ${isCurrent ? 'ring-2 ring-[#C0392B] ring-offset-1' : ''}
              `}
              title={`Question ${index + 1}${status === 'answered' ? ' (Answered)' : ''}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-300"></div>
            <span className="text-gray-600">Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#C0392B]"></div>
            <span className="text-gray-600">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-100"></div>
            <span className="text-gray-600">Unanswered</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionNavigator
