import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List all question sets with question counts
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

    // Fetch all question sets with question counts
    const { data: questionSets, error } = await supabase
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ questionSets: questionSets || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create new question set with questions
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, questionIds } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 })
    }

    // Create question set
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (setError) {
      throw new Error(setError.message)
    }

    // Add questions to the set
    const questionSetQuestions = questionIds.map((questionId: string, index: number) => ({
      question_set_id: questionSet.id,
      question_id: questionId,
      order_index: index + 1,
    }))

    const { error: questionsError } = await supabase
      .from('question_set_questions')
      .insert(questionSetQuestions)

    if (questionsError) {
      // Rollback: delete the question set if questions insertion fails
      await supabase.from('question_sets').delete().eq('id', questionSet.id)
      throw new Error(questionsError.message)
    }

    // Fetch the created set with question count
    const { data: createdSet } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', questionSet.id)
      .single()

    return NextResponse.json({
      success: true,
      questionSet: createdSet,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

