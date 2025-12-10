'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ExamCalendar } from '@/components/admin/ExamCalendar'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface ScheduledExam {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  duration_minutes: number
}

export default function SchedulePage() {
  const [exams, setExams] = useState<ScheduledExam[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  useEffect(() => {
    const fetchScheduledExams = async () => {
      const supabase = createClient()
      
      // Fetch all exams with schedule information
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
            href="/admin/exams"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Exam Schedule</h1>
          <p className="text-gray-600 mt-1">Manage and view all scheduled exams</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Link href="/admin/exams/new">
            <Button variant="primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Upcoming Exams Summary */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Exams (Next 7 Days)</h3>
        {exams.filter(e => {
          if (!e.scheduled_start) return false
          const examDate = new Date(e.scheduled_start)
          const sevenDaysFromNow = new Date()
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
          return examDate >= new Date() && examDate <= sevenDaysFromNow
        }).length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming exams in the next 7 days</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams
              .filter(e => {
                if (!e.scheduled_start) return false
                const examDate = new Date(e.scheduled_start)
                const sevenDaysFromNow = new Date()
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
                return examDate >= new Date() && examDate <= sevenDaysFromNow
              })
              .slice(0, 6)
              .map((exam) => (
                <Link
                  key={exam.id}
                  href={`/admin/exams/${exam.id}`}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">{exam.title}</p>
                  {exam.scheduled_start && (
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(exam.scheduled_start), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                    exam.status === 'active' ? 'bg-green-100 text-green-800' :
                    exam.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status}
                  </span>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Calendar View */}
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

