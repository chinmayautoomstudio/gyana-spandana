'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface Question {
  id: string
  exam_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  points: number
  explanation: string | null
  order_index: number | null
  category?: string | null
  difficulty_level?: 'easy' | 'medium' | 'hard' | null
  tags?: string[] | null
  created_at?: string
  exam?: {
    id: string
    title: string
  } | null
}

interface QuestionCardProps {
  question: Question
  index?: number
  showExam?: boolean
  onEdit?: (question: Question) => void
  onDelete?: (questionId: string) => void
  onPreview?: (question: Question) => void
  onDuplicate?: (question: Question) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (questionId: string, selected: boolean) => void
  compact?: boolean
}

export function QuestionCard({
  question,
  index,
  showExam = false,
  onEdit,
  onDelete,
  onPreview,
  onDuplicate,
  selectable = false,
  selected = false,
  onSelect,
  compact = false,
}: QuestionCardProps) {
  const [showFullExplanation, setShowFullExplanation] = useState(false)

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    hard: 'bg-red-100 text-red-800 border-red-200',
  }

  const difficultyLabel = question.difficulty_level || 'medium'

  return (
    <div
      className={`bg-white/70 backdrop-blur-xl rounded-xl border ${
        selected ? 'border-[#C0392B] shadow-lg' : 'border-white/20'
      } shadow-lg hover:shadow-xl transition-all ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(question.id, e.target.checked)}
              className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
            />
          )}
          {index !== undefined && (
            <span className="w-8 h-8 bg-[#C0392B]/10 text-[#C0392B] rounded-lg flex items-center justify-center font-bold flex-shrink-0">
              {index + 1}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-2">
              <h3 className={`font-semibold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
                {question.question_text}
              </h3>
              {question.difficulty_level && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${difficultyColors[difficultyLabel]}`}
                >
                  {difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1)}
                </span>
              )}
            </div>
            {showExam && question.exam && (
              <Link
                href={`/admin/exams/${question.exam.id}`}
                className="text-sm text-[#C0392B] hover:text-[#A93226] inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                {question.exam.title}
              </Link>
            )}
            {question.category && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">
                {question.category}
              </span>
            )}
            {question.tags && Array.isArray(question.tags) && question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {question.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          {onPreview && (
            <button
              onClick={() => onPreview(question)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(question)}
              className="p-2 text-[#C0392B] hover:bg-[#C0392B]/10 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(question)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Duplicate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this question?')) {
                  onDelete(question.id)
                }
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-3 mb-4`}>
        {['A', 'B', 'C', 'D'].map((option) => {
          const optionKey = `option_${option.toLowerCase()}` as keyof Question
          const optionText = question[optionKey] as string
          const isCorrect = question.correct_answer === option

          return (
            <div
              key={option}
              className={`p-3 rounded-lg border ${
                isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-700">{option}.</span>
                {isCorrect && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Correct</span>
                )}
              </div>
              <p className={`text-gray-900 ${compact ? 'text-sm' : ''}`}>{optionText}</p>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Points: <strong>{question.points}</strong>
          </span>
          {question.explanation && (
            <button
              onClick={() => setShowFullExplanation(!showFullExplanation)}
              className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={showFullExplanation ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                />
              </svg>
              Explanation
            </button>
          )}
        </div>
      </div>

      {showFullExplanation && question.explanation && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

