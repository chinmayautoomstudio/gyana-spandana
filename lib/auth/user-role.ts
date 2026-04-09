import type { User } from '@supabase/supabase-js'

export async function getUserRoleFromAuthUser(
  supabase: any,
  authUser: User
): Promise<string> {
  const metaRole = authUser.user_metadata?.role
  if (typeof metaRole === 'string' && metaRole.length > 0) {
    return metaRole
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', authUser.id)
    .single()

  return profile?.role ?? 'participant'
}
