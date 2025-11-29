'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Exam {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
}

interface ExamAttempt {
  exam_id: string
  status: string
  score: number
}

export default function AvailableExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Record<string, ExamAttempt>>({})
  const [loading, setLoading] = useState(true)
  const [participantId, setParticipantId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get participant ID
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (participant) {
        setParticipantId(participant.id)

        // Fetch available exams (scheduled or active)
        const { data: examsData } = await supabase
          .from('exams')
          .select('*')
          .in('status', ['scheduled', 'active'])
          .order('scheduled_start', { ascending: true })

        setExams(examsData || [])

        // Fetch user's attempts
        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('exam_id, status, score')
          .eq('participant_id', participant.id)

        if (attemptsData) {
          const attemptsMap: Record<string, ExamAttempt> = {}
          attemptsData.forEach(attempt => {
            attemptsMap[attempt.exam_id] = attempt
          })
          setAttempts(attemptsMap)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [router])

  const canTakeExam = (exam: Exam) => {
    const now = new Date()
    const start = exam.scheduled_start ? new Date(exam.scheduled_start) : null
    const end = exam.scheduled_end ? new Date(exam.scheduled_end) : null

    if (exam.status === 'active') return true
    if (exam.status === 'scheduled' && start && now >= start && end && now <= end) return true
    return false
  }

  const hasAttempted = (examId: string) => {
    return attempts[examId]?.status === 'submitted'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Available Exams</h1>
          <p className="text-gray-600 mt-1">Take scheduled or active exams</p>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No exams available</h3>
            <p className="text-gray-500">Check back later for scheduled exams</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const attempted = hasAttempted(exam.id)
              const canTake = canTakeExam(exam)

              return (
                <div
                  key={exam.id}
                  className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-medium text-gray-900">{exam.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Questions:</span>
                      <span className="font-medium text-gray-900">{exam.total_questions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Starts:</span>
                      <span className="font-medium text-gray-900 text-xs">{formatDate(exam.scheduled_start)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ends:</span>
                      <span className="font-medium text-gray-900 text-xs">{formatDate(exam.scheduled_end)}</span>
                    </div>
                  </div>

                  {attempted ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-green-800 font-medium">Completed</p>
                        <p className="text-lg font-bold text-green-900 mt-1">
                          Score: {attempts[exam.id]?.score || 0}
                        </p>
                      </div>
                      <Link href={`/exams/${exam.id}/results`}>
                        <Button variant="outline" className="w-full">
                          View Results
                        </Button>
                      </Link>
                    </div>
                  ) : canTake ? (
                    <Link href={`/exams/${exam.id}/take`}>
                      <Button variant="primary" className="w-full">
                        Start Exam
                      </Button>
                    </Link>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-yellow-800">Not available yet</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

