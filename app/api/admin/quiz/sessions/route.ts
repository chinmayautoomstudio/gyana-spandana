import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
type TeamLabel = 'A' | 'B' | 'C' | 'D'

const SLOT_LABELS: TeamLabel[] = ['A', 'B', 'C', 'D']

function normalizeTeamSlots(raw: Record<string, unknown> | null | undefined): Record<TeamLabel, string> {
  const out = {} as Record<TeamLabel, string>
  for (const label of SLOT_LABELS) {
    const v = raw?.[label]
    out[label] = typeof v === 'string' ? v.trim() : ''
  }
  return out
}

function validateTeamSlots(isTest: boolean, slots: Record<TeamLabel, string>): string | null {
  const filled = SLOT_LABELS.map((l) => slots[l]).filter((id) => id.length > 0)
  const unique = new Set(filled)
  if (isTest) {
    if (filled.length < 1) return 'Testing session requires at least one team'
    if (unique.size !== filled.length) return 'Each team slot must be unique'
    return null
  }
  if (filled.length !== 4) return 'Live session requires all 4 team slots'
  if (unique.size !== 4) return 'Each team slot must be unique'
  return null
}

interface RoundConfigInput {
  round_type: 'direct_question' | 'rapid_fire' | 'true_or_false' | 'buzzer' | 'visual'
  title?: string
  question_set_id?: string
  rapid_fire_duration_seconds?: number
  true_false_mode?: 'directed' | 'buzzer'
  /** If omitted or empty, all questions from the set are included (ordered by order_index). */
  question_count?: number | string | null
}

/** null = use all questions; positive int = cap; -1 = invalid */
function parseRoundQuestionCount(raw: unknown): number | null | -1 {
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'string' && raw.trim() === '') return null
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10)
  if (!Number.isFinite(n) || Number.isNaN(n) || !Number.isInteger(n) || n <= 0) return -1
  return n
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
      team_slots: rawTeamSlots,
      points_full,
      points_half,
      rounds,
      is_test_session: rawTest,
    } = body as {
      title: string
      assigned_host_id: string
      team_slots: Record<string, string>
      points_full: number
      points_half: number
      rounds: RoundConfigInput[]
      is_test_session?: boolean
    }

    const is_test_session = Boolean(rawTest)
    const team_slots = normalizeTeamSlots(rawTeamSlots)

    if (!title || !assigned_host_id || !rawTeamSlots || !rounds?.length) {
      return NextResponse.json(
        { error: 'title, assigned_host_id, team_slots and rounds are required' },
        { status: 400 },
      )
    }

    const slotError = validateTeamSlots(is_test_session, team_slots)
    if (slotError) {
      return NextResponse.json({ error: slotError }, { status: 400 })
    }

    let adminDb
    try {
      adminDb = createAdminClient()
    } catch (e: any) {
      return NextResponse.json(
        {
          error:
            e?.message ||
            'Server is not configured for admin session creation (missing SUPABASE_SERVICE_ROLE_KEY). See ENV_SETUP.md.',
        },
        { status: 500 },
      )
    }

    const { data: hostProfile, error: hostProfileError } = await adminDb
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', assigned_host_id)
      .eq('role', 'host')
      .maybeSingle()

    if (hostProfileError) {
      return NextResponse.json({ error: hostProfileError.message }, { status: 400 })
    }
    if (!hostProfile) {
      return NextResponse.json(
        { error: 'assigned_host_id must be a user with role host' },
        { status: 400 },
      )
    }

    const { data: session, error: sessionError } = await adminDb
      .from('quiz_live_sessions')
      .insert({
        title,
        assigned_host_id,
        team_slots,
        is_test_session,
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
      const { data: createdRound, error: roundError } = await adminDb
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
        const { data: setQuestions, error: setQuestionsError } = await adminDb
          .from('question_set_questions')
          .select('order_index,question_id')
          .eq('question_set_id', round.question_set_id)
          .order('order_index', { ascending: true })

        if (setQuestionsError) {
          return NextResponse.json({ error: setQuestionsError.message }, { status: 500 })
        }

        if (setQuestions && setQuestions.length > 0) {
          const cap = parseRoundQuestionCount(round.question_count)
          if (cap === -1) {
            return NextResponse.json(
              { error: 'question_count must be a positive integer when provided' },
              { status: 400 },
            )
          }
          const limited =
            cap === null
              ? setQuestions
              : setQuestions.slice(0, Math.min(cap, setQuestions.length))

          const questionIds = limited.map((q) => q.question_id)
          const { data: sourceQuestions, error: sourceError } = await adminDb
            .from('questions')
            .select('*')
            .in('id', questionIds)

          if (sourceError) {
            return NextResponse.json({ error: sourceError.message }, { status: 500 })
          }

          const sourceById = new Map((sourceQuestions || []).map((q: any) => [q.id, q]))
          const snapshotRows = limited
            .map((sq, idx) => {
              const src: any = sourceById.get(sq.question_id)
              if (!src) return null
              return {
                round_id: createdRound.id,
                source_question_id: src.id,
                question_text: src.question_text,
                question_text_odia: src.question_text_odia,
                question_type: src.question_type || 'mcq',
                option_a: src.option_a,
                option_b: src.option_b,
                option_c: src.option_c,
                option_d: src.option_d,
                option_a_odia: src.option_a_odia,
                option_b_odia: src.option_b_odia,
                option_c_odia: src.option_c_odia,
                option_d_odia: src.option_d_odia,
                correct_answer: src.correct_answer_tf || src.correct_answer,
                explanation: src.explanation,
                explanation_odia: src.explanation_odia,
                media_url: src.media_url,
                question_order: idx + 1,
              }
            })
            .filter(Boolean)

          if (snapshotRows.length > 0) {
            const { error: insertQuestionsError } = await adminDb
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
    const { error: scoresError } = await adminDb.from('quiz_session_scores').insert(scoreRows)
    if (scoresError) {
      return NextResponse.json({ error: scoresError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, sessionId: session.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

