import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEvents } from 'ics'

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

    // Fetch scheduled exams
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, description, scheduled_start, scheduled_end')
      .not('scheduled_start', 'is', null)
      .not('scheduled_end', 'is', null)

    // Generate iCal events
    const events = (exams || []).map((exam) => {
      const start = new Date(exam.scheduled_start!)
      const end = new Date(exam.scheduled_end!)

      return {
        title: exam.title,
        description: exam.description || '',
        start: [
          start.getFullYear(),
          start.getMonth() + 1,
          start.getDate(),
          start.getHours(),
          start.getMinutes(),
        ] as [number, number, number, number, number],
        end: [
          end.getFullYear(),
          end.getMonth() + 1,
          end.getDate(),
          end.getHours(),
          end.getMinutes(),
        ] as [number, number, number, number, number],
      }
    })

    const { error, value } = createEvents(events)

    if (error) {
      return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 })
    }

    return new NextResponse(value, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="exam-schedule.ics"',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

