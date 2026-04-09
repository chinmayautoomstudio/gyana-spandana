'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { removeHost } from '@/app/actions/admin'
import type { HostUser } from '@/types/admin'

interface HostListProps {
  hosts: HostUser[]
  onRemove: () => void
}

export function HostList({ hosts, onRemove }: HostListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemoveClick = (userId: string) => {
    setShowConfirm(userId)
    setError(null)
  }

  const handleConfirmRemove = async (userId: string) => {
    setRemovingId(userId)
    setError(null)

    const result = await removeHost(userId)

    if (result.success) {
      setShowConfirm(null)
      onRemove()
    } else {
      setError(result.error || 'Failed to remove host')
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

  if (hosts.length === 0) {
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hosts yet</h3>
          <p className="text-gray-500">
            Promote users to host so they appear when assigning a quiz session host.
          </p>
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
                Last sign in
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hosts.map((host) => {
              const isRemoving = removingId === host.id
              const showConfirmDialog = showConfirm === host.id

              return (
                <tr key={host.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                        {host.name
                          ? host.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)
                          : host.email[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="ml-2 sm:ml-4 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {host.name || 'No name'}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden truncate">{host.email}</div>
                        <div className="text-xs text-gray-500 lg:hidden mt-1">
                          <span className="md:hidden">Created: {formatDate(host.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-900">{host.email}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm text-gray-500">{formatDate(host.created_at)}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-sm text-gray-500">{formatDate(host.last_sign_in_at)}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {showConfirmDialog ? (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                        <span className="text-xs text-gray-600 hidden sm:inline">Remove host role?</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmRemove(host.id)}
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
                        onClick={() => handleRemoveClick(host.id)}
                        disabled={isRemoving}
                        title="Remove host role"
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
