'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Chart } from '@/components/admin/Chart'
import { DataTable } from '@/components/admin/DataTable'

interface ParticipantPerformance {
  participant_id: string
  name: string
  email: string
  team_name: string
  total_exams: number
  average_score: number
  total_attempts: number
  completion_rate: number
}

export default function ParticipantAnalyticsPage() {
  const [participants, setParticipants] = useState<ParticipantPerformance[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch all participants with their exam attempts
      const { data: allParticipants } = await supabase
        .from('participants')
        .select('id, name, email, team_id, teams(team_name)')

      const participantStats: ParticipantPerformance[] = []

      for (const participant of allParticipants || []) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('score, status, exam_id')
          .eq('participant_id', participant.id)

        const submittedAttempts = attempts?.filter(a => a.status === 'submitted') || []
        const uniqueExams = new Set(attempts?.map(a => a.exam_id) || [])
        const averageScore = submittedAttempts.length > 0
          ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
          : 0
        const completionRate = attempts && attempts.length > 0
          ? Math.round((submittedAttempts.length / attempts.length) * 100)
          : 0

        participantStats.push({
          participant_id: participant.id,
          name: participant.name,
          email: participant.email,
          team_name: (participant.teams as any)?.team_name || 'N/A',
          total_exams: uniqueExams.size,
          average_score: averageScore,
          total_attempts: attempts?.length || 0,
          completion_rate: completionRate,
        })
      }

      // Calculate score distribution
      const distribution = [
        { range: '0-25', count: 0 },
        { range: '26-50', count: 0 },
        { range: '51-75', count: 0 },
        { range: '76-100', count: 0 },
      ]

      participantStats.forEach((p) => {
        if (p.average_score <= 25) distribution[0].count++
        else if (p.average_score <= 50) distribution[1].count++
        else if (p.average_score <= 75) distribution[2].count++
        else distribution[3].count++
      })

      setParticipants(participantStats)
      setScoreDistribution(distribution)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Participant',
      render: (p: ParticipantPerformance) => p.name,
      sortable: true,
    },
    {
      key: 'team_name',
      header: 'Team',
      render: (p: ParticipantPerformance) => p.team_name,
      sortable: true,
    },
    {
      key: 'total_exams',
      header: 'Exams Taken',
      render: (p: ParticipantPerformance) => p.total_exams,
      sortable: true,
    },
    {
      key: 'average_score',
      header: 'Average Score',
      render: (p: ParticipantPerformance) => (
        <span className="font-medium">{p.average_score}</span>
      ),
      sortable: true,
    },
    {
      key: 'completion_rate',
      header: 'Completion Rate',
      render: (p: ParticipantPerformance) => (
        <span className="font-medium">{p.completion_rate}%</span>
      ),
      sortable: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/analytics"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Analytics
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Participant Analytics</h1>
        <p className="text-gray-600 mt-1">Individual and team performance metrics</p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Score Distribution</h3>
        {scoreDistribution.some(d => d.count > 0) ? (
          <Chart type="bar" data={scoreDistribution} dataKey="count" nameKey="range" height={250} />
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No data available</p>
        )}
      </div>

      <DataTable
        data={participants}
        columns={columns}
        searchable
        searchPlaceholder="Search by participant name or team..."
      />
    </div>
  )
}

