'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats() {
  const supabase = await createClient()
  await requireAdmin()

  const [exams, participants, teams, attempts] = await Promise.all([
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_attempts').select('score, status', { count: 'exact' }),
  ])

  const submittedAttempts = attempts.data?.filter(a => a.status === 'submitted') || []
  const averageScore = submittedAttempts.length > 0
    ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
    : 0

  return {
    totalExams: exams.count || 0,
    totalParticipants: participants.count || 0,
    totalTeams: teams.count || 0,
    totalAttempts: attempts.count || 0,
    averageScore,
  }
}

/**
 * Get exam analytics
 */
export async function getExamAnalytics(examId: string) {
  const supabase = await createClient()
  await requireAdmin()

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('score, status, time_taken_minutes')
    .eq('exam_id', examId)

  const submittedAttempts = attempts?.filter(a => a.status === 'submitted') || []
  
  return {
    totalAttempts: attempts?.length || 0,
    submittedAttempts: submittedAttempts.length,
    averageScore: submittedAttempts.length > 0
      ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
      : 0,
  }
}

/**
 * Check for schedule conflicts
 */
export async function checkScheduleConflicts(
  examId: string,
  startTime: string,
  endTime: string
) {
  const supabase = await createClient()
  await requireAdmin()

  const { data: conflicts } = await supabase
    .from('exams')
    .select('id, title, scheduled_start, scheduled_end')
    .neq('id', examId)
    .not('scheduled_start', 'is', null)
    .not('scheduled_end', 'is', null)
    .or(`and(scheduled_start.lte.${endTime},scheduled_end.gte.${startTime})`)

  return conflicts || []
}

/**
 * Admin Management Functions
 */

import type { AdminUser } from '@/types/admin'

// Re-export for backward compatibility
export type { AdminUser }

/**
 * Get all admin users
 */
export async function getAllAdmins(): Promise<{ data: AdminUser[] | null; error: string | null }> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // Get all admin profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, name, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (profileError) {
      return { data: null, error: profileError.message }
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null }
    }

    // Get user details from auth.users (requires admin client)
    const adminClient = createAdminClient()
    const userIds = profiles.map(p => p.user_id)
    
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      return { data: null, error: usersError.message }
    }

    // Combine profile and user data
    const admins: AdminUser[] = profiles
      .map(profile => {
        const user = users?.users?.find(u => u.id === profile.user_id)
        if (!user) return null
        
        return {
          id: user.id,
          email: user.email || '',
          name: profile.name || user.user_metadata?.name || null,
          created_at: profile.created_at || user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        }
      })
      .filter((admin): admin is AdminUser => admin !== null)

    return { data: admins, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to fetch admins' }
  }
}

/**
 * Create admin account directly
 */
export async function createAdminDirect(
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; error: string | null; userId?: string }> {
  try {
    await requireAdmin()

    // Validate inputs
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists, update to admin
      const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            name,
            role: 'admin',
          },
        }
      )

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Update user_profiles
      const supabase = await createClient()
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: existingUser.id,
            role: 'admin',
            name,
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        return { success: false, error: `User updated but profile update failed: ${profileError.message}` }
      }

      return { success: true, error: null, userId: existingUser.id }
    }

    // Create new user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'admin',
      },
    })

    if (createError) {
      return { success: false, error: createError.message }
    }

    if (!newUser.user) {
      return { success: false, error: 'User creation failed: No user data returned' }
    }

    // Create user_profiles record
    const supabase = await createClient()
    const { error: profileError } = await supabase.from('user_profiles').insert({
      user_id: newUser.user.id,
      role: 'admin',
      name,
    })

    if (profileError) {
      return { success: false, error: `User created but profile creation failed: ${profileError.message}` }
    }

    return { success: true, error: null, userId: newUser.user.id }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create admin' }
  }
}

/**
 * Invite admin via email
 */
export async function inviteAdmin(
  email: string,
  name: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    // Validate inputs
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
    }

    const adminClient = createAdminClient()

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      // User exists, update to admin
      const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            name,
            role: 'admin',
          },
        }
      )

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // Update user_profiles
      const supabase = await createClient()
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: existingUser.id,
            role: 'admin',
            name,
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        return { success: false, error: `User updated but profile update failed: ${profileError.message}` }
      }

      return { success: true, error: null }
    }

    // Invite new user
    const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role: 'admin',
      },
    })

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    // If user was created immediately, create profile
    if (invitedUser?.user?.id) {
      const supabase = await createClient()
      await supabase.from('user_profiles').upsert(
        {
          user_id: invitedUser.user.id,
          role: 'admin',
          name,
        },
        { onConflict: 'user_id' }
      )
    }

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invite admin' }
  }
}

/**
 * Remove admin role (convert to participant)
 */
export async function removeAdmin(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    // Get current user to prevent self-removal
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (user.id === userId) {
      return { success: false, error: 'You cannot remove your own admin role' }
    }

    // Update user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ role: 'participant' })
      .eq('user_id', userId)
      .eq('role', 'admin') // Only update if currently admin

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // Optionally update user_metadata for backward compatibility
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: 'participant',
      },
    })

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove admin' }
  }
}

