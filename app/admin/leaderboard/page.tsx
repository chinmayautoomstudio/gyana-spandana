/*
 * Supabase: enable Realtime on `team_scores` and `quiz_session_scores`; ensure
 * admin-authenticated users can SELECT via RLS for postgres_changes. See
 * `lib/hooks/usePostgresLeaderboardRealtime.ts` for dashboard checklist.
 */

'use client'

import { CompetitionLeaderboardPanel } from '@/components/leaderboard/CompetitionLeaderboardPanel'

export default function LeaderboardPage() {
  return <CompetitionLeaderboardPanel variant="admin" showHeading />
}
