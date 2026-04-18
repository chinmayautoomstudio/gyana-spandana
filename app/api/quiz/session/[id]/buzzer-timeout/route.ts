import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runBuzzerAnswerTimeout } from '@/lib/services/buzzerAnswerTimeout'

const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const
type TeamLabel = (typeof TEAM_LABELS)[number]

function shouldSkipAsAlreadyHandled(error: string): boolean {
  return (
    error === 'Buzzer is not open for this question' ||
    error === 'No answer deadline is set for this question' ||
    error === 'No active team is available to time out' ||
    error === 'Only for buzzer rounds' ||
    error === 'Question event not found'
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const supabase = await createClient()
    const resolvedParams = params instanceof Promise ? await params : params
    const sessionId = resolvedParams.id

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const questionEventId = typeof body?.questionEventId === 'string' ? body.questionEventId.trim() : ''
    if (!questionEventId) {
      return NextResponse.json({ error: 'questionEventId is required' }, { status: 400 })
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!participant?.team_id) {
      return NextResponse.json({ error: 'No team assigned to your account' }, { status: 403 })
    }

    const { data: session } = await supabase
      .from('quiz_live_sessions')
      .select('team_slots')
      .eq('id', sessionId)
      .single()

    const slots = (session?.team_slots || {}) as Record<string, string>
    const participantLabel =
      (TEAM_LABELS.find((label) => slots[label] === participant.team_id) as TeamLabel | undefined) || null
    if (!participantLabel) {
      return NextResponse.json({ error: 'Your team is not mapped in this session' }, { status: 403 })
    }

    const { data: event } = await supabase
      .from('quiz_question_events')
      .select('id,round_id')
      .eq('id', questionEventId)
      .single()

    if (!event) {
      return NextResponse.json({ skipped: true, reason: 'not_found' }, { status: 200 })
    }

    const { data: round } = await supabase
      .from('quiz_rounds')
      .select('round_type,session_id')
      .eq('id', event.round_id)
      .single()

    if (!round || round.session_id !== sessionId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }
    if (round.round_type !== 'buzzer') {
      return NextResponse.json({ error: 'Only buzzer rounds support this action' }, { status: 400 })
    }

    const [{ data: buzzes, error: buzzErr }, { data: passRows, error: passErr }] = await Promise.all([
      supabase
        .from('quiz_buzz_events')
        .select('team_label,buzz_order,buzzed_at,id,client_pressed_at_ms')
        .eq('question_event_id', questionEventId)
        .order('client_pressed_at_ms', { ascending: true })
        .order('buzzed_at', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('quiz_pass_log')
        .select('team_label')
        .eq('question_event_id', questionEventId)
        .eq('passed_or_wrong', true),
    ])

    if (buzzErr) return NextResponse.json({ error: buzzErr.message }, { status: 500 })
    if (passErr) return NextResponse.json({ error: passErr.message }, { status: 500 })

    const excluded = new Set((passRows || []).map((row: { team_label: string }) => String(row.team_label)))
    const activeBuzz = (buzzes || []).find((row: { team_label: string }) => !excluded.has(String(row.team_label)))
    const activeTeam = activeBuzz?.team_label as TeamLabel | undefined
    if (!activeTeam || !TEAM_LABELS.includes(activeTeam)) {
      return NextResponse.json({ skipped: true, reason: 'no_active_team' }, { status: 200 })
    }

    if (participantLabel !== activeTeam) {
      return NextResponse.json({ error: 'Only the team that may answer can request a timeout' }, { status: 403 })
    }

    const result = await runBuzzerAnswerTimeout(supabase, sessionId, questionEventId)
    if (!result.ok) {
      if (result.error === 'Answer period has not expired yet') {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      if (shouldSkipAsAlreadyHandled(result.error)) {
        return NextResponse.json({ skipped: true, reason: 'already_handled' }, { status: 200 })
      }
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      state: 'dropped',
      event: result.event,
      updatedScores: result.updatedScores,
      penalty: result.penalty,
      teamLabel: result.teamLabel,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
