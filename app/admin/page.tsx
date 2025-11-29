'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalParticipants: 0,
    totalTeams: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()

      // Fetch exam stats
      const { count: totalExams } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })

      const { count: activeExams } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .in('status', ['scheduled', 'active'])

      // Fetch participant stats
      const { count: totalParticipants } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })

      // Fetch team stats
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalExams: totalExams || 0,
        activeExams: activeExams || 0,
        totalParticipants: totalParticipants || 0,
        totalTeams: totalTeams || 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      color: 'blue',
      href: '/admin/exams',
    },
    {
      title: 'Active Exams',
      value: stats.activeExams,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'green',
      href: '/admin/exams',
    },
    {
      title: 'Total Participants',
      value: stats.totalParticipants,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'purple',
      href: '/admin/participants',
    },
    {
      title: 'Total Teams',
      value: stats.totalTeams,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'indigo',
      href: '/admin/participants',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${card.color}-500/10 rounded-lg flex items-center justify-center`}>
                <svg className={`w-6 h-6 text-${card.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/admin/exams/new"
              className="block w-full px-4 py-3 bg-[#C0392B] text-white rounded-lg hover:bg-[#A93226] transition-colors text-center font-medium"
            >
              Create New Exam
            </Link>
            <Link
              href="/admin/exams"
              className="block w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-medium"
            >
              Manage Exams
            </Link>
            <Link
              href="/admin/leaderboard"
              className="block w-full px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-medium"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-500 text-sm">Activity feed will be displayed here</p>
        </div>
      </div>
    </div>
  )
}

