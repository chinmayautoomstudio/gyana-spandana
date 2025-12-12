import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Get question set with all questions
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
    const setId = resolvedParams.id

    if (!setId) {
      return NextResponse.json({ error: 'Question set ID is required' }, { status: 400 })
    }

    // Fetch question set
    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', setId)
      .single()

    if (setError) {
      return NextResponse.json({ error: `Question set not found: ${setError.message}` }, { status: 404 })
    }

    if (!questionSet) {
      return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
    }

    // Fetch questions in the set - try with foreign key relationship first
    let setQuestions: any[] = []
    let questionsError: any = null

    // First, try the relationship query
    const { data: setQuestionsData, error: questionsErrorData } = await supabase
      .from('question_set_questions')
      .select(`
        id,
        order_index,
        question_id,
        question:questions(*)
      `)
      .eq('question_set_id', setId)
      .order('order_index', { ascending: true })

    if (questionsErrorData) {
      // Fallback: fetch question IDs first, then fetch questions separately
      const { data: setQuestionIds, error: idsError } = await supabase
        .from('question_set_questions')
        .select('id, order_index, question_id')
        .eq('question_set_id', setId)
        .order('order_index', { ascending: true })

      if (idsError) {
        questionsError = idsError
      } else if (setQuestionIds && setQuestionIds.length > 0) {
        // Fetch questions separately
        const questionIds = setQuestionIds.map((sq: any) => sq.question_id)
        const { data: questionsData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        if (!qError && questionsData) {
          // Combine the data
          setQuestions = setQuestionIds.map((sq: any) => ({
            id: sq.id,
            order_index: sq.order_index,
            question_id: sq.question_id,
            question: questionsData.find((q: any) => q.id === sq.question_id) || null,
          }))
        } else {
          questionsError = qError
        }
      }
    } else {
      setQuestions = setQuestionsData || []
    }

    // Filter out any null questions (in case questions were deleted)
    const validQuestions = setQuestions.filter((sq: any) => sq.question !== null)

    return NextResponse.json({
      questionSet,
      questions: validQuestions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update question set (name, description, questions)
export async function PUT(
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
    const setId = resolvedParams.id

    if (!setId) {
      return NextResponse.json({ error: 'Question set ID is required' }, { status: 400 })
    }
    const body = await request.json()
    const { name, description, questionIds } = body

    // Verify set exists
    const { data: existingSet } = await supabase
      .from('question_sets')
      .select('id')
      .eq('id', setId)
      .single()

    if (!existingSet) {
      return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
    }

    // Update set details if provided
    if (name !== undefined || description !== undefined) {
      const updateData: any = {}
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description?.trim() || null

      const { error: updateError } = await supabase
        .from('question_sets')
        .update(updateData)
        .eq('id', setId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }

    // Update questions if provided
    if (Array.isArray(questionIds)) {
      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('question_set_questions')
        .delete()
        .eq('question_set_id', setId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Insert new questions
      if (questionIds.length > 0) {
        const questionSetQuestions = questionIds.map((questionId: string, index: number) => ({
          question_set_id: setId,
          question_id: questionId,
          order_index: index + 1,
        }))

        const { error: insertError } = await supabase
          .from('question_set_questions')
          .insert(questionSetQuestions)

        if (insertError) {
          throw new Error(insertError.message)
        }
      }
    }

    // Fetch updated set
    const { data: updatedSet } = await supabase
      .from('question_sets')
      .select('*')
      .eq('id', setId)
      .single()

    return NextResponse.json({
      success: true,
      questionSet: updatedSet,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete question set
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
    const setId = resolvedParams.id

    if (!setId) {
      return NextResponse.json({ error: 'Question set ID is required' }, { status: 400 })
    }

    // Delete question set (cascade will delete question_set_questions)
    const { error } = await supabase
      .from('question_sets')
      .delete()
      .eq('id', setId)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Question set deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

