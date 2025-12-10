'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { StatsCard } from '@/components/admin/StatsCard'

interface Exam {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number
  passing_score: number | null
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  created_at: string
}

export default function ExamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [stats, setStats] = useState({
    totalAttempts: 0,
    submittedAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    averageTime: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExam = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (error) {
        console.error('Error fetching exam:', error)
        router.push('/admin/exams')
      } else {
        setExam(data)
      }

      // Fetch exam statistics
      const { data: attempts, count: totalAttempts } = await supabase
        .from('exam_attempts')
        .select('score, status, time_taken_minutes', { count: 'exact' })
        .eq('exam_id', examId)

      const submittedAttempts = attempts?.filter(a => a.status === 'submitted') || []
      const averageScore = submittedAttempts.length > 0
        ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
        : 0
      const completionRate = totalAttempts && totalAttempts > 0
        ? Math.round((submittedAttempts.length / totalAttempts) * 100)
        : 0
      const averageTime = submittedAttempts.length > 0
        ? Math.round(
            submittedAttempts
              .filter(a => a.time_taken_minutes)
              .reduce((sum, a) => sum + (a.time_taken_minutes || 0), 0) /
            submittedAttempts.filter(a => a.time_taken_minutes).length
          )
        : 0

      setStats({
        totalAttempts: totalAttempts || 0,
        submittedAttempts: submittedAttempts.length,
        averageScore,
        completionRate,
        averageTime,
      })

      setLoading(false)
    }

    fetchExam()
  }, [examId, router])

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
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
      alert('Unauthorized: Only admins can update exam status')
      router.push('/dashboard')
      return
    }

    const { error } = await supabase
      .from('exams')
      .update({ status: newStatus })
      .eq('id', examId)

    if (error) {
      alert('Error updating status: ' + error.message)
    } else {
      setExam(exam ? { ...exam, status: newStatus } : null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Exam not found</p>
        <Link href="/admin/exams">
          <Button variant="outline" className="mt-4">Back to Exams</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/exams"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exams
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">Status: <span className="font-medium capitalize">{exam.status}</span></p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href={`/admin/exams/${examId}/questions`}>
              <Button variant="primary">
                Manage Questions
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/results`}>
              <Button variant="outline">
                View Results
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/analytics`}>
              <Button variant="outline">
                View Analytics
              </Button>
            </Link>
            {exam.status === 'draft' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('scheduled')}
              >
                Schedule Exam
              </Button>
            )}
            {exam.status === 'scheduled' && (
              <Button
                variant="primary"
                onClick={() => handleStatusChange('active')}
              >
                Activate Exam
              </Button>
            )}
            {exam.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('completed')}
              >
                Complete Exam
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Attempts"
          value={stats.totalAttempts}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="blue"
        />
        <StatsCard
          title="Submitted"
          value={stats.submittedAttempts}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatsCard
          title="Average Score"
          value={stats.averageScore}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="purple"
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Exam Details</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Description:</span>
              <p className="text-gray-900 mt-1">{exam.description || 'No description'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Duration:</span>
              <p className="text-gray-900 mt-1">{exam.duration_minutes} minutes</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Total Questions:</span>
              <p className="text-gray-900 mt-1">{exam.total_questions}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Passing Score:</span>
              <p className="text-gray-900 mt-1">{exam.passing_score || 'Not set'}</p>
            </div>
            {stats.averageTime > 0 && (
              <div>
                <span className="text-sm text-gray-500">Average Time Taken:</span>
                <p className="text-gray-900 mt-1">{stats.averageTime} minutes</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Schedule</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Start Time:</span>
              <p className="text-gray-900 mt-1">
                {exam.scheduled_start
                  ? new Date(exam.scheduled_start).toLocaleString('en-IN')
                  : 'Not scheduled'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">End Time:</span>
              <p className="text-gray-900 mt-1">
                {exam.scheduled_end
                  ? new Date(exam.scheduled_end).toLocaleString('en-IN')
                  : 'Not scheduled'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <p className="text-gray-900 mt-1">
                {new Date(exam.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

