'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Verify if the current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  // Check user_profiles table first (primary source)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // Fallback to user_metadata if profile doesn't exist
  const role = profile?.role || user.user_metadata?.role || 'participant'
  return role === 'admin'
}

/**
 * Verify admin and redirect if not admin
 * Use this in server components or server actions
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) {
    redirect('/dashboard')
  }
}

