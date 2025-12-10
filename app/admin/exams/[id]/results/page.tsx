'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/admin/DataTable'
import { ExportButton } from '@/components/admin/ExportButton'
import { format } from 'date-fns'

interface ExamAttempt {
  id: string
  participant_id: string
  started_at: string
  submitted_at: string | null
  score: number
  total_questions: number
  correct_answers: number
  status: string
  time_taken_minutes: number | null
  participant: {
    name: string
    email: string
    team_id: string
    teams: {
      team_name: string
      team_code: string
    }
  }
}

interface Exam {
  id: string
  title: string
}

export default function ExamResultsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [loading, setLoading] = useState(true)

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

      // Fetch exam attempts with participant and team data
      const { data: attemptsData, error } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          participant:participants(
            name,
            email,
            team_id,
            teams(team_name, team_code)
          )
        `)
        .eq('exam_id', examId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error fetching attempts:', error)
      } else {
        // Transform the data to flatten participant and team info
        const transformedAttempts = (attemptsData || []).map((attempt: any) => ({
          ...attempt,
          participant: attempt.participant || {},
          teams: attempt.participant?.teams || {},
        }))
        setAttempts(transformedAttempts)
      }

      setLoading(false)
    }

    fetchData()
  }, [examId])

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

  const columns = [
    {
      key: 'participant.name',
      header: 'Participant',
      render: (attempt: ExamAttempt) => attempt.participant?.name || 'Unknown',
      sortable: true,
    },
    {
      key: 'teams.team_name',
      header: 'Team',
      render: (attempt: ExamAttempt) => attempt.participant?.teams?.team_name || 'N/A',
      sortable: true,
    },
    {
      key: 'score',
      header: 'Score',
      render: (attempt: ExamAttempt) => (
        <span className="font-medium">{attempt.score} / {attempt.total_questions}</span>
      ),
      sortable: true,
    },
    {
      key: 'correct_answers',
      header: 'Correct',
      render: (attempt: ExamAttempt) => (
        <span className="text-green-600 font-medium">{attempt.correct_answers}</span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (attempt: ExamAttempt) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          attempt.status === 'submitted'
            ? 'bg-green-100 text-green-800'
            : attempt.status === 'timeout'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'time_taken_minutes',
      header: 'Time Taken',
      render: (attempt: ExamAttempt) => (
        attempt.time_taken_minutes ? `${attempt.time_taken_minutes} min` : 'N/A'
      ),
      sortable: true,
    },
    {
      key: 'submitted_at',
      header: 'Submitted At',
      render: (attempt: ExamAttempt) => (
        attempt.submitted_at
          ? format(new Date(attempt.submitted_at), 'MMM dd, yyyy HH:mm')
          : 'Not submitted'
      ),
      sortable: true,
    },
  ]

  const exportData = attempts.map((attempt) => ({
    'Participant Name': attempt.participant?.name || 'Unknown',
    'Team Name': attempt.participant?.teams?.team_name || 'N/A',
    'Team Code': attempt.participant?.teams?.team_code || 'N/A',
    'Score': attempt.score,
    'Total Questions': attempt.total_questions,
    'Correct Answers': attempt.correct_answers,
    'Status': attempt.status,
    'Time Taken (minutes)': attempt.time_taken_minutes || 'N/A',
    'Started At': format(new Date(attempt.started_at), 'yyyy-MM-dd HH:mm'),
    'Submitted At': attempt.submitted_at ? format(new Date(attempt.submitted_at), 'yyyy-MM-dd HH:mm') : 'Not submitted',
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/exams/${examId}`}
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exam Details
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">Exam Results ({attempts.length} attempts)</p>
          </div>
          <ExportButton
            data={exportData}
            filename={`exam-${examId}-results`}
            exportType="both"
            pdfTitle={`${exam.title} - Results`}
            columns={[
              { header: 'Participant Name', dataKey: 'Participant Name' },
              { header: 'Team Name', dataKey: 'Team Name' },
              { header: 'Score', dataKey: 'Score' },
              { header: 'Total Questions', dataKey: 'Total Questions' },
              { header: 'Correct Answers', dataKey: 'Correct Answers' },
              { header: 'Status', dataKey: 'Status' },
              { header: 'Time Taken (minutes)', dataKey: 'Time Taken (minutes)' },
              { header: 'Submitted At', dataKey: 'Submitted At' },
            ]}
          />
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Attempts</p>
          <p className="text-2xl font-bold text-gray-900">{attempts.length}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Submitted</p>
          <p className="text-2xl font-bold text-green-600">
            {attempts.filter(a => a.status === 'submitted').length}
          </p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold text-gray-900">
            {attempts.filter(a => a.status === 'submitted').length > 0
              ? Math.round(
                  attempts
                    .filter(a => a.status === 'submitted')
                    .reduce((sum, a) => sum + a.score, 0) /
                    attempts.filter(a => a.status === 'submitted').length
                )
              : 0}
          </p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900">
            {attempts.length > 0
              ? Math.round((attempts.filter(a => a.status === 'submitted').length / attempts.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Results Table */}
      {attempts.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No attempts yet</h3>
          <p className="text-gray-500">No participants have attempted this exam yet.</p>
        </div>
      ) : (
        <DataTable
          data={attempts}
          columns={columns}
          searchable
          searchPlaceholder="Search by participant name or team..."
          onRowClick={(attempt) => {
            // Could navigate to detailed attempt view
            console.log('View attempt:', attempt.id)
          }}
        />
      )}
    </div>
  )
}

