'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { AdminUser, HostUser } from '@/types/admin'

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

/**
 * Get all admin users
 */
export async function getAllAdmins(): Promise<{ data: AdminUser[] | null; error: string | null }> {
  try {
    await requireAdmin()
    const adminClient = createAdminClient()

    // Service role bypasses RLS so admin rows are not hidden when JWT user_metadata.role is missing
    const { data: profiles, error: profileError } = await adminClient
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

    // Per-user lookup avoids listUsers() first-page pagination dropping admins
    const combined = await Promise.all(
      profiles.map(async (profile) => {
        const { data, error } = await adminClient.auth.admin.getUserById(profile.user_id)
        if (error || !data?.user) return null
        const user = data.user
        return {
          id: user.id,
          email: user.email || '',
          name: profile.name || user.user_metadata?.name || null,
          created_at: profile.created_at || user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        } satisfies AdminUser
      })
    )

    const admins = combined.filter((admin): admin is AdminUser => admin !== null)

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
 * Create host account directly
 */
export async function createHostDirect(
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; error: string | null; userId?: string }> {
  try {
    await requireAdmin()

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
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (existingUser) {
      const { data: existingProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingProfile?.role === 'admin') {
        return {
          success: false,
          error: 'User is an admin. Demote from admin first if they should only be a host.',
        }
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          name,
          role: 'host',
        },
      })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      const { error: profileError } = await adminClient
        .from('user_profiles')
        .upsert(
          {
            user_id: existingUser.id,
            role: 'host',
            name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        return { success: false, error: `User updated but profile update failed: ${profileError.message}` }
      }

      return { success: true, error: null, userId: existingUser.id }
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'host',
      },
    })

    if (createError) {
      return { success: false, error: createError.message }
    }

    if (!newUser.user) {
      return { success: false, error: 'User creation failed: No user data returned' }
    }

    const { error: profileError } = await adminClient.from('user_profiles').insert({
      user_id: newUser.user.id,
      role: 'host',
      name,
    })

    if (profileError) {
      return { success: false, error: `User created but profile creation failed: ${profileError.message}` }
    }

    return { success: true, error: null, userId: newUser.user.id }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create host' }
  }
}

/**
 * Invite host via email
 */
export async function inviteHost(
  email: string,
  name: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' }
    }
    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
    }

    const adminClient = createAdminClient()
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === email)

    if (existingUser) {
      const { data: existingProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (existingProfile?.role === 'admin') {
        return {
          success: false,
          error: 'User is an admin. Demote from admin first if they should only be a host.',
        }
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          name,
          role: 'host',
        },
      })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      const { error: profileError } = await adminClient
        .from('user_profiles')
        .upsert(
          {
            user_id: existingUser.id,
            role: 'host',
            name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        return { success: false, error: `User updated but profile update failed: ${profileError.message}` }
      }

      return { success: true, error: null }
    }

    const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role: 'host',
      },
    })

    if (inviteError) {
      return { success: false, error: inviteError.message }
    }

    if (invitedUser?.user?.id) {
      await adminClient.from('user_profiles').upsert(
        {
          user_id: invitedUser.user.id,
          role: 'host',
          name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to invite host' }
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

/**
 * Host Management (quiz hosts — role `host` in user_profiles)
 */

function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_\\]/g, '\\$&')
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * List users with role host (for Host Management page).
 */
export async function getAllHosts(): Promise<{ data: HostUser[] | null; error: string | null }> {
  try {
    await requireAdmin()
    const adminClient = createAdminClient()

    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('user_id, name, created_at')
      .eq('role', 'host')
      .order('created_at', { ascending: false })

    if (profileError) {
      return { data: null, error: profileError.message }
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null }
    }

    const combined = await Promise.all(
      profiles.map(async (profile) => {
        const { data, error } = await adminClient.auth.admin.getUserById(profile.user_id)
        if (error || !data?.user) return null
        const user = data.user
        return {
          id: user.id,
          email: user.email || '',
          name: profile.name || user.user_metadata?.name || null,
          created_at: profile.created_at || user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        } satisfies HostUser
      }),
    )

    const hosts = combined.filter((h): h is HostUser => h !== null)
    return { data: hosts, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hosts'
    return { data: null, error: message }
  }
}

async function hostCandidateFromProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  profileName: string | null,
  profileCreatedAt: string | null,
): Promise<HostUser | null> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data?.user) return null
  const user = data.user
  return {
    id: user.id,
    email: user.email || '',
    name: profileName || user.user_metadata?.name || null,
    created_at: profileCreatedAt || user.created_at,
    last_sign_in_at: user.last_sign_in_at || null,
  }
}

/**
 * Search users who can be promoted to host (not admin, not host).
 * Matches profile name (ilike), exact user_id (UUID), or exact email (paginated auth list, best-effort).
 */
export async function searchUsersForHostPromotion(
  query: string,
): Promise<{ data: HostUser[] | null; error: string | null }> {
  try {
    await requireAdmin()
    const q = query.trim()
    if (q.length < 2 && !UUID_RE.test(q)) {
      return { data: [], error: null }
    }

    const adminClient = createAdminClient()
    const seen = new Set<string>()
    const results: HostUser[] = []

    const pushCandidate = async (
      userId: string,
      profileName: string | null,
      profileCreatedAt: string | null,
    ) => {
      if (seen.has(userId)) return
      const { data: row } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
      const role = row?.role
      if (role === 'admin' || role === 'host') return
      const candidate = await hostCandidateFromProfile(adminClient, userId, profileName, profileCreatedAt)
      if (!candidate) return
      seen.add(userId)
      results.push(candidate)
    }

    if (UUID_RE.test(q)) {
      const { data: prof } = await adminClient
        .from('user_profiles')
        .select('user_id, name, created_at, role')
        .eq('user_id', q)
        .maybeSingle()
      if (prof && prof.role !== 'admin' && prof.role !== 'host') {
        await pushCandidate(prof.user_id, prof.name, prof.created_at)
      } else if (!prof) {
        await pushCandidate(q, null, null)
      }
      return { data: results, error: null }
    }

    if (q.includes('@')) {
      const normalized = q.toLowerCase()
      let page = 1
      const perPage = 200
      for (let i = 0; i < 15; i++) {
        const { data: pageData, error: listError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        })
        if (listError) {
          return { data: null, error: listError.message }
        }
        const users = pageData?.users ?? []
        const match = users.find((u) => u.email?.toLowerCase() === normalized)
        if (match) {
          const { data: prof } = await adminClient
            .from('user_profiles')
            .select('name, created_at, role')
            .eq('user_id', match.id)
            .maybeSingle()
          if (prof?.role === 'admin' || prof?.role === 'host') {
            return { data: [], error: null }
          }
          await pushCandidate(match.id, prof?.name ?? null, prof?.created_at ?? null)
          break
        }
        if (users.length < perPage) break
        page += 1
      }
      return { data: results, error: null }
    }

    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('user_id, name, created_at, role')
      .ilike('name', `%${escapeIlikePattern(q)}%`)
      .limit(40)

    if (profileError) {
      return { data: null, error: profileError.message }
    }

    for (const p of profiles || []) {
      if (p.role === 'admin' || p.role === 'host') continue
      await pushCandidate(p.user_id, p.name, p.created_at)
      if (results.length >= 25) break
    }

    return { data: results, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed'
    return { data: null, error: message }
  }
}

/**
 * Promote a user to host (updates user_profiles + auth user_metadata).
 */
export async function promoteToHost(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()
    if (!userId || !UUID_RE.test(userId)) {
      return { success: false, error: 'Invalid user id' }
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role, name')
      .eq('user_id', userId)
      .maybeSingle()

    if (profile?.role === 'admin') {
      return {
        success: false,
        error: 'User is an admin. Demote from admin first if they should only be a host.',
      }
    }
    if (profile?.role === 'host') {
      return { success: true, error: null }
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(userId)
    if (authError || !authData?.user) {
      return { success: false, error: authError?.message || 'User not found' }
    }

    const name =
      profile?.name ??
      (authData.user.user_metadata?.name as string | undefined) ??
      authData.user.email?.split('@')[0] ??
      'User'

    const { error: upsertError } = await adminClient.from('user_profiles').upsert(
      {
        user_id: userId,
        role: 'host',
        name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (upsertError) {
      return { success: false, error: upsertError.message }
    }

    const { error: metaError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authData.user.user_metadata,
        role: 'host',
        name,
      },
    })

    if (metaError) {
      return {
        success: false,
        error: `Profile updated but auth metadata sync failed: ${metaError.message}`,
      }
    }

    return { success: true, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to promote user'
    return { success: false, error: message }
  }
}

/**
 * Remove host role (user becomes participant).
 */
export async function removeHost(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireAdmin()

    const adminClient = createAdminClient()

    const { data: updatedRows, error: profileError } = await adminClient
      .from('user_profiles')
      .update({ role: 'participant', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('role', 'host')
      .select('user_id')

    if (profileError) {
      return { success: false, error: profileError.message }
    }
    if (!updatedRows?.length) {
      return { success: false, error: 'User is not a host' }
    }

    const { data: authData } = await adminClient.auth.admin.getUserById(userId)
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authData?.user?.user_metadata,
        role: 'participant',
      },
    })

    return { success: true, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove host'
    return { success: false, error: message }
  }
}

export type DeleteTeamResult = { success: true } | { success: false; error: string }
export type DeleteParticipantResult = { success: true } | { success: false; error: string }
export type TeamEliminationResult = { success: true } | { success: false; error: string }

/**
 * Soft-eliminate a team (admin only).
 * Data remains intact; team is excluded from competition flows.
 */
export async function eliminateTeam(teamId: string): Promise<TeamEliminationResult> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin.from('teams').update({ is_eliminated: true }).eq('id', teamId)
  if (error) {
    return { success: false, error: error.message || 'Failed to eliminate team' }
  }
  return { success: true }
}

/**
 * Restore an eliminated team (admin only).
 */
export async function restoreTeam(teamId: string): Promise<TeamEliminationResult> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin.from('teams').update({ is_eliminated: false }).eq('id', teamId)
  if (error) {
    return { success: false, error: error.message || 'Failed to restore team' }
  }
  return { success: true }
}

/**
 * Delete a team and all its participants (admin only).
 * Cascades: participants -> exam_attempts, exam_participants, etc.
 */
export async function deleteTeam(teamId: string): Promise<DeleteTeamResult> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error: participantsError } = await admin
    .from('participants')
    .delete()
    .eq('team_id', teamId)
  if (participantsError) {
    return { success: false, error: participantsError.message || 'Failed to delete team participants' }
  }
  const { error: teamError } = await admin.from('teams').delete().eq('id', teamId)
  if (teamError) {
    return { success: false, error: teamError.message || 'Failed to delete team' }
  }
  return { success: true }
}

/**
 * Delete a single participant (admin only).
 * DB cascades handle exam_attempts, exam_participants, etc.
 */
export async function deleteParticipant(participantId: string): Promise<DeleteParticipantResult> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { error } = await admin.from('participants').delete().eq('id', participantId)
  if (error) {
    return { success: false, error: error.message || 'Failed to delete participant' }
  }
  return { success: true }
}

