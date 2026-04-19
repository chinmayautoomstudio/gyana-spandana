import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateExamStatuses } from '@/lib/utils/examScheduler'

/**
 * Activate / complete exams by schedule. Intended for Vercel Cron or similar:
 * GET /api/cron/update-exam-statuses
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Set CRON_SECRET in production. If unset in production, returns 503.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  // SECURITY (VULN-09): Require CRON_SECRET in ALL environments.
  // Without this, staging/dev environments connected to real databases are open.
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const result = await updateExamStatuses(supabase)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
