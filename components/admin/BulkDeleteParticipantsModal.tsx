'use client'

import { Button } from '@/components/ui/Button'

export interface BulkDeleteParticipantRow {
  id: string
  name: string
  email: string
  team_name: string
}

interface BulkDeleteParticipantsModalProps {
  open: boolean
  participants: BulkDeleteParticipantRow[]
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BulkDeleteParticipantsModal({
  open,
  participants,
  isDeleting,
  onCancel,
  onConfirm,
}: BulkDeleteParticipantsModalProps) {
  if (!open) return null

  const count = participants.length
  const title = count === 1 ? 'Delete this participant?' : `Delete ${count} participants?`

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={() => !isDeleting && onCancel()}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-participants-title"
      >
        <div className="p-6 border-b border-gray-200 shrink-0">
          <h2 id="bulk-delete-participants-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            This will remove their exam attempts and assignments. This cannot be undone.
          </p>
        </div>

        <div className="px-6 py-3 overflow-y-auto flex-1 min-h-0 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Participants to remove
          </p>
          <ul className="space-y-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="text-sm text-gray-900 flex flex-col border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/80"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-gray-600">{p.email}</span>
                <span className="text-xs text-gray-500 mt-0.5">Team: {p.team_name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            onClick={onConfirm}
            disabled={isDeleting}
            isLoading={isDeleting}
            loadingText="Deleting…"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
