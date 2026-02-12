'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AdminProfileEditProps {
    user: any
    profile: any
    currentName: string
}

export function AdminProfileEdit({ user, profile, currentName }: AdminProfileEditProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [formData, setFormData] = useState({
        fullName: currentName,
        newPassword: '',
        confirmPassword: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const supabase = createClient()
            const updates: any = {}

            // Update password if provided
            if (formData.newPassword) {
                if (formData.newPassword !== formData.confirmPassword) {
                    throw new Error('Passwords do not match')
                }
                if (formData.newPassword.length < 6) {
                    throw new Error('Password must be at least 6 characters')
                }

                const { error: passwordError } = await supabase.auth.updateUser({
                    password: formData.newPassword
                })

                if (passwordError) throw passwordError
            }

            // Update profile name
            if (formData.fullName !== (profile?.full_name || user.user_metadata?.full_name)) {
                // Update user_profiles table
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                        user_id: user.id,
                        full_name: formData.fullName,
                        updated_at: new Date().toISOString()
                    })

                if (profileError) throw profileError

                // Also update user metadata
                const { error: metadataError } = await supabase.auth.updateUser({
                    data: { full_name: formData.fullName }
                })

                if (metadataError) throw metadataError
            }

            setMessage({ type: 'success', text: 'Profile updated successfully' })
            setIsEditing(false)
            setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
            router.refresh()

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="mt-4 px-4 py-2 bg-[#C0392B] text-white rounded-lg hover:bg-[#A93226] transition-colors"
            >
                Edit Profile & Reset Password
            </button>
        )
    }

    return (
        <div className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                <button
                    onClick={() => setIsEditing(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
                    />
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Change Password</h4>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={formData.newPassword}
                                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
                                placeholder="Leave empty to keep current"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-[#C0392B] text-white rounded-lg hover:bg-[#A93226] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}
