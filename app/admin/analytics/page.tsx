'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Chart } from '@/components/admin/Chart'
import { StatsCard } from '@/components/admin/StatsCard'
import { format, subDays } from 'date-fns'

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalParticipants: 0,
    totalAttempts: 0,
    averageScore: 0,
  })
  const [participationTrends, setParticipationTrends] = useState<any[]>([])
  const [examComparison, setExamComparison] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient()

      // Fetch overall stats
      const { count: totalExams } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })

      const { count: totalParticipants } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })

      const { data: attempts, count: totalAttempts } = await supabase
        .from('exam_attempts')
        .select('score')
        .eq('status', 'submitted')

      const averageScore = attempts && attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
        : 0

      // Fetch participation trends (last 30 days)
      const trends = []
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const { count } = await supabase
          .from('exam_attempts')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', format(date, 'yyyy-MM-dd'))
          .lt('started_at', format(subDays(date, -1), 'yyyy-MM-dd'))
        trends.push({
          date: format(date, 'MMM dd'),
          attempts: count || 0,
        })
      }

      // Fetch exam comparison
      const { data: exams } = await supabase
        .from('exams')
        .select('id, title, total_questions')
        .eq('status', 'completed')
        .limit(10)

      const examStats = []
      for (const exam of exams || []) {
        const { data: examAttempts } = await supabase
          .from('exam_attempts')
          .select('score')
          .eq('exam_id', exam.id)
          .eq('status', 'submitted')

        const avgScore = examAttempts && examAttempts.length > 0
          ? Math.round(examAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / examAttempts.length)
          : 0

        examStats.push({
          name: exam.title.substring(0, 20),
          averageScore: avgScore,
          attempts: examAttempts?.length || 0,
        })
      }

      setStats({
        totalExams: totalExams || 0,
        totalParticipants: totalParticipants || 0,
        totalAttempts: totalAttempts || 0,
        averageScore,
      })
      setParticipationTrends(trends)
      setExamComparison(examStats)
      setLoading(false)
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Comprehensive performance analytics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Exams"
          value={stats.totalExams}
          icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          color="blue"
          href="/admin/exams"
        />
        <StatsCard
          title="Total Participants"
          value={stats.totalParticipants}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          color="purple"
          href="/admin/participants"
        />
        <StatsCard
          title="Total Attempts"
          value={stats.totalAttempts}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="orange"
        />
        <StatsCard
          title="Average Score"
          value={stats.averageScore}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Participation Trends (Last 30 Days)</h3>
          {participationTrends.length > 0 ? (
            <Chart type="line" data={participationTrends} dataKey="attempts" nameKey="date" height={300} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No data available</p>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Exam Performance Comparison</h3>
          {examComparison.length > 0 ? (
            <Chart type="bar" data={examComparison} dataKey="averageScore" nameKey="name" height={300} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/analytics/participants"
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Participant Analytics</h3>
          <p className="text-sm text-gray-600">View detailed participant performance metrics</p>
        </Link>
        <Link
          href="/admin/analytics/questions"
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Question Analytics</h3>
          <p className="text-sm text-gray-600">Analyze question difficulty and effectiveness</p>
        </Link>
        <Link
          href="/admin/reports"
          className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-shadow"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Generate Reports</h3>
          <p className="text-sm text-gray-600">Create and export detailed reports</p>
        </Link>
      </div>
    </div>
  )
}

