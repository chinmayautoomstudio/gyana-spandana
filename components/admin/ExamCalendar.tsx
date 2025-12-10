'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'

interface Exam {
  id: string
  title: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: string
  duration_minutes: number
}

interface ExamCalendarProps {
  exams: Exam[]
  currentDate: Date
  onDateChange: (date: Date) => void
  viewMode: 'month' | 'week' | 'day'
}

export function ExamCalendar({ exams, currentDate, onDateChange, viewMode }: ExamCalendarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'scheduled':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-gray-500'
      case 'draft':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getExamsForDate = (date: Date) => {
    return exams.filter((exam) => {
      if (!exam.scheduled_start) return false
      const examDate = new Date(exam.scheduled_start)
      return isSameDay(examDate, date)
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      onDateChange(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      onDateChange(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    } else {
      onDateChange(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1))
    }
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  let days: Date[] = []
  let startDate: Date
  let endDate: Date

  if (viewMode === 'month') {
    startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    days = eachDayOfInterval({ start: startDate, end: endDate })
  } else if (viewMode === 'week') {
    startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
    endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
    days = eachDayOfInterval({ start: startDate, end: endDate })
  } else {
    days = [currentDate]
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : viewMode === 'week'
              ? `Week of ${format(startDate, 'MMM dd')}`
              : format(currentDate, 'EEEE, MMMM dd, yyyy')}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-[#C0392B] text-white rounded-lg hover:bg-[#A93226] transition-colors text-sm"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      {viewMode !== 'day' && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
      )}

      <div className={`grid ${viewMode === 'month' || viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} gap-1`}>
        {days.map((day, dayIdx) => {
          const dayExams = getExamsForDate(day)
          const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toString()}
              className={`min-h-[100px] p-2 border border-gray-200 rounded-lg ${
                !isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
              } ${isToday ? 'ring-2 ring-[#C0392B]' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#C0392B]' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayExams.slice(0, 3).map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/admin/exams/${exam.id}`}
                    className={`block p-1.5 rounded text-xs text-white truncate ${getStatusColor(exam.status)} hover:opacity-80 transition-opacity`}
                    title={exam.title}
                  >
                    {format(new Date(exam.scheduled_start!), 'HH:mm')} - {exam.title.substring(0, 20)}
                  </Link>
                ))}
                {dayExams.length > 3 && (
                  <div className="text-xs text-gray-500 p-1">
                    +{dayExams.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-xs text-gray-600">Draft</span>
        </div>
      </div>
    </div>
  )
}

