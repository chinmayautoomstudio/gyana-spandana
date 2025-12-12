'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createAdminDirect, inviteAdmin } from '@/app/actions/admin'

interface AddAdminModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Mode = 'invite' | 'direct'

export function AddAdminModal({ isOpen, onClose, onSuccess }: AddAdminModalProps) {
  const [mode, setMode] = useState<Mode>('invite')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!name || name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    if (mode === 'direct') {
      if (!password) {
        setError('Password is required')
        return
      }

      if (!validatePassword(password)) {
        setError('Password must be at least 8 characters and contain uppercase, lowercase, and a number')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setLoading(true)

    try {
      let result
      if (mode === 'invite') {
        result = await inviteAdmin(email.trim(), name.trim())
      } else {
        result = await createAdminDirect(email.trim(), name.trim(), password)
      }

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to add admin')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setName('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(false)
    setMode('invite')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

      {/* Modal Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-3 py-4 sm:px-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto transform transition-all">
          <div className="bg-white px-3 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Add Admin</h3>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                disabled={loading}
                aria-label="Close"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="mb-4 sm:mb-6">
              <div className="flex gap-1.5 sm:gap-2 p-0.5 sm:p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('invite')
                    setError(null)
                  }}
                  className={`flex-1 px-2.5 py-2 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                    mode === 'invite'
                      ? 'bg-white text-[#C0392B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={loading}
                >
                  Invite Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('direct')
                    setError(null)
                  }}
                  className={`flex-1 px-2.5 py-2 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                    mode === 'direct'
                      ? 'bg-white text-[#C0392B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  disabled={loading}
                >
                  Create Directly
                </button>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs sm:text-sm text-green-800">
                  {mode === 'invite'
                    ? 'Invitation sent successfully!'
                    : 'Admin account created successfully!'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-3 sm:space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="admin@example.com"
                />

                <Input
                  label="Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Admin Name"
                  minLength={2}
                />

                {mode === 'direct' && (
                  <>
                    <Input
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Enter password"
                      helperText="Must be at least 8 characters with uppercase, lowercase, and a number"
                    />

                    <Input
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Confirm password"
                    />
                  </>
                )}

                {mode === 'invite' && (
                  <div className="p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-800">
                      An invitation email will be sent to the provided email address. The user will need to accept the invitation and set their password.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || success}
                  isLoading={loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  {mode === 'invite' ? 'Send Invitation' : 'Create Admin'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

