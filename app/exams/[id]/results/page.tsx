'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Exam {
  id: string
  title: string
}

interface Attempt {
  id: string
  submitted_at: string
}

export default function ExamResultsPage() {
  const params = useParams()
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const examId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined

  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!examId) return

    const fetchCompletionState = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!participant) {
        router.push('/dashboard')
        return
      }

      const { data: examData } = await supabase
        .from('exams')
        .select('id, title')
        .eq('id', examId)
        .single()

      setExam(examData)

      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('id, submitted_at')
        .eq('exam_id', examId)
        .eq('participant_id', participant.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!attemptData) {
        router.push('/exams')
        return
      }

      setAttempt(attemptData)
      setLoading(false)
    }

    fetchCompletionState()
  }, [examId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading completion status...</p>
        </div>
      </div>
    )
  }

  if (!exam || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Exam completion details not found</p>
          <Link href="/exams">
            <Button variant="outline">Back to Exams</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/exams"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exams
        </Link>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-8 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Participating!</h1>
          <p className="text-gray-600 mb-6">
            Your exam for <span className="font-medium text-gray-800">{exam.title}</span> has been submitted
            successfully.
          </p>
          <p className="text-gray-700 mb-8">
            Scores and rankings are available on the leaderboard. Please check the leaderboard to view your
            standing.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/competition/leaderboard">
              <Button variant="primary" className="w-full sm:w-auto px-6">
                View Leaderboard
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto px-6">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
