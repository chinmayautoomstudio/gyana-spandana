import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Fetch statistics
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

    return NextResponse.json({
      totalExams: exams.count || 0,
      totalParticipants: participants.count || 0,
      totalTeams: teams.count || 0,
      totalAttempts: attempts.count || 0,
      averageScore,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

