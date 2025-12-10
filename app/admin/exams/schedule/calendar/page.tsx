'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ExamCalendar } from '@/components/admin/ExamCalendar'

interface ScheduledExam {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  duration_minutes: number
}

export default function CalendarViewPage() {
  const [exams, setExams] = useState<ScheduledExam[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  useEffect(() => {
    const fetchScheduledExams = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, scheduled_start, scheduled_end, status, duration_minutes')
        .not('scheduled_start', 'is', null)
        .order('scheduled_start', { ascending: true })

      if (error) {
        console.error('Error fetching scheduled exams:', error)
      } else {
        setExams(data || [])
      }
      setLoading(false)
    }

    fetchScheduledExams()
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
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/exams/schedule"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Schedule
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Calendar View</h1>
          <p className="text-gray-600 mt-1">Visual calendar of all scheduled exams</p>
        </div>
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'month'
                ? 'bg-[#C0392B] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'week'
                ? 'bg-[#C0392B] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'day'
                ? 'bg-[#C0392B] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <ExamCalendar
          exams={exams}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
        />
      </div>
    </div>
  )
}

