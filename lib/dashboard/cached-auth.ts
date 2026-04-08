import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/** Dedupes Supabase user fetch within a single RSC tree (layout + page). */
export const getCachedSupabaseUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
})
