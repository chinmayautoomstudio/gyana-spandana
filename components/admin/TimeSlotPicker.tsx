'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TimeSlotPickerProps {
  startDate: string
  endDate: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  onConflictsDetected: (conflicts: any[]) => void
  examId: string
}

export function TimeSlotPicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onConflictsDetected,
  examId,
}: TimeSlotPickerProps) {
  const [duration, setDuration] = useState(60) // minutes

  useEffect(() => {
    // Check for conflicts when dates change
    const checkConflicts = async () => {
      if (!startDate || !endDate) {
        onConflictsDetected([])
        return
      }

      const supabase = createClient()
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Find exams that overlap with the selected time slot
      const { data: conflicts } = await supabase
        .from('exams')
        .select('id, title, scheduled_start, scheduled_end')
        .neq('id', examId)
        .not('scheduled_start', 'is', null)
        .not('scheduled_end', 'is', null)
        .or(`and(scheduled_start.lte.${end.toISOString()},scheduled_end.gte.${start.toISOString()})`)

      onConflictsDetected(conflicts || [])
    }

    checkConflicts()
  }, [startDate, endDate, examId, onConflictsDetected])

  useEffect(() => {
    // Auto-calculate end date based on duration
    if (startDate && duration) {
      const start = new Date(startDate)
      const end = new Date(start.getTime() + duration * 60000)
      onEndChange(end.toISOString().slice(0, 16))
    }
  }, [startDate, duration, onEndChange])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Duration (minutes)
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
          min={1}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            min={startDate}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
            required
          />
        </div>
      </div>

      {startDate && endDate && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Duration:</strong> {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000)} minutes
          </p>
        </div>
      )}
    </div>
  )
}

