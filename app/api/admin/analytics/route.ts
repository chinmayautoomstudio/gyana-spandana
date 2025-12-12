import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('examId')

    if (examId) {
      // Get exam-specific analytics
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('score, status, time_taken_minutes')
        .eq('exam_id', examId)

      const submittedAttempts = attempts?.filter(a => a.status === 'submitted') || []
      
      return NextResponse.json({
        totalAttempts: attempts?.length || 0,
        submittedAttempts: submittedAttempts.length,
        averageScore: submittedAttempts.length > 0
          ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
          : 0,
      })
    }

    // Return general analytics
    return NextResponse.json({ message: 'Analytics endpoint' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

