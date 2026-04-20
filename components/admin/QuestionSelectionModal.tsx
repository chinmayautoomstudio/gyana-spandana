'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { QuestionSearch } from '@/components/admin/QuestionSearch'
import { type Question } from '@/components/admin/QuestionCard'

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

  const fetchQuestions = async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch all questions so question sets can include exam-linked items too.
    const { data, error } = await supabase
      .from('questions')
      .select('*')
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

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchQuestions()
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    filterQuestions()
  }, [questions, searchTerm, selectedDifficulty, selectedCategory, minPoints, maxPoints])

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
    const visibleIds = filteredQuestions.map((q) => q.id)
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedQuestions.has(id))
    if (allVisibleSelected) {
      setSelectedQuestions((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedQuestions((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedQuestions))
    onClose()
  }

  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean) as string[]))

  const allVisibleSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedQuestions.has(q.id))

  if (!isOpen) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-dvh min-h-0 w-full flex-col items-center justify-center overflow-y-auto overscroll-contain p-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:p-3">
      {/* Background overlay */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Grid: main row minmax(0,1fr) gives a definite height so the list can scroll (nested flex-1 alone was ~content height) */}
      <div
        className="relative z-50 grid h-[calc(100dvh-1rem)] min-h-0 w-full max-w-screen-2xl max-h-[calc(100dvh-1rem)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg bg-white text-left shadow-xl sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-selection-modal-title"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-5 sm:px-6">
            {/* Header */}
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <div>
                <h3 id="question-selection-modal-title" className="text-lg font-medium text-gray-900">
                  Select Questions from Question Bank
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-3 shrink-0 space-y-4">
              <QuestionSearch value={searchTerm} onChange={setSearchTerm} />
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
                    >
                      <option value="">All Levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
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
                    <label className="mb-2 block text-sm font-medium text-gray-700">Min Points</label>
                    <input
                      type="number"
                      min="0"
                      value={minPoints}
                      onChange={(e) => setMinPoints(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Max Points</label>
                    <input
                      type="number"
                      min="0"
                      value={maxPoints}
                      onChange={(e) => setMaxPoints(parseInt(e.target.value) || 100)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
                    />
                  </div>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-[#C0392B] focus:ring-[#C0392B]"
                />
                <span className="text-sm text-gray-600">
                  Select All ({filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Scroll region: h-0 + flex-1 + min-h-0 gives a bounded height so the list scrolls inside the modal */}
            <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain overflow-x-hidden rounded-lg border border-gray-200 [scrollbar-gutter:stable]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C0392B]"></div>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">
                    {questions.length === 0
                      ? 'No questions available. Add questions first.'
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
                        className={`p-4 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectQuestion(question.id, e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#C0392B] focus:ring-[#C0392B]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-start gap-2">
                              <span className="w-6 flex-shrink-0 text-sm font-medium text-gray-500">
                                {index + 1}.
                              </span>
                              <p className="flex-1 text-sm font-medium text-gray-900">{question.question_text}</p>
                            </div>
                            <div className="ml-8 flex items-center gap-2 text-xs text-gray-500">
                              {question.difficulty_level && (
                                <span className="rounded bg-gray-100 px-2 py-0.5">{question.difficulty_level}</span>
                              )}
                              {question.category && (
                                <span className="rounded bg-gray-100 px-2 py-0.5">{question.category}</span>
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
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={selectedQuestions.size === 0}
              className="w-full sm:ml-3 sm:w-auto"
            >
              Confirm Selection ({selectedQuestions.size})
            </Button>
            <Button variant="outline" size="md" onClick={onClose} className="mt-3 w-full sm:mt-0 sm:w-auto">
              Cancel
            </Button>
          </div>
      </div>
    </div>,
    document.body
  )
}

