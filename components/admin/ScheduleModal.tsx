'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TimeSlotPicker } from './TimeSlotPicker'
import { ScheduleConflictWarning } from './ScheduleConflictWarning'

interface ScheduleModalProps {
  examId: string
  examTitle: string
  currentStart?: string | null
  currentEnd?: string | null
  onSave: (start: string, end: string) => Promise<void>
  onClose: () => void
}

export function ScheduleModal({
  examId,
  examTitle,
  currentStart,
  currentEnd,
  onSave,
  onClose,
}: ScheduleModalProps) {
  const [startDate, setStartDate] = useState(
    currentStart ? new Date(currentStart).toISOString().slice(0, 16) : ''
  )
  const [endDate, setEndDate] = useState(
    currentEnd ? new Date(currentEnd).toISOString().slice(0, 16) : ''
  )
  const [conflicts, setConflicts] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end times')
      return
    }

    setIsSaving(true)
    try {
      await onSave(startDate, endDate)
      onClose()
    } catch (error: any) {
      alert(`Error saving schedule: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Schedule Exam</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-1">{examTitle}</p>
        </div>

        <div className="p-6 space-y-6">
          <TimeSlotPicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onConflictsDetected={setConflicts}
            examId={examId}
          />

          {conflicts.length > 0 && (
            <ScheduleConflictWarning conflicts={conflicts} />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!startDate || !endDate}
            >
              Save Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

