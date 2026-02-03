import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List all teams with their participants
export async function GET(request: NextRequest) {
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

    // Fetch all teams with their participants
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        team_name,
        team_code,
        authority_name,
        authority_email,
        authority_phone,
        created_at,
        participants:participants(
          id,
          name,
          email,
          school_name,
          is_participant1
        )
      `)
      .order('team_name', { ascending: true })

    if (teamsError) {
      throw new Error(teamsError.message)
    }

    // Transform data to include participant1 and participant2
    const teamsWithParticipants = (teams || []).map((team: any) => {
      const participants = team.participants || []
      const participant1 = participants.find((p: any) => p.is_participant1)
      const participant2 = participants.find((p: any) => !p.is_participant1)

      return {
        id: team.id,
        team_name: team.team_name,
        team_code: team.team_code,
        authority_name: team.authority_name,
        authority_email: team.authority_email,
        authority_phone: team.authority_phone,
        created_at: team.created_at,
        participant1: participant1 || null,
        participant2: participant2 || null,
        participantIds: participants.map((p: any) => p.id),
      }
    })

    return NextResponse.json({ teams: teamsWithParticipants })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
