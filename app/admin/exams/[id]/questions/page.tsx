'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  points: number
  explanation: string | null
  order_index: number | null
}

interface Exam {
  id: string
  title: string
  total_questions: number
}

export default function QuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      setExam(examData)

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      setQuestions(questionsData || [])
      setLoading(false)
    }

    fetchData()
  }, [examId])

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Please log in to delete questions')
      return
    }

    // Verify admin role from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      alert('Unauthorized: Only admins can delete questions')
      return
    }

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)

    if (error) {
      alert('Error deleting question: ' + error.message)
    } else {
      setQuestions(questions.filter(q => q.id !== questionId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/exams"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{exam?.title}</h1>
          <p className="text-gray-600 mt-1">Manage Questions ({exam?.total_questions || 0} questions)</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            setEditingQuestion(null)
            setShowAddForm(true)
          }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Question
        </Button>
      </div>

      {showAddForm && (
        <QuestionForm
          examId={examId}
          question={editingQuestion}
          onClose={() => {
            setShowAddForm(false)
            setEditingQuestion(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingQuestion(null)
            // Refresh questions
            window.location.reload()
          }}
        />
      )}

      {questions.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions yet</h3>
          <p className="text-gray-500 mb-6">Add your first question to get started</p>
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            Add Question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-[#C0392B]/10 text-[#C0392B] rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{question.question_text}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingQuestion(question)
                      setShowAddForm(true)
                    }}
                    className="p-2 text-[#C0392B] hover:bg-[#C0392B]/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded-lg border ${question.correct_answer === 'A' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-700">A.</span>
                    {question.correct_answer === 'A' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Correct</span>
                    )}
                  </div>
                  <p className="text-gray-900">{question.option_a}</p>
                </div>
                <div className={`p-3 rounded-lg border ${question.correct_answer === 'B' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-700">B.</span>
                    {question.correct_answer === 'B' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Correct</span>
                    )}
                  </div>
                  <p className="text-gray-900">{question.option_b}</p>
                </div>
                <div className={`p-3 rounded-lg border ${question.correct_answer === 'C' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-700">C.</span>
                    {question.correct_answer === 'C' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Correct</span>
                    )}
                  </div>
                  <p className="text-gray-900">{question.option_c}</p>
                </div>
                <div className={`p-3 rounded-lg border ${question.correct_answer === 'D' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-700">D.</span>
                    {question.correct_answer === 'D' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Correct</span>
                    )}
                  </div>
                  <p className="text-gray-900">{question.option_d}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Points: <strong>{question.points}</strong></span>
                {question.explanation && (
                  <span className="text-gray-500">Explanation: {question.explanation}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionForm({
  examId,
  question,
  onClose,
  onSuccess,
}: {
  examId: string
  question: Question | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    option_a: question?.option_a || '',
    option_b: question?.option_b || '',
    option_c: question?.option_c || '',
    option_d: question?.option_d || '',
    correct_answer: question?.correct_answer || 'A' as 'A' | 'B' | 'C' | 'D',
    points: question?.points || 1,
    explanation: question?.explanation || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Please log in to save questions')
        return
      }

      // Verify admin role from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = profile?.role || user.user_metadata?.role || 'participant'
      if (role !== 'admin') {
        setError('Unauthorized: Only admins can manage questions')
        return
      }

      const questionData = {
        exam_id: examId,
        question_text: formData.question_text,
        option_a: formData.option_a,
        option_b: formData.option_b,
        option_c: formData.option_c,
        option_d: formData.option_d,
        correct_answer: formData.correct_answer,
        points: formData.points,
        explanation: formData.explanation || null,
        order_index: null,
      }

      if (question) {
        // Update existing question
        const { error: updateError } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', question.id)

        if (updateError) throw updateError
      } else {
        // Insert new question
        const { error: insertError } = await supabase
          .from('questions')
          .insert(questionData)

        if (insertError) throw insertError
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to save question')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {question ? 'Edit Question' : 'Add New Question'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <textarea
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            placeholder="Enter your question..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Option A *
            </label>
            <input
              type="text"
              value={formData.option_a}
              onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Option B *
            </label>
            <input
              type="text"
              value={formData.option_b}
              onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Option C *
            </label>
            <input
              type="text"
              value={formData.option_c}
              onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Option D *
            </label>
            <input
              type="text"
              value={formData.option_d}
              onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer *
            </label>
            <select
              value={formData.correct_answer}
              onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
              required
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>
          <div>
            <Input
              label="Points *"
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              min={1}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explanation (optional)
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            placeholder="Explain why this is the correct answer..."
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
          >
            {question ? 'Update Question' : 'Add Question'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

