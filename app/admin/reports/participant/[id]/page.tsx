'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ExportButton } from '@/components/admin/ExportButton'
import { Chart } from '@/components/admin/Chart'
import { format } from 'date-fns'

interface Participant {
  id: string
  name: string
  email: string
  school_name: string
  teams: {
    team_name: string
    team_code: string
  }
}

interface ExamAttempt {
  exam_id: string
  exam_title: string
  score: number
  total_questions: number
  submitted_at: string
  time_taken_minutes: number | null
}

export default function ParticipantReportPage() {
  const params = useParams()
  const participantId = params.id as string
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    totalTime: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      const supabase = createClient()

      const { data: participantData } = await supabase
        .from('participants')
        .select('*, teams(team_name, team_code)')
        .eq('id', participantId)
        .single()

      setParticipant(participantData)

      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          exam_id,
          score,
          total_questions,
          submitted_at,
          time_taken_minutes,
          exams(title)
        `)
        .eq('participant_id', participantId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })

      const transformedAttempts = (attemptsData || []).map((a: any) => ({
        exam_id: a.exam_id,
        exam_title: a.exams?.title || 'Unknown Exam',
        score: a.score,
        total_questions: a.total_questions,
        submitted_at: a.submitted_at,
        time_taken_minutes: a.time_taken_minutes,
      }))

      setAttempts(transformedAttempts)

      const scores = transformedAttempts.map(a => a.score)
      setStats({
        totalExams: transformedAttempts.length,
        averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        totalTime: transformedAttempts.reduce((sum, a) => sum + (a.time_taken_minutes || 0), 0),
      })

      setLoading(false)
    }

    fetchReportData()
  }, [participantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Participant not found</p>
        <Link href="/admin/reports" className="text-[#C0392B] hover:underline mt-4 inline-block">
          Back to Reports
        </Link>
      </div>
    )
  }

  const scoreData = attempts.map(a => ({
    exam: a.exam_title.substring(0, 15),
    score: a.score,
  }))

  const exportData = attempts.map(a => ({
    'Exam': a.exam_title,
    'Score': a.score,
    'Total Questions': a.total_questions,
    'Time Taken (minutes)': a.time_taken_minutes || 'N/A',
    'Submitted At': format(new Date(a.submitted_at), 'yyyy-MM-dd HH:mm'),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/reports"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{participant.name} - Report</h1>
        </div>
        <ExportButton
          data={exportData}
          filename={`participant-${participantId}-report`}
          exportType="both"
          pdfTitle={`${participant.name} - Performance Report`}
          columns={[
            { header: 'Exam', dataKey: 'Exam' },
            { header: 'Score', dataKey: 'Score' },
            { header: 'Total Questions', dataKey: 'Total Questions' },
            { header: 'Time Taken (minutes)', dataKey: 'Time Taken (minutes)' },
            { header: 'Submitted At', dataKey: 'Submitted At' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Exams</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Highest Score</p>
          <p className="text-2xl font-bold text-green-600">{stats.highestScore}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Time</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalTime} min</p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Participant Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <p className="text-gray-900 mt-1">{participant.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="text-gray-900 mt-1">{participant.email}</p>
          </div>
          <div>
            <span className="text-gray-500">School:</span>
            <p className="text-gray-900 mt-1">{participant.school_name}</p>
          </div>
          <div>
            <span className="text-gray-500">Team:</span>
            <p className="text-gray-900 mt-1">{participant.teams?.team_name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {scoreData.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Trend</h3>
          <Chart type="line" data={scoreData} dataKey="score" nameKey="exam" height={250} />
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Exam History</h3>
        {attempts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No exam attempts recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Taken</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attempts.map((attempt, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{attempt.exam_title}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{attempt.score}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{attempt.total_questions}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {attempt.time_taken_minutes ? `${attempt.time_taken_minutes} min` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(attempt.submitted_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

