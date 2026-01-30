import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List teams assigned to an exam (aggregated from participants)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const examId = resolvedParams.id

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 })
    }

    // Fetch assigned participants with their teams
    const { data: assignments, error } = await supabase
      .from('exam_participants')
      .select(`
        id,
        assigned_at,
        participant:participants(
          id,
          name,
          email,
          is_participant1,
          team_id,
          teams(id, team_name, team_code)
        )
      `)
      .eq('exam_id', examId)

    if (error) {
      throw new Error(error.message)
    }

    // Group participants by team_id
    const teamsMap = new Map<string, {
      team_id: string
      team_name: string
      team_code: string | null
      participant1: {
        id: string
        name: string
        email: string
        assigned: boolean
      } | null
      participant2: {
        id: string
        name: string
        email: string
        assigned: boolean
      } | null
      assigned_count: number
    }>()

    // Process assignments and group by team
    assignments?.forEach((assignment: any) => {
      const participant = assignment.participant
      if (!participant || !participant.teams) return

      const teamId = participant.team_id
      const team = participant.teams

      if (!teamsMap.has(teamId)) {
        teamsMap.set(teamId, {
          team_id: teamId,
          team_name: team.team_name || 'Unknown Team',
          team_code: team.team_code || null,
          participant1: null,
          participant2: null,
          assigned_count: 0,
        })
      }

      const teamData = teamsMap.get(teamId)!
      teamData.assigned_count++

      if (participant.is_participant1) {
        teamData.participant1 = {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          assigned: true,
        }
      } else {
        teamData.participant2 = {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          assigned: true,
        }
      }
    })

    // Convert map to array and add status
    const teams = Array.from(teamsMap.values()).map((team) => ({
      ...team,
      status: team.assigned_count === 2 ? 'complete' : 'partial',
      both_assigned: team.assigned_count === 2,
    }))

    // Sort by team name
    teams.sort((a, b) => a.team_name.localeCompare(b.team_name))

    return NextResponse.json({ teams })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
