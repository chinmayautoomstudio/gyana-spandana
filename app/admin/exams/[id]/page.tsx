'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { StatsCard } from '@/components/admin/StatsCard'
import { ParticipantExamLinks } from '@/components/admin/ParticipantExamLinks'
import { ExamInvitationModal } from '@/components/admin/ExamInvitationModal'

interface Exam {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number
  questions_per_participant: number | null
  passing_score: number | null
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  created_at: string
}

export default function ExamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const examId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined
  const [exam, setExam] = useState<Exam | null>(null)
  const [stats, setStats] = useState({
    totalAttempts: 0,
    submittedAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    averageTime: 0,
    totalTeams: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [assignedParticipants, setAssignedParticipants] = useState<any[]>([])
  const [assignedParticipantsCount, setAssignedParticipantsCount] = useState(0)

  useEffect(() => {
    if (!examId) return
    
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
      const attemptsWithTime = submittedAttempts.filter(
        (a) => a.time_taken_minutes != null && a.time_taken_minutes > 0
      )
      const averageTime =
        attemptsWithTime.length > 0
          ? Math.round(
              attemptsWithTime.reduce(
                (sum, a) => sum + (a.time_taken_minutes || 0),
                0
              ) / attemptsWithTime.length
            )
          : 0

      // Fetch teams assigned to exam
      let totalTeams = 0
      try {
        const teamsResponse = await fetch(`/api/admin/exams/${examId}/teams`)
        if (teamsResponse.ok) {
          const { teams: teamsData } = await teamsResponse.json()
          totalTeams = teamsData?.length || 0
        }
      } catch (err) {
        console.error('Error fetching teams count:', err)
      }

      // Fetch assigned participants for invitation modal
      try {
        const participantsResponse = await fetch(`/api/admin/exams/${examId}/participants`)
        if (participantsResponse.ok) {
          const { assignments } = await participantsResponse.json()
          const participants = (assignments || []).map((a: any) => ({
            id: a.participant.id,
            name: a.participant.name,
            email: a.participant.email,
            school_name: a.participant.school_name,
            teams: a.participant.teams,
          }))
          setAssignedParticipants(participants)
          setAssignedParticipantsCount(participants.length)
        }
      } catch (err) {
        console.error('Error fetching assigned participants:', err)
      }

      setStats({
        totalAttempts: totalAttempts || 0,
        submittedAttempts: submittedAttempts.length,
        averageScore,
        completionRate,
        averageTime,
        totalTeams,
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

  if (!examId || !exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Exam not found</p>
        <Link href="/admin/exams">
          <Button variant="outline" size="md" className="mt-4">Back to Exams</Button>
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
              <Button variant="primary" size="md">
                Manage Questions
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/participants`}>
              <Button variant="primary" size="md">
                Assign Participants
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/teams`}>
              <Button variant="outline" size="md">
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Teams
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/results`}>
              <Button variant="outline" size="md">
                View Results
              </Button>
            </Link>
            <Link href={`/admin/exams/${examId}/analytics`}>
              <Button variant="outline" size="md">
                View Analytics
              </Button>
            </Link>
            {(exam.status === 'scheduled' || exam.status === 'active') && assignedParticipantsCount > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowInvitationModal(true)}
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Invitations ({assignedParticipantsCount})
              </Button>
            )}
            {exam.status === 'draft' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange('active')}
                >
                  Activate Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/exams/schedule?examId=${examId}`)}
                >
                  Edit & Schedule
                </Button>
              </>
            )}
            {exam.status === 'scheduled' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('active')}
              >
                Activate Now
              </Button>
            )}
            {exam.status === 'active' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('completed')}
              >
                Mark as Completed
              </Button>
            )}
            {(exam.status === 'scheduled' || exam.status === 'active') && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this exam? This action cannot be undone.')) {
                    handleStatusChange('cancelled')
                  }
                }}
              >
                Cancel Exam
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <StatsCard
          title="Assigned Teams"
          value={stats.totalTeams}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          color="orange"
        />
      </div>

      {/* Participant Exam Links */}
      <ParticipantExamLinks
        examId={examId}
        examTitle={exam.title}
      />

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
              <span className="text-sm text-gray-500">Question Pool Size:</span>
              <p className="text-gray-900 mt-1">{exam.total_questions} questions</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Questions Per Participant:</span>
              <p className="text-gray-900 mt-1">
                {exam.questions_per_participant 
                  ? `${exam.questions_per_participant} (randomly selected from pool)`
                  : 'All questions (shuffled per participant)'}
              </p>
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

      {/* Exam Invitation Modal */}
      <ExamInvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        examId={examId}
        examTitle={exam.title}
        examDuration={exam.duration_minutes}
        scheduledStart={exam.scheduled_start}
        scheduledEnd={exam.scheduled_end}
        participants={assignedParticipants}
        onSuccess={() => {
          // Refresh participants count if needed
          fetch(`/api/admin/exams/${examId}/participants`)
            .then(res => res.json())
            .then(data => {
              const participants = (data.assignments || []).map((a: any) => ({
                id: a.participant.id,
                name: a.participant.name,
                email: a.participant.email,
                school_name: a.participant.school_name,
                teams: a.participant.teams,
              }))
              setAssignedParticipants(participants)
              setAssignedParticipantsCount(participants.length)
            })
            .catch(err => console.error('Error refreshing participants:', err))
        }}
      />
    </div>
  )
}

