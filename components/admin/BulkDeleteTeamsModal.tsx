'use client'

import { Button } from '@/components/ui/Button'

export interface BulkDeleteTeamRow {
  id: string
  team_name: string
  team_code: string
  participants_count: number
}

interface BulkDeleteTeamsModalProps {
  open: boolean
  teams: BulkDeleteTeamRow[]
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BulkDeleteTeamsModal({
  open,
  teams,
  isDeleting,
  onCancel,
  onConfirm,
}: BulkDeleteTeamsModalProps) {
  if (!open) return null

  const count = teams.length
  const title = count === 1 ? 'Delete this team?' : `Delete ${count} teams?`

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
        aria-labelledby="bulk-delete-teams-title"
      >
        <div className="p-6 border-b border-gray-200 shrink-0">
          <h2 id="bulk-delete-teams-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {count === 1
              ? 'This will remove the team’s participant(s) and their exam data. This cannot be undone.'
              : 'This will remove each team’s participants and their exam data. This cannot be undone.'}
          </p>
        </div>

        <div className="px-6 py-3 overflow-y-auto flex-1 min-h-0 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Teams to remove</p>
          <ul className="space-y-2">
            {teams.map((t) => (
              <li
                key={t.id}
                className="text-sm text-gray-900 flex flex-col sm:flex-row sm:items-baseline sm:gap-2 border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/80"
              >
                <span className="font-medium">{t.team_name}</span>
                <span className="font-mono text-xs text-gray-600">{t.team_code}</span>
                {t.participants_count > 0 && (
                  <span className="text-xs text-gray-500 sm:ml-auto">
                    {t.participants_count} participant{t.participants_count !== 1 ? 's' : ''}
                  </span>
                )}
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
