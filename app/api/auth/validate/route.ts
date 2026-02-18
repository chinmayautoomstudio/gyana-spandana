import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/auth/validate
 * Verifies the current session's user still exists in auth.users (e.g. not deleted).
 * Returns 200 if valid, 401 if not authenticated or user was deleted.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({}, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: adminUser, error } = await admin.auth.admin.getUserById(user.id)

  if (error || !adminUser?.user) {
    return NextResponse.json({}, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
