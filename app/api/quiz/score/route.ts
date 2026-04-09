import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, teamLabel, pointsDelta } = body as {
      sessionId?: string
      teamLabel?: 'A' | 'B' | 'C' | 'D'
      pointsDelta?: number
    }

    if (!sessionId || !teamLabel || typeof pointsDelta !== 'number') {
      return NextResponse.json({ error: 'sessionId, teamLabel, pointsDelta are required' }, { status: 400 })
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_live_sessions')
      .select('id, assigned_host_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    const canWrite = role === 'admin' || session.assigned_host_id === user.id
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('quiz_session_scores')
      .select('id,total_score')
      .eq('session_id', sessionId)
      .eq('team_label', teamLabel)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Score row not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('quiz_session_scores')
      .update({
        total_score: (existing.total_score || 0) + pointsDelta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: scores, error: scoresError } = await supabase
      .from('quiz_session_scores')
      .select('team_label,total_score')
      .eq('session_id', sessionId)

    if (scoresError) {
      return NextResponse.json({ error: scoresError.message }, { status: 500 })
    }

    const scoreMap = TEAM_LABELS.reduce((acc, label) => {
      acc[label] = scores?.find((s) => s.team_label === label)?.total_score || 0
      return acc
    }, {} as Record<(typeof TEAM_LABELS)[number], number>)

    return NextResponse.json({
      success: true,
      scores: scoreMap,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

