'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { QuestionSelectionModal } from './QuestionSelectionModal'

interface QuestionSet {
  id: string
  name: string
  description: string | null
  total_questions: number
}

interface QuestionSetFormProps {
  questionSet?: QuestionSet | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function QuestionSetForm({ questionSet, isOpen, onClose, onSuccess }: QuestionSetFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (questionSet) {
        setName(questionSet.name)
        setDescription(questionSet.description || '')
        // Fetch existing questions for this set
        fetchSetQuestions()
      } else {
        setName('')
        setDescription('')
        setSelectedQuestionIds([])
      }
      setError(null)
    }
  }, [isOpen, questionSet])

  const fetchSetQuestions = async () => {
    if (!questionSet) return

    try {
      const response = await fetch(`/api/admin/question-sets/${questionSet.id}`)
      if (response.ok) {
        const { questions } = await response.json()
        const questionIds = questions.map((q: any) => q.question.id)
        setSelectedQuestionIds(questionIds)
      }
    } catch (err) {
      console.error('Error fetching set questions:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (selectedQuestionIds.length === 0) {
      setError('Please select at least one question')
      return
    }

    setIsSubmitting(true)

    try {
      const url = questionSet
        ? `/api/admin/question-sets/${questionSet.id}`
        : '/api/admin/question-sets'
      const method = questionSet ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          questionIds: selectedQuestionIds,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to save question set')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save question set')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div className="fixed inset-0 transition-opacity bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

          {/* Modal panel */}
          <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <form onSubmit={handleSubmit}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {questionSet ? 'Edit Question Set' : 'Create New Question Set'}
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <Input
                    label="Question Set Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Odisha Culture Basics"
                    required
                    error={error && !name.trim() ? error : undefined}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
                      placeholder="Optional description for this question set..."
                    />
                  </div>

                  {/* Question Selection */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Questions
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQuestionModal(true)}
                      >
                        {selectedQuestionIds.length > 0 ? 'Change Questions' : 'Select Questions'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      {selectedQuestionIds.length > 0
                        ? `${selectedQuestionIds.length} question${selectedQuestionIds.length !== 1 ? 's' : ''} selected`
                        : 'No questions selected. Click "Select Questions" to add questions from the question bank.'}
                    </p>
                    {error && selectedQuestionIds.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    )}
                  </div>

                  {error && name.trim() && selectedQuestionIds.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={!name.trim() || selectedQuestionIds.length === 0}
                  className="w-full sm:w-auto sm:ml-3"
                >
                  {questionSet ? 'Update Set' : 'Create Set'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  className="w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Question Selection Modal */}
      <QuestionSelectionModal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        onSelect={setSelectedQuestionIds}
        selectedQuestionIds={selectedQuestionIds}
      />
    </>
  )
}

