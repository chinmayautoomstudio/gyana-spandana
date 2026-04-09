import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { READONLY_PRIVATE_CACHE } from '@/lib/http/cache-headers'

const MAX_ANALYTICS_SAMPLE = 10_000

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

    const cacheHeaders = { 'Cache-Control': READONLY_PRIVATE_CACHE }

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('examId')

    if (examId) {
      const [totalRes, submittedRes, avgRow] = await Promise.all([
        supabase
          .from('exam_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', examId),
        supabase
          .from('exam_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', examId)
          .eq('status', 'submitted'),
        supabase
          .from('exam_attempts')
          .select('avg:score.avg()')
          .eq('exam_id', examId)
          .eq('status', 'submitted')
          .maybeSingle(),
      ])

      const avg = (avgRow.data as { avg: number | null } | null)?.avg
      const averageScore = avg != null && !Number.isNaN(Number(avg)) ? Math.round(Number(avg)) : 0

      return NextResponse.json(
        {
          totalAttempts: totalRes.count || 0,
          submittedAttempts: submittedRes.count || 0,
          averageScore,
        },
        { headers: cacheHeaders }
      )
    }

    // General analytics: bounded sample for time_taken distribution if needed later
    const { data: sample, count } = await supabase
      .from('exam_attempts')
      .select('id, score, status, time_taken_minutes', { count: 'exact' })
      .limit(MAX_ANALYTICS_SAMPLE)

    return NextResponse.json(
      {
        message: 'Analytics endpoint',
        sampleSize: sample?.length ?? 0,
        totalRowsEstimate: count ?? sample?.length ?? 0,
        cappedAt: MAX_ANALYTICS_SAMPLE,
      },
      { headers: cacheHeaders }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

