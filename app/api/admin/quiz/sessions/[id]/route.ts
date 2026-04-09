import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function ensureAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role || user.user_metadata?.role || 'participant'
  if (role !== 'admin') return { ok: false, status: 403, error: 'Forbidden' }

  return { ok: true, user }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const auth = await ensureAdmin(supabase)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id

    const { data: session, error } = await supabase
      .from('quiz_live_sessions')
      .select(
        `
        *,
        rounds:quiz_rounds(*),
        scores:quiz_session_scores(*)
      `,
      )
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const auth = await ensureAdmin(supabase)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id

    const { error } = await supabase.from('quiz_live_sessions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

