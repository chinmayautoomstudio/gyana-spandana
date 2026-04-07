import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { READONLY_PRIVATE_CACHE } from '@/lib/http/cache-headers'

export async function GET() {
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

    const cacheHeaders = { 'Cache-Control': READONLY_PRIVATE_CACHE }

    const [exams, participants, teams, attempts, avgRes] = await Promise.all([
      supabase.from('exams').select('id', { count: 'exact', head: true }),
      supabase.from('participants').select('id', { count: 'exact', head: true }),
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('exam_attempts').select('id', { count: 'exact', head: true }),
      supabase
        .from('exam_attempts')
        .select('avg:score.avg()')
        .eq('status', 'submitted')
        .maybeSingle(),
    ])

    const avg = (avgRes.data as { avg: number | null } | null)?.avg
    const averageScore = avg != null && !Number.isNaN(Number(avg)) ? Math.round(Number(avg)) : 0

    return NextResponse.json(
      {
        totalExams: exams.count || 0,
        totalParticipants: participants.count || 0,
        totalTeams: teams.count || 0,
        totalAttempts: attempts.count || 0,
        averageScore,
      },
      { headers: cacheHeaders }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

