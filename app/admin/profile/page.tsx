import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { AdminProfileEdit } from '@/components/admin/AdminProfileEdit'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get profile data
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'AD'
    }

    const name = profile?.full_name || user.user_metadata?.full_name || 'Admin User'
    const email = user.email
    const role = profile?.role || user.user_metadata?.role || 'admin'
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-500">Manage your admin profile information</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Avatar Section */}
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 rounded-full ring-4 ring-white shadow-lg overflow-hidden bg-gradient-to-br from-[#C0392B] to-[#E67E22] flex items-center justify-center">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt={name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-4xl font-bold text-white tracking-widest">
                                        {getInitials(name)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                                <p className="text-gray-500">{email}</p>
                                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#C0392B]/10 text-[#C0392B] capitalize">
                                    {role}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium">{name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium">{email}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-medium capitalize">{role}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">User ID</dt>
                            <dd className="mt-1 text-sm text-gray-900 font-mono truncate" title={user.id}>{user.id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Last Sign In</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : 'Never'}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            <AdminProfileEdit user={user} profile={profile} currentName={name} />
        </div>
    )
}
