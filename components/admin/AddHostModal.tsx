'use client'

import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordStrength } from '@/components/ui/PasswordStrength'
import {
  createHostDirect,
  inviteHost,
  promoteToHost,
  searchUsersForHostPromotion,
} from '@/app/actions/admin'
import type { HostUser } from '@/types/admin'
import {
  createAdminSchema,
  inviteAdminSchema,
  type CreateAdminFormData,
  type InviteAdminFormData,
} from '@/lib/validations'

interface AddHostModalProps {
  onClose: () => void
  onSuccess: () => void
  /** Hide these user ids from search results (already hosts). */
  excludeUserIds?: string[]
}

type Mode = 'promote' | 'create' | 'invite'

export function AddHostModal({ onClose, onSuccess, excludeUserIds = [] }: AddHostModalProps) {
  const [mode, setMode] = useState<Mode>('promote')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<HostUser[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<HostUser | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createForm = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
    },
  })

  const inviteForm = useForm<InviteAdminFormData>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const runSearch = useCallback(async () => {
    if (mode !== 'promote') return
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
  }, [debounced, excludeUserIds, mode])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  const handlePromote = async () => {
    if (!selected) return
    setIsSubmitting(true)
    setActionError(null)
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
        setActionError(result.error || 'Failed to promote user')
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreate = async (data: CreateAdminFormData) => {
    setIsSubmitting(true)
    setActionError(null)
    setSuccess(null)
    try {
      const result = await createHostDirect(data.email, data.name, data.password)
      if (result.success) {
        setSuccess('Host account created successfully.')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 900)
      } else {
        setActionError(result.error || 'Failed to create host')
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInvite = async (data: InviteAdminFormData) => {
    setIsSubmitting(true)
    setActionError(null)
    setSuccess(null)
    try {
      const result = await inviteHost(data.email, data.name)
      if (result.success) {
        setSuccess('Host invitation sent successfully.')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 900)
      } else {
        setActionError(result.error || 'Failed to invite host')
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Unexpected error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModeChange = (next: Mode) => {
    setMode(next)
    setActionError(null)
    setSuccess(null)
    setSearchError(null)
    setSelected(null)
    createForm.reset()
    inviteForm.reset()
  }

  const passwordValue = createForm.watch('password')

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
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-1 text-sm">
            Promote existing users or create/invite a new host account from one place.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleModeChange('promote')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'promote' ? 'bg-white text-[#C0392B] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Promote existing
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('create')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'create' ? 'bg-white text-[#C0392B] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create now
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('invite')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'invite' ? 'bg-white text-[#C0392B] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Invite
            </button>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              {success}
            </div>
          )}
          {actionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {actionError}
            </div>
          )}
          {searchError && mode === 'promote' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {searchError}
            </div>
          )}

          {mode === 'promote' && (
            <>
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

              {searching && <p className="text-sm text-gray-500">Searching...</p>}

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
            </>
          )}

          {mode === 'create' && (
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="host@example.com"
                required
                {...createForm.register('email')}
                error={createForm.formState.errors.email?.message}
              />

              <Input
                label="Name"
                type="text"
                placeholder="Host Name"
                required
                {...createForm.register('name')}
                error={createForm.formState.errors.name?.message}
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter password"
                  required
                  {...createForm.register('password')}
                  error={createForm.formState.errors.password?.message}
                />
                {passwordValue && <PasswordStrength password={passwordValue} />}
                <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                  Create host
                </Button>
              </div>
            </form>
          )}

          {mode === 'invite' && (
            <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="host@example.com"
                required
                {...inviteForm.register('email')}
                error={inviteForm.formState.errors.email?.message}
              />

              <Input
                label="Name"
                type="text"
                placeholder="Host Name"
                required
                {...inviteForm.register('name')}
                error={inviteForm.formState.errors.name?.message}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Email Invitation</p>
                    <p>User receives an invite link and is assigned host access on account activation.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                  Send invite
                </Button>
              </div>
            </form>
          )}

          {mode === 'promote' && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handlePromote()}
                isLoading={isSubmitting}
                disabled={isSubmitting || !selected}
              >
                Promote to host
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
