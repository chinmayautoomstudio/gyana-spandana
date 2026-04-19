import type { User } from '@supabase/supabase-js'

/**
 * Resolves the role for an authenticated user by querying the user_profiles table.
 *
 * SECURITY: user_metadata.role is intentionally NOT used as a fallback here.
 * Any authenticated user can mutate their own user_metadata via the Supabase
 * client SDK (supabase.auth.updateUser), which would allow privilege escalation
 * to 'admin' if user_metadata were trusted. Always use the server-side DB value.
 */
export async function getUserRoleFromAuthUser(
  supabase: any,
  authUser: User
): Promise<string> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', authUser.id)
    .single()

  // Default to 'participant' if the profile row is missing — never fall back
  // to user-controlled metadata.
  return profile?.role ?? 'participant'
}
