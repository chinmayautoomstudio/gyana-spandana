/**
 * Admin-related types
 */

export interface AdminUser {
  id: string
  email: string
  name: string | null
  created_at: string
  last_sign_in_at: string | null
}

/** Same shape as admin listing; used for quiz hosts. */
export type HostUser = AdminUser

