'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'

interface ExamSession {
  id: string
  participant_name: string
  participant_email: string
  exam_title: string
  status: string
  score: number | null
  started_at: string
  exam_id: string
}

export function RecentExamSessions() {
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentSessions = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          status,
          score,
          started_at,
          exam_id,
          participant:participants(name, email),
          exam:exams(title)
        `)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching recent sessions:', error)
        setLoading(false)
        return
      }

      const transformedSessions: ExamSession[] = (data || []).map((attempt: any) => ({
        id: attempt.id,
        participant_name: attempt.participant?.name || 'Unknown',
        participant_email: attempt.participant?.email || '',
        exam_title: attempt.exam?.title || 'Unknown Exam',
        status: attempt.status,
        score: attempt.score,
        started_at: attempt.started_at,
        exam_id: attempt.exam_id,
      }))

      setSessions(transformedSessions)
      setLoading(false)
    }

    fetchRecentSessions()
  }, [])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      timeout: { label: 'Timeout', className: 'bg-red-100 text-red-800' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C0392B]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Recent Exam Sessions</h3>
        <Link
          href="/admin/exams"
          className="text-sm text-[#C0392B] hover:text-[#A93226] font-medium"
        >
          View All →
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No exam sessions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Exam Title
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Started
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 sm:px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{session.participant_name}</div>
                    <div className="text-xs text-gray-500 md:hidden">{session.exam_title}</div>
                    <div className="text-xs text-gray-500 lg:hidden mt-1">
                      {format(new Date(session.started_at), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-900">{session.exam_title}</div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(session.status)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {session.status === 'submitted' && session.score !== null
                      ? `${session.score}%`
                      : '-'}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                    {format(new Date(session.started_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/exams/${session.exam_id}/results`}
                        className="text-[#C0392B] hover:text-[#A93226] p-1 rounded hover:bg-gray-100"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      {session.status === 'submitted' && (
                        <Link
                          href={`/admin/exams/${session.exam_id}/analytics`}
                          className="text-[#C0392B] hover:text-[#A93226] p-1 rounded hover:bg-gray-100"
                          title="Analytics"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

