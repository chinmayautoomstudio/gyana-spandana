import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** For /login and /signup: send authenticated users to the right destination. */
export async function redirectAuthenticatedAwayFromAuthPages() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const [{ data: profile }, { data: participant }] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle(),
    supabase.from('participants').select('id').eq('user_id', user.id).maybeSingle(),
  ])

  const role = profile?.role ?? (user.user_metadata?.role as string | undefined) ?? 'participant'
  if (role === 'admin') redirect('/admin')
  if (participant) redirect('/dashboard')
  redirect('/team/create')
}
