'use client'

import { useRef, useEffect } from 'react'
import { type Question } from './QuestionCard'

interface QuestionsTableProps {
  questions: Question[]
  selectedQuestions: Set<string>
  onSelectQuestion: (questionId: string, selected: boolean) => void
  onSelectAll: () => void
  onEdit: (question: Question) => void
  onDelete: (questionId: string) => void
  onPreview: (question: Question) => void
}

export function QuestionsTable({
  questions,
  selectedQuestions,
  onSelectQuestion,
  onSelectAll,
  onEdit,
  onDelete,
  onPreview,
}: QuestionsTableProps) {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    hard: 'bg-red-100 text-red-800 border-red-200',
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const allSelected = questions.length > 0 && selectedQuestions.size === questions.length
  const someSelected = selectedQuestions.size > 0 && selectedQuestions.size < questions.length
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  ref={checkboxRef}
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No questions found
                </td>
              </tr>
            ) : (
              questions.map((question, index) => {
                const difficultyLabel = question.difficulty_level || 'medium'
                const isSelected = selectedQuestions.has(question.id)

                return (
                  <tr
                    key={question.id}
                    className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectQuestion(question.id, e.target.checked)}
                        className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                      />
                    </td>

                    {/* Question */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {index + 1}. {truncateText(question.question_text)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          MCQ
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {question.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {question.category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    {/* Difficulty */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          difficultyColors[difficultyLabel]
                        }`}
                      >
                        {difficultyLabel.charAt(0).toUpperCase() + difficultyLabel.slice(1)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Approved
                      </span>
                    </td>

                    {/* Creator */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      Admin
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {question.points}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPreview(question)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onEdit(question)}
                          className="p-1.5 text-[#C0392B] hover:bg-[#C0392B]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              onDelete(question.id)
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

