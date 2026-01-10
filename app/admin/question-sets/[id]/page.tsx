'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { QuestionSetForm } from '@/components/admin/QuestionSetForm'
import { QuestionCard } from '@/components/admin/QuestionCard'
import { type Question } from '@/components/admin/QuestionCard'

interface QuestionSet {
  id: string
  name: string
  description: string | null
  total_questions: number
  created_at: string
  updated_at?: string
}

interface SetQuestion {
  id: string
  order_index: number
  question: Question
}

export default function QuestionSetDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const setId = params.id as string
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
  const [questions, setQuestions] = useState<SetQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (setId) {
      fetchQuestionSet()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  const fetchQuestionSet = async () => {
    if (!setId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/question-sets/${setId}`)
      const data = await response.json()
      
      if (response.ok) {
        if (data.questionSet) {
          setQuestionSet(data.questionSet)
          setQuestions(data.questions || [])
        } else {
          setError('Question set data not found in response')
        }
      } else {
        setError(data.error || 'Failed to load question set')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load question set')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question set? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/question-sets/${setId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/question-sets')
      } else {
        const { error } = await response.json()
        alert(`Error: ${error || 'Failed to delete question set'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to delete question set'}`)
    }
  }

  const handleUseForExam = () => {
    // Navigate to exam creation with question set pre-selected
    router.push(`/admin/exams/new?questionSetId=${setId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (error || !questionSet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{error || 'Question set not found'}</p>
        <Link href="/admin/question-sets">
          <Button variant="outline" size="md">
            Back to Question Sets
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/question-sets"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Question Sets
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{questionSet.name}</h1>
            {questionSet.description && (
              <p className="text-gray-600 mt-1">{questionSet.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="md" onClick={handleUseForExam}>
              Use for Exam
            </Button>
            <Button variant="outline" size="md" onClick={() => setShowEditForm(true)}>
              Edit Set
            </Button>
            <Button variant="outline" size="md" onClick={handleDelete}>
              Delete Set
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{questionSet.total_questions}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Created</p>
          <p className="text-lg font-medium text-gray-900">
            {new Date(questionSet.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="text-lg font-medium text-gray-900">
            {new Date(questionSet.updated_at || questionSet.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Questions in this Set</h2>
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No questions in this set</p>
            <Button variant="outline" size="md" className="mt-4" onClick={() => setShowEditForm(true)}>
              Add Questions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((setQuestion, index) => {
              if (!setQuestion.question) {
                return null
              }
              return (
                <div key={setQuestion.id} className="border border-gray-200 rounded-lg p-4">
                  <QuestionCard
                    question={setQuestion.question}
                    index={index + 1}
                    compact
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      <QuestionSetForm
        questionSet={questionSet}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={() => {
          setShowEditForm(false)
          fetchQuestionSet()
        }}
      />
    </div>
  )
}

