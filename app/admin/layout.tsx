import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminLayoutClient from './_components/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const supabaseAdmin = createAdminClient()
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, name')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role ?? user.user_metadata?.role ?? 'participant'
  if (role !== 'admin') redirect('/dashboard')

  return (
    <AdminLayoutClient
      userName={profile?.name ?? user.email?.split('@')[0] ?? 'Admin'}
      userEmail={user.email ?? ''}
      userRole={role}
    >
      {children}
    </AdminLayoutClient>
  )
}
