'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ExamCalendar } from '@/components/admin/ExamCalendar'
import { ScheduleModal } from '@/components/admin/ScheduleModal'
import { format } from 'date-fns'

interface ScheduledExam {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  duration_minutes: number
}

export default function SchedulePage() {
  const [allExams, setAllExams] = useState<ScheduledExam[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['active', 'scheduled', 'completed', 'draft'])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showExamSelector, setShowExamSelector] = useState(false)
  const [selectedExam, setSelectedExam] = useState<ScheduledExam | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchExams = async () => {
    setRefreshing(true)
    const supabase = createClient()
    
    // Fetch ALL exams (not just scheduled ones) to allow scheduling unscheduled exams
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, scheduled_start, scheduled_end, status, duration_minutes')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching exams:', error)
    } else {
      setAllExams(data || [])
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchExams()
  }, [])

  // Filter exams based on selected statuses
  const filteredExams = allExams.filter(exam => selectedStatuses.includes(exam.status))

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedExam(null)
    // Show exam selector if there are exams to choose from
    if (allExams.length > 0) {
      setShowExamSelector(true)
    } else {
      alert('No exams available. Please create an exam first.')
    }
  }

  const handleExamClick = (exam: ScheduledExam) => {
    setSelectedExam(exam)
    setSelectedDate(null)
    setShowScheduleModal(true)
  }

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const handleSaveSchedule = async (start: string, end: string) => {
    if (!selectedExam) {
      throw new Error('No exam selected')
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('You must be logged in to schedule exams')
      return
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      alert('Unauthorized: Only admins can schedule exams')
      return
    }

    // Update exam schedule
    const { error } = await supabase
      .from('exams')
      .update({
        scheduled_start: new Date(start).toISOString(),
        scheduled_end: new Date(end).toISOString(),
        status: selectedExam.status === 'draft' ? 'scheduled' : selectedExam.status,
      })
      .eq('id', selectedExam.id)

    if (error) {
      throw new Error(error.message)
    }

    // Refresh exams list
    await fetchExams()
  }

  const handleCloseModal = () => {
    setShowScheduleModal(false)
    setShowExamSelector(false)
    setSelectedExam(null)
    setSelectedDate(null)
  }

  const handleExamSelect = (exam: ScheduledExam) => {
    setSelectedExam(exam)
    setShowExamSelector(false)
    setShowScheduleModal(true)
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
            <Button variant="primary" size="md">
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
        {filteredExams.filter(e => {
          if (!e.scheduled_start) return false
          const examDate = new Date(e.scheduled_start)
          const sevenDaysFromNow = new Date()
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
          return examDate >= new Date() && examDate <= sevenDaysFromNow
        }).length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming exams in the next 7 days</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams
              .filter(e => {
                if (!e.scheduled_start) return false
                const examDate = new Date(e.scheduled_start)
                const sevenDaysFromNow = new Date()
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
                return examDate >= new Date() && examDate <= sevenDaysFromNow
              })
              .slice(0, 6)
              .map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => handleExamClick(exam)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
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
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <ExamCalendar
          exams={filteredExams}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onDateClick={handleDateClick}
          onExamClick={handleExamClick}
          selectedStatuses={selectedStatuses}
        />
        {/* Status Filter Controls */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
            {['active', 'scheduled', 'completed', 'draft'].map((status) => {
              const isSelected = selectedStatuses.includes(status)
              const statusColors: Record<string, { bg: string; text: string }> = {
                active: { bg: 'bg-green-100', text: 'text-green-800' },
                scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
                completed: { bg: 'bg-gray-100', text: 'text-gray-800' },
                draft: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
              }
              return (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? `${statusColors[status].bg} ${statusColors[status].text} ring-2 ring-offset-2 ring-gray-300`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Exam Selector Modal */}
      {showExamSelector && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Select Exam to Schedule</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                Select an exam to schedule for {format(selectedDate, 'MMMM dd, yyyy')}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allExams.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No exams available. Create an exam first.</p>
                ) : (
                  allExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => handleExamSelect(exam)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{exam.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Status: <span className="capitalize">{exam.status}</span>
                            {exam.scheduled_start && (
                              <> • Currently scheduled: {format(new Date(exam.scheduled_start), 'MMM dd, yyyy HH:mm')}</>
                            )}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedExam && (
        <ScheduleModal
          examId={selectedExam.id}
          examTitle={selectedExam.title}
          currentStart={selectedExam.scheduled_start || (selectedDate ? selectedDate.toISOString().slice(0, 16) : null)}
          currentEnd={selectedExam.scheduled_end || null}
          onSave={handleSaveSchedule}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

