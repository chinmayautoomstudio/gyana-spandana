import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List assigned participants for an exam
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

    // Fetch assigned participants
    const { data: assignments, error } = await supabase
      .from('exam_participants')
      .select(`
        id,
        assigned_at,
        participant:participants(
          id,
          name,
          email,
          school_name,
          teams(team_name, team_code)
        )
      `)
      .eq('exam_id', examId)
      .order('assigned_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Assign participants to an exam (bulk)
export async function POST(
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
    const body = await request.json()
    const { participantIds } = body

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'participantIds must be a non-empty array' }, { status: 400 })
    }

    // Verify exam exists
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // Prepare assignments (skip duplicates)
    const assignments = participantIds.map((participantId: string) => ({
      exam_id: examId,
      participant_id: participantId,
      assigned_by: user.id,
    }))

    // Insert assignments (using upsert to handle duplicates gracefully)
    const { data, error } = await supabase
      .from('exam_participants')
      .upsert(assignments, {
        onConflict: 'exam_id,participant_id',
        ignoreDuplicates: true,
      })
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      assigned: data?.length || 0,
      total: participantIds.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Unassign participants from an exam (bulk)
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const participantIdsParam = searchParams.get('participantIds')

    if (!participantIdsParam) {
      return NextResponse.json({ error: 'participantIds query parameter is required' }, { status: 400 })
    }

    let participantIds: string[]
    try {
      participantIds = JSON.parse(participantIdsParam)
    } catch {
      // If not JSON, treat as single ID
      participantIds = [participantIdsParam]
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'participantIds must be a non-empty array' }, { status: 400 })
    }

    // Delete assignments
    const { error } = await supabase
      .from('exam_participants')
      .delete()
      .eq('exam_id', examId)
      .in('participant_id', participantIds)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      unassigned: participantIds.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

