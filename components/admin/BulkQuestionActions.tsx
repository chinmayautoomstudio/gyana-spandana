'use client'

import { Button } from '@/components/ui/Button'

interface BulkQuestionActionsProps {
  selectedCount: number
  onDelete: () => void
  onAssignToExam: () => void
  onExport: () => void
  onClearSelection: () => void
}

export function BulkQuestionActions({
  selectedCount,
  onDelete,
  onAssignToExam,
  onExport,
  onClearSelection,
}: BulkQuestionActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-[#C0392B]/10 border border-[#C0392B]/20 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-900">
          {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Clear selection
        </button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onAssignToExam}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          Assign to Exam
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </Button>
      </div>
    </div>
  )
}

