'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { QuestionCard, type Question } from '@/components/admin/QuestionCard'
import { QuestionForm } from '@/components/admin/QuestionForm'
import { QuestionPreviewModal } from '@/components/admin/QuestionPreviewModal'

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
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)

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
          size="md"
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
          <Button variant="primary" size="md" onClick={() => setShowAddForm(true)}>
            Add Question
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onEdit={(q) => {
                setEditingQuestion(q)
                setShowAddForm(true)
              }}
              onDelete={handleDelete}
              onPreview={(q) => setPreviewQuestion(q)}
              onDuplicate={async (q) => {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('role')
                  .eq('user_id', user.id)
                  .single()

                const role = profile?.role || user.user_metadata?.role || 'participant'
                if (role !== 'admin') {
                  alert('Unauthorized: Only admins can duplicate questions')
                  return
                }

                const { error } = await supabase.from('questions').insert({
                  exam_id: examId,
                  question_text: q.question_text,
                  option_a: q.option_a,
                  option_b: q.option_b,
                  option_c: q.option_c,
                  option_d: q.option_d,
                  correct_answer: q.correct_answer,
                  points: q.points,
                  explanation: q.explanation,
                  category: q.category,
                  difficulty_level: q.difficulty_level,
                  tags: q.tags,
                  order_index: null,
                })

                if (error) {
                  alert('Error duplicating question: ' + error.message)
                } else {
                  window.location.reload()
                }
              }}
            />
          ))}
        </div>
      )}

      {previewQuestion && (
        <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
      )}
    </div>
  )
}


