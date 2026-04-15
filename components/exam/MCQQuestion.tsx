'use client'

import React from 'react'
import { FormattedQuestionText } from './FormattedQuestionText'

interface MCQOption {
  option: 'A' | 'B' | 'C' | 'D'
  text: string
}

export type ExamQuestionLanguage = 'en' | 'od'

interface MCQQuestionProps {
  question: {
    id: string
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    points: number
    /** Legacy / alternate name for explanation text */
    answer_explanation?: string | null
    explanation?: string | null
    question_text_odia?: string | null
    option_a_odia?: string | null
    option_b_odia?: string | null
    option_c_odia?: string | null
    option_d_odia?: string | null
    explanation_odia?: string | null
  }
  /** When `od`, uses Odia fields with fallback to English if a field is missing. */
  language?: ExamQuestionLanguage
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null
  onAnswerSelect: (option: 'A' | 'B' | 'C' | 'D') => void
  disabled?: boolean
  showCorrectAnswer?: boolean
}

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  language = 'en',
  selectedAnswer,
  onAnswerSelect,
  disabled = false,
  showCorrectAnswer = false
}) => {
  const handleOptionSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (!disabled) {
      onAnswerSelect(option)
    }
  }

  const pick = (en: string, od: string | null | undefined) => {
    if (language !== 'od') return en
    const t = od != null && String(od).trim() !== '' ? String(od) : en
    return t
  }

  const stem = pick(question.question_text, question.question_text_odia)
  const baseExpl = question.answer_explanation ?? question.explanation ?? null
  const expl =
    language === 'od'
      ? pick(baseExpl ?? '', question.explanation_odia)
      : baseExpl

  // Convert question options to array format
  const mcqOptions: MCQOption[] = [
    { option: 'A', text: pick(question.option_a, question.option_a_odia) },
    { option: 'B', text: pick(question.option_b, question.option_b_odia) },
    { option: 'C', text: pick(question.option_c, question.option_c_odia) },
    { option: 'D', text: pick(question.option_d, question.option_d_odia) },
  ]

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-2 font-medium bg-gray-100 inline-block px-3 py-1 rounded-full">
            {question.points} point{question.points !== 1 ? 's' : ''}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            <FormattedQuestionText text={stem} />
          </h2>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {mcqOptions.map((option) => {
          const isSelected = selectedAnswer === option.option
          const isCorrect = question.correct_answer === option.option
          const shouldShowCorrect = showCorrectAnswer && isCorrect

          return (
            <button
              key={option.option}
              onClick={() => handleOptionSelect(option.option)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${shouldShowCorrect
                  ? 'bg-green-50 border-green-500 text-green-900'
                  : isSelected
                    ? 'bg-[#C0392B]/10 border-[#C0392B] text-[#C0392B]'
                    : 'bg-white border-gray-200 hover:border-[#E67E22] text-gray-900'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                {/* Option indicator */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${shouldShowCorrect
                    ? 'bg-green-500 text-white'
                    : isSelected
                      ? 'bg-[#C0392B] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                  {option.option}
                </div>

                {/* Option content */}
                <span className="flex-1">{option.text}</span>

                {/* Selection indicator */}
                {isSelected && !shouldShowCorrect && (
                  <svg className="w-5 h-5 text-[#C0392B]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}

                {/* Correct answer indicator */}
                {shouldShowCorrect && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Answer explanation (show when disabled and answer is selected) */}
      {disabled && selectedAnswer && expl && String(expl).trim() !== '' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
          <p className="text-sm text-blue-800">{expl}</p>
        </div>
      )}
    </div>
  )
}

export default MCQQuestion
