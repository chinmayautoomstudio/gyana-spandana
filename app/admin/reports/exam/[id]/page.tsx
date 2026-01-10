'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ExportButton } from '@/components/admin/ExportButton'
import { Chart } from '@/components/admin/Chart'
import { format } from 'date-fns'

interface Exam {
  id: string
  title: string
  description: string | null
  total_questions: number
  duration_minutes: number
}

interface Attempt {
  participant_name: string
  team_name: string
  score: number
  submitted_at: string
}

export default function ExamReportPage() {
  const params = useParams()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      const supabase = createClient()

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      setExam(examData)

      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          score,
          submitted_at,
          participant:participants(name, teams(team_name))
        `)
        .eq('exam_id', examId)
        .eq('status', 'submitted')

      const transformedAttempts = (attemptsData || []).map((a: any) => ({
        participant_name: a.participant?.name || 'Unknown',
        team_name: a.participant?.teams?.team_name || 'N/A',
        score: a.score,
        submitted_at: a.submitted_at,
      }))

      setAttempts(transformedAttempts)

      const scores = transformedAttempts.map(a => a.score)
      setStats({
        totalAttempts: transformedAttempts.length,
        averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      })

      setLoading(false)
    }

    fetchReportData()
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
        <Link href="/admin/reports" className="text-[#C0392B] hover:underline mt-4 inline-block">
          Back to Reports
        </Link>
      </div>
    )
  }

  const exportData = attempts.map(a => ({
    'Participant Name': a.participant_name,
    'Team Name': a.team_name,
    'Score': a.score,
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
          <h1 className="text-3xl font-bold text-gray-900">{exam.title} - Report</h1>
        </div>
        <ExportButton
          data={exportData}
          filename={`exam-${examId}-report`}
          exportType="both"
          pdfTitle={`${exam.title} - Exam Report`}
          columns={[
            { header: 'Participant Name', dataKey: 'Participant Name' },
            { header: 'Team Name', dataKey: 'Team Name' },
            { header: 'Score', dataKey: 'Score' },
            { header: 'Submitted At', dataKey: 'Submitted At' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Attempts</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
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
          <p className="text-sm text-gray-500">Lowest Score</p>
          <p className="text-2xl font-bold text-red-600">{stats.lowestScore}</p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Exam Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Description:</span>
            <p className="text-gray-900 mt-1">{exam.description || 'No description'}</p>
          </div>
          <div>
            <span className="text-gray-500">Total Questions:</span>
            <p className="text-gray-900 mt-1">{exam.total_questions}</p>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <p className="text-gray-900 mt-1">{exam.duration_minutes} minutes</p>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Participant Results</h3>
        {attempts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No attempts recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attempts.map((attempt, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{attempt.participant_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{attempt.team_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{attempt.score}</td>
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

