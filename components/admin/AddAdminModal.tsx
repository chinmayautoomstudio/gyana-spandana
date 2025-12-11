'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordStrength } from '@/components/ui/PasswordStrength'
import { createAdminDirect, inviteAdmin } from '@/app/actions/admin'
import { createAdminSchema, inviteAdminSchema, type CreateAdminFormData, type InviteAdminFormData } from '@/lib/validations'

interface AddAdminModalProps {
  onClose: () => void
  onSuccess: () => void
}

type Mode = 'create' | 'invite'

export function AddAdminModal({ onClose, onSuccess }: AddAdminModalProps) {
  const [mode, setMode] = useState<Mode>('create')
  const [error, setError] = useState<string | null>(null)
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

  const handleCreateSubmit = async (data: CreateAdminFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await createAdminDirect(data.email, data.name, data.password)

      if (result.success) {
        setSuccess('Admin account created successfully!')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to create admin account')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteSubmit = async (data: InviteAdminFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await inviteAdmin(data.email, data.name)

      if (result.success) {
        setSuccess('Admin invitation sent successfully!')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to send admin invitation')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    createForm.reset()
    inviteForm.reset()
  }

  const passwordValue = createForm.watch('password')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add Admin</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-1">Create a new admin account or send an invitation</p>
        </div>

        <div className="p-6">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleModeChange('create')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'bg-white text-[#C0392B] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Admin
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('invite')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'invite'
                  ? 'bg-white text-[#C0392B] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Invite Admin
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Create Admin Form */}
          {mode === 'create' && (
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="admin@example.com"
                required
                {...createForm.register('email')}
                error={createForm.formState.errors.email?.message}
              />

              <Input
                label="Name"
                type="text"
                placeholder="Admin Name"
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
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                  Create Admin
                </Button>
              </div>
            </form>
          )}

          {/* Invite Admin Form */}
          {mode === 'invite' && (
            <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="admin@example.com"
                required
                {...inviteForm.register('email')}
                error={inviteForm.formState.errors.email?.message}
              />

              <Input
                label="Name"
                type="text"
                placeholder="Admin Name"
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
                    <p>An invitation email will be sent to the provided email address. The recipient will need to set their password when accepting the invitation.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                  Send Invitation
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

