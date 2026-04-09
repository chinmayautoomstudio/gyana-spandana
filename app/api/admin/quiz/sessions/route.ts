import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TeamLabel = 'A' | 'B' | 'C' | 'D'

interface RoundConfigInput {
  round_type: 'direct_question' | 'rapid_fire' | 'true_or_false' | 'buzzer' | 'visual'
  title?: string
  question_set_id?: string
  rapid_fire_duration_seconds?: number
  true_false_mode?: 'directed' | 'buzzer'
}

async function ensureAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role || user.user_metadata?.role || 'participant'
  if (role !== 'admin') return { ok: false, status: 403, error: 'Forbidden' }

  return { ok: true, user }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const auth = await ensureAdmin(supabase)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: sessions, error } = await supabase
      .from('quiz_live_sessions')
      .select(
        `
        *,
        rounds:quiz_rounds(id, round_type, title, status, round_order)
      `,
      )
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await ensureAdmin(supabase)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const {
      title,
      assigned_host_id,
      team_slots,
      points_full,
      points_half,
      rounds,
    } = body as {
      title: string
      assigned_host_id: string
      team_slots: Record<TeamLabel, string>
      points_full: number
      points_half: number
      rounds: RoundConfigInput[]
    }

    if (!title || !assigned_host_id || !team_slots || !rounds?.length) {
      return NextResponse.json(
        { error: 'title, assigned_host_id, team_slots and rounds are required' },
        { status: 400 },
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_live_sessions')
      .insert({
        title,
        assigned_host_id,
        team_slots,
        points_full: Number(points_full || 10),
        points_half: Number(points_half || 5),
        status: 'setup',
        created_by: auth.user.id,
      })
      .select('*')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: sessionError?.message || 'Failed to create session' }, { status: 500 })
    }

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i]
      const { data: createdRound, error: roundError } = await supabase
        .from('quiz_rounds')
        .insert({
          session_id: session.id,
          round_order: i + 1,
          round_type: round.round_type,
          title: round.title || `${round.round_type} ${i + 1}`,
          question_set_id: round.question_set_id || null,
          rapid_fire_duration_seconds: round.rapid_fire_duration_seconds || 45,
          true_false_mode: round.true_false_mode || 'directed',
          status: 'pending',
        })
        .select('*')
        .single()

      if (roundError || !createdRound) {
        return NextResponse.json({ error: roundError?.message || 'Failed to create round' }, { status: 500 })
      }

      if (round.question_set_id) {
        const { data: setQuestions, error: setQuestionsError } = await supabase
          .from('question_set_questions')
          .select('order_index,question_id')
          .eq('question_set_id', round.question_set_id)
          .order('order_index', { ascending: true })

        if (setQuestionsError) {
          return NextResponse.json({ error: setQuestionsError.message }, { status: 500 })
        }

        if (setQuestions && setQuestions.length > 0) {
          const questionIds = setQuestions.map((q) => q.question_id)
          const { data: sourceQuestions, error: sourceError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds)

          if (sourceError) {
            return NextResponse.json({ error: sourceError.message }, { status: 500 })
          }

          const sourceById = new Map((sourceQuestions || []).map((q: any) => [q.id, q]))
          const snapshotRows = setQuestions
            .map((sq) => {
              const src: any = sourceById.get(sq.question_id)
              if (!src) return null
              return {
                round_id: createdRound.id,
                source_question_id: src.id,
                question_text: src.question_text,
                question_type: src.question_type || 'mcq',
                option_a: src.option_a,
                option_b: src.option_b,
                option_c: src.option_c,
                option_d: src.option_d,
                correct_answer: src.correct_answer_tf || src.correct_answer,
                media_url: src.media_url,
                question_order: Number(sq.order_index),
              }
            })
            .filter(Boolean)

          if (snapshotRows.length > 0) {
            const { error: insertQuestionsError } = await supabase
              .from('quiz_questions')
              .insert(snapshotRows as any[])
            if (insertQuestionsError) {
              return NextResponse.json({ error: insertQuestionsError.message }, { status: 500 })
            }
          }
        }
      }
    }

    const scoreRows = (['A', 'B', 'C', 'D'] as TeamLabel[]).map((label) => ({
      session_id: session.id,
      team_label: label,
      team_id: team_slots[label] || null,
      total_score: 0,
      questions_answered: 0,
      questions_correct: 0,
    }))
    await supabase.from('quiz_session_scores').insert(scoreRows)

    return NextResponse.json({ success: true, sessionId: session.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

