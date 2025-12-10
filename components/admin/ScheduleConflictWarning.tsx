'use client'

import Link from 'next/link'
import { format } from 'date-fns'

interface Conflict {
  id: string
  title: string
  scheduled_start: string
  scheduled_end: string
}

interface ScheduleConflictWarningProps {
  conflicts: Conflict[]
}

export function ScheduleConflictWarning({ conflicts }: ScheduleConflictWarningProps) {
  if (conflicts.length === 0) return null

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Schedule Conflict Detected
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            The selected time slot overlaps with {conflicts.length} existing exam{conflicts.length > 1 ? 's' : ''}:
          </p>
          <ul className="space-y-2">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className="text-sm">
                <Link
                  href={`/admin/exams/${conflict.id}`}
                  className="text-yellow-800 hover:text-yellow-900 underline"
                >
                  {conflict.title}
                </Link>
                <span className="text-yellow-600 ml-2">
                  ({format(new Date(conflict.scheduled_start), 'MMM dd, HH:mm')} - {format(new Date(conflict.scheduled_end), 'HH:mm')})
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600 mt-3">
            You can still save, but participants may have scheduling conflicts.
          </p>
        </div>
      </div>
    </div>
  )
}

