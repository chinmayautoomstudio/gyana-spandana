'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StatsCard } from '@/components/admin/StatsCard'
import { RecentExamSessions } from '@/components/admin/RecentExamSessions'
import { QuickLinkCard } from '@/components/admin/QuickLinkCard'
import { Button } from '@/components/ui/Button'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalSessions: 0,
    activeSessions: 0,
    averageScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    const supabase = createClient()

    // Fetch total questions count
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })

    // Fetch total sessions count (all exam attempts)
    const { count: totalSessions } = await supabase
      .from('exam_attempts')
      .select('*', { count: 'exact', head: true })

    // Fetch active sessions count (status = 'in_progress')
    const { count: activeSessions } = await supabase
      .from('exam_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')

    // Fetch average score from submitted attempts
    const { data: submittedAttempts } = await supabase
      .from('exam_attempts')
      .select('score')
      .eq('status', 'submitted')

    const averageScore = submittedAttempts && submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) /
          submittedAttempts.length
        )
      : 0

    setStats({
      totalQuestions: totalQuestions || 0,
      totalSessions: totalSessions || 0,
      activeSessions: activeSessions || 0,
      averageScore,
    })
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Exam Dashboard</h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">Overview of your exam system.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={handleRefresh}
            isLoading={refreshing}
            className="text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href="/admin/exams/new" className="flex-shrink-0">
            <Button variant="primary" size="md" className="bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 text-xs sm:text-sm">
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Create Exam</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
          <Link href="/admin/exams/schedule" className="flex-shrink-0">
            <Button variant="secondary" size="md" className="text-xs sm:text-sm">
              <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Quick Create</span>
              <span className="sm:hidden">Schedule</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
        <StatsCard
          title="Total Questions"
          value={stats.totalQuestions}
          icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          color="blue"
        />
        <StatsCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          color="green"
        />
        <StatsCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="yellow"
          subtitle={stats.activeSessions === 0 ? 'No active sessions' : undefined}
        />
        <StatsCard
          title="Average Score"
          value={`${stats.averageScore}%`}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="purple"
        />
      </div>

      {/* Recent Exam Sessions Table */}
      <RecentExamSessions />

      {/* Quick Link Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLinkCard
          icon="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          title="Question Bank"
          description="Manage your question database and create new questions."
          href="/admin/exams"
          linkText="Manage Questions"
        />
        <QuickLinkCard
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          title="Exam Sessions"
          description="View and manage active and completed exam sessions."
          href="/admin/exams"
          linkText="View Sessions"
        />
        <QuickLinkCard
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          title="Analytics"
          description="Analyze exam performance and candidate results."
          href="/admin/analytics"
          linkText="View Analytics"
        />
      </div>
    </div>
  )
}
