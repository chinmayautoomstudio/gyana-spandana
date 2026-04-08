import { redirect } from 'next/navigation'
import { getCachedSupabaseUser } from '@/lib/dashboard/cached-auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, user } = await getCachedSupabaseUser()

  if (!user) {
    redirect('/login?redirectedFrom=/dashboard')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined) ?? 'participant'
  if (role === 'admin') {
    redirect('/admin')
  }

  const { data: participantRow } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!participantRow) {
    redirect('/team/create')
  }

  return <>{children}</>
}
