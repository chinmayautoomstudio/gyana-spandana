/**
 * Role management utilities
 * Uses user_profiles table as primary source, with user_metadata as fallback
 */

export type UserRole = 'admin' | 'participant' | string

// Common roles - extensible for future user types
export const ROLES = {
  ADMIN: 'admin',
  PARTICIPANT: 'participant',
} as const

/**
 * Get user profile from database (primary source)
 */
export async function getUserProfile(
  userId: string,
  supabase: any
): Promise<{ role: UserRole; name?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, name')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return { role: data.role, name: data.name }
  } catch (error) {
    return null
  }
}

/**
 * Get user role - checks user_profiles first, then falls back to user_metadata
 */
export async function getUserRole(userId: string, supabase: any): Promise<UserRole> {
  // Try user_profiles table first (primary source)
  const profile = await getUserProfile(userId, supabase)
  if (profile) {
    return profile.role
  }

  // Fallback to user_metadata (for backward compatibility)
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (user?.user_metadata?.role) {
      return user.user_metadata.role as UserRole
    }
  } catch (error) {
    // Ignore errors, return default
  }

  // Default to participant
  return 'participant'
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string, supabase: any): Promise<boolean> {
  const role = await getUserRole(userId, supabase)
  return role === 'admin'
}

/**
 * Set user role in both user_profiles and user_metadata (admin only)
 */
export async function setUserRole(
  userId: string,
  role: UserRole,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update user_profiles table (primary source)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        role: role,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    // Also update user_metadata for backward compatibility
    const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    })

    if (metadataError) {
      // Log but don't fail - user_profiles is primary
      console.warn('Failed to update user_metadata:', metadataError.message)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Create user profile (used during registration)
 */
export async function createUserProfile(
  userId: string,
  role: UserRole,
  supabase: any,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        role: role,
        name: name,
      })

    if (error) {
      // If profile already exists, try to update it
      if (error.code === '23505') { // Unique violation
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role, name })
          .eq('user_id', userId)

        if (updateError) {
          return { success: false, error: updateError.message }
        }
        return { success: true }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Check if current user is admin (client-side)
 */
export async function checkIsAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Try user_profiles first
  const profile = await getUserProfile(user.id, supabase)
  if (profile) {
    return profile.role === 'admin'
  }

  // Fallback to user_metadata
  const role = user.user_metadata?.role as UserRole
  return role === 'admin'
}

/**
 * Get current user role (client-side)
 */
export async function getCurrentUserRole(supabase: any): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'participant'

  // Try user_profiles first
  const profile = await getUserProfile(user.id, supabase)
  if (profile) {
    return profile.role
  }

  // Fallback to user_metadata
  const role = user.user_metadata?.role as UserRole
  return role || 'participant'
}

