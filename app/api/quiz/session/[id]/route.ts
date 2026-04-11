import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePoints } from '@/lib/services/scoringService'
import { getOccupiedLabels, nextOccupiedLabel } from '@/lib/quiz/teamSlots'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

function nextTeam(current: TeamLabel): TeamLabel {
  const idx = TEAM_LABELS.indexOf(current)
  return TEAM_LABELS[(idx + 1) % TEAM_LABELS.length]
}

async function assertHostOrAdmin(sessionId: string, supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' as const }
  }

  const { data: session } = await supabase
    .from('quiz_live_sessions')
    .select('id, assigned_host_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return { ok: false, status: 404, message: 'Session not found' as const }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = profile?.role || user.user_metadata?.role || 'participant'
  if (role !== 'admin' && session.assigned_host_id !== user.id) {
    return { ok: false, status: 403, message: 'Forbidden' as const }
  }

  return { ok: true, user, role, session }
}

async function getScoreMap(sessionId: string, supabase: any) {
  const { data: scores } = await supabase
    .from('quiz_session_scores')
    .select('team_label,total_score')
    .eq('session_id', sessionId)

  return TEAM_LABELS.reduce((acc, label) => {
    acc[label] = scores?.find((s: any) => s.team_label === label)?.total_score || 0
    return acc
  }, {} as Record<TeamLabel, number>)
}

async function getTeamDisplayNames(session: { team_slots?: Record<string, string> | null }, supabase: any) {
  const slots = (session?.team_slots || {}) as Record<string, string>
  const ids = [...new Set(TEAM_LABELS.map((l) => slots[l]).filter(Boolean))]

  const nameById = new Map<string, string>()
  if (ids.length > 0) {
    const { data: rows } = await supabase.from('teams').select('id, team_name').in('id', ids)
    for (const row of rows || []) {
      if (row?.id && row?.team_name != null) nameById.set(row.id, String(row.team_name))
    }
  }

  return TEAM_LABELS.reduce((acc, label) => {
    const id = slots[label]
    if (!id) {
      acc[label] = 'Unassigned'
    } else {
      const name = nameById.get(id)
      acc[label] = name ?? `Team ${id.slice(0, 8)}`
    }
    return acc
  }, {} as Record<TeamLabel, string>)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const { data: session, error: sessionError } = await supabase
      .from('quiz_live_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: rounds } = await supabase
      .from('quiz_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_order', { ascending: true })

    const activeRound =
      rounds?.find((r: any) => r.status === 'active') ||
      rounds?.find((r: any) => r.id === session.current_round_id) ||
      null

    let latestEvent = null
    let currentQuestion = null
    if (activeRound) {
      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('round_id', activeRound.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      latestEvent = event || null

      if (event?.question_id) {
        const { data: question } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('id', event.question_id)
          .single()
        currentQuestion = question || null
      }
    }

    const scores = await getScoreMap(sessionId, supabase)
    const team_display_names = await getTeamDisplayNames(session, supabase)

    return NextResponse.json({
      session,
      rounds: rounds || [],
      activeRound,
      currentQuestionEvent: latestEvent,
      currentQuestion,
      scores,
      team_display_names,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const auth = await assertHostOrAdmin(sessionId, supabase)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const body = await request.json()
    const action = body?.action as string

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    if (action === 'start_round') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      await supabase
        .from('quiz_rounds')
        .update({ status: 'active' })
        .eq('id', roundId)
        .eq('session_id', sessionId)

      await supabase
        .from('quiz_live_sessions')
        .update({ status: 'active', current_round_id: roundId, updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      const { data: round } = await supabase.from('quiz_rounds').select('*').eq('id', roundId).single()
      return NextResponse.json({ success: true, round })
    }

    if (action === 'reveal_question') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      const { data: sessionReveal } = await supabase
        .from('quiz_live_sessions')
        .select('is_test_session, team_slots')
        .eq('id', sessionId)
        .single()

      const occupiedReveal = getOccupiedLabels(
        (sessionReveal?.team_slots || {}) as Record<string, string>,
      )
      const rawDir = body?.directedTeam
      const hasDirected =
        typeof rawDir === 'string' && TEAM_LABELS.includes(rawDir.trim() as TeamLabel)
      let directedTeam: TeamLabel = hasDirected ? (rawDir.trim() as TeamLabel) : 'A'
      if (!hasDirected && sessionReveal?.is_test_session && occupiedReveal.length >= 1) {
        directedTeam = occupiedReveal[0]
      }

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('id,current_question_index')
        .eq('id', roundId)
        .single()

      if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

      const nextIndex = Number(round.current_question_index || 0)
      const { data: question } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('round_id', roundId)
        .eq('question_order', nextIndex + 1)
        .single()

      if (!question) {
        return NextResponse.json({ error: 'No more questions in this round' }, { status: 400 })
      }

      const { data: event, error: eventError } = await supabase
        .from('quiz_question_events')
        .insert({
          round_id: roundId,
          question_id: question.id,
          status: 'revealed',
          directed_team: directedTeam,
          attempt_number: 1,
        })
        .select('*')
        .single()

      if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 })
      }

      await supabase
        .from('quiz_rounds')
        .update({ current_question_index: nextIndex + 1 })
        .eq('id', roundId)

      return NextResponse.json({ success: true, event, question, roundQuestionIndex: nextIndex + 1 })
    }

    if (action === 'reveal_options') {
      const questionEventId = body?.questionEventId as string | undefined
      const directedTeam = body?.directedTeam as TeamLabel | undefined
      if (!questionEventId) {
        return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
      }

      const update: Record<string, unknown> = {
        status: 'options_revealed',
        attempt_number: 2,
      }
      if (directedTeam) update.directed_team = directedTeam

      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update(update)
        .eq('id', questionEventId)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
    }

    if (action === 'mark_correct') {
      const questionEventId = body?.questionEventId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!questionEventId || !teamLabel) {
        return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()
      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })

      const { data: round } = await supabase
        .from('quiz_rounds')
        .select('round_type')
        .eq('id', event.round_id)
        .single()
      const { data: session } = await supabase
        .from('quiz_live_sessions')
        .select('points_full, points_half')
        .eq('id', sessionId)
        .single()
      const { data: question } = await supabase
        .from('quiz_questions')
        .select('correct_answer')
        .eq('id', event.question_id)
        .single()

      const pointsAwarded = resolvePoints(
        Number(event.attempt_number || 1),
        Number(session?.points_full || 10),
        Number(session?.points_half || 5),
        round?.round_type || 'direct_question',
      )

      await supabase
        .from('quiz_question_events')
        .update({
          status: 'answered',
          answered_by_team: teamLabel,
          points_awarded: pointsAwarded,
        })
        .eq('id', questionEventId)

      const { data: scoreRow } = await supabase
        .from('quiz_session_scores')
        .select('id,total_score,questions_answered,questions_correct')
        .eq('session_id', sessionId)
        .eq('team_label', teamLabel)
        .single()

      if (!scoreRow) return NextResponse.json({ error: 'Score row missing for team' }, { status: 500 })

      await supabase
        .from('quiz_session_scores')
        .update({
          total_score: Number(scoreRow.total_score || 0) + pointsAwarded,
          questions_answered: Number(scoreRow.questions_answered || 0) + 1,
          questions_correct: Number(scoreRow.questions_correct || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scoreRow.id)

      const updatedScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({
        success: true,
        result: {
          questionEventId,
          correct: true,
          teamLabel,
          pointsAwarded,
          correctAnswer: question?.correct_answer || '',
          updatedScores,
        },
      })
    }

    if (action === 'mark_wrong_pass') {
      const questionEventId = body?.questionEventId as string | undefined
      const teamLabel = body?.teamLabel as TeamLabel | undefined
      if (!questionEventId || !teamLabel) {
        return NextResponse.json({ error: 'questionEventId and teamLabel are required' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('quiz_question_events')
        .select('*')
        .eq('id', questionEventId)
        .single()

      if (!event) return NextResponse.json({ error: 'Question event not found' }, { status: 404 })

      const { data: sessionPass } = await supabase
        .from('quiz_live_sessions')
        .select('is_test_session, team_slots')
        .eq('id', sessionId)
        .single()

      const occupied = getOccupiedLabels((sessionPass?.team_slots || {}) as Record<string, string>)
      const useTestRotation = Boolean(sessionPass?.is_test_session) && occupied.length > 0
      const passThreshold = useTestRotation ? occupied.length : 4

      const attemptNumber = Number(event.attempt_number || 1)
      await supabase.from('quiz_pass_log').insert({
        question_event_id: questionEventId,
        team_label: teamLabel,
        attempt_number: attemptNumber,
        passed_or_wrong: true,
      })

      if (attemptNumber === 1) {
        const newDirectedTeam = useTestRotation
          ? nextOccupiedLabel(teamLabel, occupied)
          : nextTeam(teamLabel)
        const { data: updatedEvent } = await supabase
          .from('quiz_question_events')
          .update({
            status: 'options_revealed',
            attempt_number: 2,
            directed_team: newDirectedTeam,
          })
          .eq('id', questionEventId)
          .select('*')
          .single()
        return NextResponse.json({ success: true, state: 'options_revealed', event: updatedEvent })
      }

      const { data: passRows } = await supabase
        .from('quiz_pass_log')
        .select('team_label')
        .eq('question_event_id', questionEventId)
        .eq('attempt_number', 2)

      const tried = new Set((passRows || []).map((p: any) => p.team_label))
      if (tried.size >= passThreshold) {
        const { data: updatedEvent } = await supabase
          .from('quiz_question_events')
          .update({ status: 'dropped' })
          .eq('id', questionEventId)
          .select('*')
          .single()
        return NextResponse.json({ success: true, state: 'dropped', event: updatedEvent })
      }

      const order: TeamLabel[] =
        useTestRotation && occupied.length > 0 ? occupied : [...TEAM_LABELS]
      const next =
        order.find((l) => !tried.has(l)) ||
        (useTestRotation ? nextOccupiedLabel(teamLabel, occupied) : nextTeam(teamLabel))
      const { data: updatedEvent } = await supabase
        .from('quiz_question_events')
        .update({ directed_team: next })
        .eq('id', questionEventId)
        .select('*')
        .single()
      return NextResponse.json({ success: true, state: 'pass_next_team', event: updatedEvent })
    }

    if (action === 'skip_question') {
      const questionEventId = body?.questionEventId as string | undefined
      if (!questionEventId) return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })

      const { data: event, error } = await supabase
        .from('quiz_question_events')
        .update({ status: 'dropped' })
        .eq('id', questionEventId)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, event })
    }

    if (action === 'end_round') {
      const roundId = body?.roundId as string | undefined
      if (!roundId) return NextResponse.json({ error: 'roundId is required' }, { status: 400 })

      await supabase.from('quiz_rounds').update({ status: 'completed' }).eq('id', roundId)
      const { data: round } = await supabase.from('quiz_rounds').select('*').eq('id', roundId).single()
      const finalScores = await getScoreMap(sessionId, supabase)
      return NextResponse.json({ success: true, round, finalScores })
    }

    if (action === 'end_session') {
      await supabase
        .from('quiz_live_sessions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

