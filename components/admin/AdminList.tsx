'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { removeAdmin } from '@/app/actions/admin'
import type { AdminUser } from '@/types/admin'

interface AdminListProps {
  admins: AdminUser[]
  currentUserId: string | null
  onRemove: () => void
}

export function AdminList({ admins, currentUserId, onRemove }: AdminListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemoveClick = (adminId: string) => {
    setShowConfirm(adminId)
    setError(null)
  }

  const handleConfirmRemove = async (adminId: string) => {
    setRemovingId(adminId)
    setError(null)

    const result = await removeAdmin(adminId)

    if (result.success) {
      setShowConfirm(null)
      onRemove()
    } else {
      setError(result.error || 'Failed to remove admin')
    }

    setRemovingId(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (admins.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No admins found</h3>
          <p className="text-gray-500">Get started by adding your first admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden max-w-full">
      <div className="overflow-x-auto max-w-full -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Email
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Created
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Last Sign In
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => {
              const isCurrentUser = admin.id === currentUserId
              const isRemoving = removingId === admin.id
              const showConfirmDialog = showConfirm === admin.id

              return (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                        {admin.name
                          ? admin.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                          : admin.email[0].toUpperCase()}
                      </div>
                      <div className="ml-2 sm:ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {admin.name || 'No name'}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden truncate">{admin.email}</div>
                        <div className="text-xs text-gray-500 lg:hidden mt-1">
                          <span className="md:hidden">Created: {formatDate(admin.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-900">{admin.email}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm text-gray-500">{formatDate(admin.created_at)}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm text-gray-500">{formatDate(admin.last_sign_in_at)}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {showConfirmDialog ? (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                        <span className="text-xs text-gray-600 hidden sm:inline">Remove admin?</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmRemove(admin.id)}
                            isLoading={isRemoving}
                            disabled={isRemoving}
                            className="flex-1 sm:flex-none"
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowConfirm(null)
                              setError(null)
                            }}
                            disabled={isRemoving}
                            className="flex-1 sm:flex-none"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClick(admin.id)}
                        disabled={isCurrentUser || isRemoving}
                        className={isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}
                        title={isCurrentUser ? 'You cannot remove your own admin role' : 'Remove admin'}
                      >
                        <svg
                          className="w-4 h-4 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    )}
                    {error && showConfirmDialog && (
                      <div className="mt-2 text-xs text-red-600">{error}</div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

