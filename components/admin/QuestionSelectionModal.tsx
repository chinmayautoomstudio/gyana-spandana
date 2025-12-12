'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { QuestionSearch } from '@/components/admin/QuestionSearch'
import { type Question } from '@/components/admin/QuestionCard'
import { QuestionCard } from '@/components/admin/QuestionCard'

interface QuestionSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (questionIds: string[]) => void
  selectedQuestionIds?: string[]
}

export function QuestionSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedQuestionIds = [],
}: QuestionSelectionModalProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [minPoints, setMinPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(100)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(selectedQuestionIds)
  )

  useEffect(() => {
    if (isOpen) {
      fetchQuestions()
    } else {
      // Reset state when modal closes
      setSearchTerm('')
      setSelectedDifficulty('')
      setSelectedCategory('')
      setMinPoints(0)
      setMaxPoints(100)
      setSelectedQuestions(new Set(selectedQuestionIds))
    }
  }, [isOpen, selectedQuestionIds])

  useEffect(() => {
    filterQuestions()
  }, [questions, searchTerm, selectedDifficulty, selectedCategory, minPoints, maxPoints])

  const fetchQuestions = async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch only questions from question bank (exam_id is NULL)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .is('exam_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
    setLoading(false)
  }

  const filterQuestions = () => {
    let filtered = [...questions]

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.question_text.toLowerCase().includes(lowerSearch) ||
          q.option_a.toLowerCase().includes(lowerSearch) ||
          q.option_b.toLowerCase().includes(lowerSearch) ||
          q.option_c.toLowerCase().includes(lowerSearch) ||
          q.option_d.toLowerCase().includes(lowerSearch)
      )
    }

    // Difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter((q) => q.difficulty_level === selectedDifficulty)
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((q) => q.category === selectedCategory)
    }

    // Points range filter
    filtered = filtered.filter((q) => q.points >= minPoints && q.points <= maxPoints)

    setFilteredQuestions(filtered)
  }

  const handleSelectQuestion = (questionId: string, selected: boolean) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(questionId)
      } else {
        next.delete(questionId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map((q) => q.id)))
    }
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedQuestions))
    onClose()
  }

  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean) as string[]))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

        {/* Modal panel */}
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Select Questions from Question Bank</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-4">
              <QuestionSearch value={searchTerm} onChange={setSearchTerm} />
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
                    >
                      <option value="">All Levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Points</label>
                    <input
                      type="number"
                      min="0"
                      value={minPoints}
                      onChange={(e) => setMinPoints(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                    <input
                      type="number"
                      min="0"
                      value={maxPoints}
                      onChange={(e) => setMaxPoints(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <span className="text-sm text-gray-600">
                  Select All ({filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {questions.length === 0
                      ? 'No questions in question bank. Add questions first.'
                      : 'No questions match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredQuestions.map((question, index) => {
                    const isSelected = selectedQuestions.has(question.id)
                    return (
                      <div
                        key={question.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectQuestion(question.id, e.target.checked)}
                            className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-500 w-6 flex-shrink-0">
                                {index + 1}.
                              </span>
                              <p className="text-sm font-medium text-gray-900 flex-1">
                                {question.question_text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 ml-8">
                              {question.difficulty_level && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded">
                                  {question.difficulty_level}
                                </span>
                              )}
                              {question.category && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded">
                                  {question.category}
                                </span>
                              )}
                              <span className="text-gray-400">{question.points} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={selectedQuestions.size === 0}
              className="w-full sm:w-auto sm:ml-3"
            >
              Confirm Selection ({selectedQuestions.size})
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              className="w-full sm:w-auto mt-3 sm:mt-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

