import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { examId, startTime, endTime } = await request.json()

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
    }

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from('exams')
      .select('id, title, scheduled_start, scheduled_end')
      .neq('id', examId || '')
      .not('scheduled_start', 'is', null)
      .not('scheduled_end', 'is', null)
      .or(`and(scheduled_start.lte.${endTime},scheduled_end.gte.${startTime})`)

    return NextResponse.json({ conflicts: conflicts || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

