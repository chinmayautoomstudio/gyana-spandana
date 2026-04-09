'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { promoteToHost, searchUsersForHostPromotion } from '@/app/actions/admin'
import type { HostUser } from '@/types/admin'

interface AddHostModalProps {
  onClose: () => void
  onSuccess: () => void
  /** Hide these user ids from search results (already hosts). */
  excludeUserIds?: string[]
}

export function AddHostModal({ onClose, onSuccess, excludeUserIds = [] }: AddHostModalProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<HostUser[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<HostUser | null>(null)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const runSearch = useCallback(async () => {
    const q = debounced
    const fullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)
    if (q.length < 2 && !fullUuid) {
      setResults([])
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)
    const { data, error } = await searchUsersForHostPromotion(q)
    setSearching(false)
    if (error) {
      setResults([])
      setSearchError(error)
      return
    }
    const exclude = new Set(excludeUserIds)
    setResults((data || []).filter((u) => !exclude.has(u.id)))
  }, [debounced, excludeUserIds])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  const handlePromote = async () => {
    if (!selected) return
    setIsPromoting(true)
    setPromoteError(null)
    setSuccess(null)
    try {
      const result = await promoteToHost(selected.id)
      if (result.success) {
        setSuccess('User promoted to host.')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 900)
      } else {
        setPromoteError(result.error || 'Failed to promote user')
      }
    } catch (e: unknown) {
      setPromoteError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setIsPromoting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add host</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isPromoting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-1 text-sm">
            Search by name, email, or user ID. Hosts can run assigned quiz sessions and access host routes.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              {success}
            </div>
          )}
          {promoteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {promoteError}
            </div>
          )}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {searchError}
            </div>
          )}

          <Input
            label="Search users"
            type="text"
            placeholder="Name, email, or UUID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 -mt-2">
            Email lookup scans auth users in pages (may be slow for very large projects).
          </p>

          {searching && <p className="text-sm text-gray-500">Searching…</p>}

          {!searching && debounced.length >= 2 && results.length === 0 && !searchError && (
            <p className="text-sm text-gray-500">No matching users eligible for host promotion.</p>
          )}

          {results.length > 0 && (
            <ul className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(u)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selected?.id === u.id ? 'bg-[#C0392B]/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{u.name || 'No name'}</span>
                    <span className="block text-xs text-gray-500 truncate">{u.email}</span>
                    <span className="block text-xs text-gray-400 font-mono truncate">{u.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPromoting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handlePromote()}
              isLoading={isPromoting}
              disabled={isPromoting || !selected}
            >
              Promote to host
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
