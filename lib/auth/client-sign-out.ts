import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Signs out and hard-navigates so the next request uses cleared auth cookies.
 * Avoids a race with Next.js proxy: soft `router.push('/login')` can run before
 * Supabase finishes updating cookies, so the proxy still sees a session and
 * redirects participants back to `/dashboard`.
 */
export async function signOutAndRedirect(
  supabase: SupabaseClient,
  redirectPath = '/login'
): Promise<void> {
  await supabase.auth.signOut()
  if (typeof window !== 'undefined') {
    window.location.assign(redirectPath)
  }
}
