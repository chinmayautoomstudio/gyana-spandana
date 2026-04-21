/**
 * Latest Rapid Fire session for a team within a round (includes ended turns),
 * so GET handlers can always return turn summary and ended_at after the turn finishes.
 */
export type RapidFireSessionMetaRow = {
  started_at: string | null
  duration_seconds: number | null
  questions_attempted: number | null
  questions_correct: number | null
  ended_at: string | null
}

const RF_SESSION_SELECT =
  'started_at, duration_seconds, questions_attempted, questions_correct, ended_at'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseFrom = (table: string) => any

export async function fetchLatestRapidFireSessionForRoundTeam(
  supabase: { from: SupabaseFrom },
  roundId: string,
  teamLabel: string,
): Promise<RapidFireSessionMetaRow | null> {
  const { data: evRows, error: evErr } = await supabase
    .from('quiz_question_events')
    .select('id')
    .eq('round_id', roundId)
  if (evErr || !evRows?.length) return null
  const ids = (evRows as { id: string }[]).map((r) => r.id).filter(Boolean)
  if (!ids.length) return null

  const { data, error } = await supabase
    .from('quiz_rapid_fire_sessions')
    .select(RF_SESSION_SELECT)
    .eq('team_label', teamLabel)
    .in('question_event_id', ids)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data as RapidFireSessionMetaRow) ?? null
}
