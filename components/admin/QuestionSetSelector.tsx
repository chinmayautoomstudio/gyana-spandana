'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface QuestionSet {
  id: string
  name: string
  description: string | null
  total_questions: number
}

interface QuestionSetSelectorProps {
  selectedSetId: string | null
  onSelectSet: (setId: string | null) => void
  onQuestionsLoaded: (questionIds: string[]) => void
}

export function QuestionSetSelector({
  selectedSetId,
  onSelectSet,
  onQuestionsLoaded,
}: QuestionSetSelectorProps) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestionSets()
  }, [])

  useEffect(() => {
    if (selectedSetId) {
      loadSetQuestions(selectedSetId)
    } else {
      onQuestionsLoaded([])
    }
  }, [selectedSetId])

  const fetchQuestionSets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/question-sets')
      if (response.ok) {
        const { questionSets } = await response.json()
        setQuestionSets(questionSets || [])
      }
    } catch (error) {
      console.error('Error fetching question sets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSetQuestions = async (setId: string) => {
    try {
      const response = await fetch(`/api/admin/question-sets/${setId}`)
      if (response.ok) {
        const { questions } = await response.json()
        const questionIds = questions.map((q: any) => q.question.id)
        onQuestionsLoaded(questionIds)
      }
    } catch (error) {
      console.error('Error loading set questions:', error)
    }
  }

  const selectedSet = questionSets.find((set) => set.id === selectedSetId)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Select Question Set (Optional)</label>
      <div className="flex items-center gap-2">
        <select
          value={selectedSetId || ''}
          onChange={(e) => onSelectSet(e.target.value || null)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
        >
          <option value="">-- Select a question set --</option>
          {questionSets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name} ({set.total_questions} questions)
            </option>
          ))}
        </select>
        {selectedSetId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelectSet(null)}
          >
            Clear
          </Button>
        )}
      </div>
      {selectedSet && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900">{selectedSet.name}</p>
          {selectedSet.description && (
            <p className="text-sm text-blue-700 mt-1">{selectedSet.description}</p>
          )}
          <p className="text-xs text-blue-600 mt-1">
            {selectedSet.total_questions} question{selectedSet.total_questions !== 1 ? 's' : ''} will be added
          </p>
        </div>
      )}
      {loading && questionSets.length === 0 && (
        <p className="text-sm text-gray-500">Loading question sets...</p>
      )}
      {!loading && questionSets.length === 0 && (
        <p className="text-sm text-gray-500">
          No question sets available. <a href="/admin/question-sets" className="text-[#C0392B] hover:underline">Create one</a>
        </p>
      )}
    </div>
  )
}

