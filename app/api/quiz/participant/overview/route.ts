import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function previewText(text: string | null | undefined, maxLen = 72): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1)}…`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant?.team_id) {
      return NextResponse.json({ sessions: [] })
    }

    const teamId = participant.team_id as string

    const { data: sessions, error: sessErr } = await supabase
      .from('quiz_live_sessions')
      .select('id, title, status, team_slots, created_at, current_round_id, is_test_session')
      .order('created_at', { ascending: false })
      .limit(80)

    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 })
    }

    const mine = (sessions || []).filter((s: { team_slots?: Record<string, string> | null }) => {
      const slots = (s.team_slots || {}) as Record<string, string>
      return Object.values(slots).some((v) => v === teamId)
    })

    if (mine.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    const sessionIds = mine.map((s: { id: string }) => s.id)

    const { data: rounds } = await supabase
      .from('quiz_rounds')
      .select('id, session_id, title, round_order, round_type, status')
      .in('session_id', sessionIds)
      .order('round_order', { ascending: true })

    const roundIds = (rounds || []).map((r: { id: string }) => r.id)
    let questions: Array<{
      id: string
      round_id: string
      question_order: number
      question_type: string | null
      question_text: string | null
    }> = []
    if (roundIds.length > 0) {
      const { data: qs } = await supabase
        .from('quiz_questions')
        .select('id, round_id, question_order, question_type, question_text')
        .in('round_id', roundIds)
        .order('question_order', { ascending: true })
      questions = qs || []
    }

    const questionsByRound = new Map<string, typeof questions>()
    for (const q of questions) {
      const list = questionsByRound.get(q.round_id) || []
      list.push(q)
      questionsByRound.set(q.round_id, list)
    }

    const roundsBySession = new Map<string, NonNullable<typeof rounds>>()
    for (const r of rounds || []) {
      const list = roundsBySession.get(r.session_id) || []
      list.push(r)
      roundsBySession.set(r.session_id, list)
    }

    const payload = mine.map(
      (s: {
        id: string
        title: string
        status: string
        is_test_session?: boolean
        created_at: string
      }) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        is_test_session: s.is_test_session,
        created_at: s.created_at,
        rounds: (roundsBySession.get(s.id) || []).map(
          (r: {
            id: string
            title: string
            round_order: number
            round_type: string
            status: string
          }) => ({
            id: r.id,
            title: r.title,
            round_order: r.round_order,
            round_type: r.round_type,
            status: r.status,
            questions: (questionsByRound.get(r.id) || []).map((q) => ({
              id: q.id,
              question_order: q.question_order,
              question_type: q.question_type,
              preview: previewText(q.question_text),
            })),
          }),
        ),
      }),
    )

    return NextResponse.json({ sessions: payload })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
