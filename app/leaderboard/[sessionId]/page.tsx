/*
 * Supabase: enable Realtime on `quiz_session_scores` and ensure anon (or your
 * public role) can SELECT rows for this session under RLS. See
 * `lib/hooks/usePostgresLeaderboardRealtime.ts` for full dashboard notes.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePostgresLeaderboardRealtime } from '@/lib/hooks/usePostgresLeaderboardRealtime'
import { LiveLeaderboardMeta } from '@/components/leaderboard/LiveLeaderboardMeta'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface ScoreRow {
  team_label: TeamLabel
  total_score: number
  questions_correct: number
}

export default function PublicSessionLeaderboardPage() {
  const params = useParams<{ sessionId: string }>()
  const rawId = params?.sessionId
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId
  const supabase = useMemo(() => createClient(), [])

  const [title, setTitle] = useState('Live Leaderboard')
  const [roundName, setRoundName] = useState('Waiting')
  const [isTestSession, setIsTestSession] = useState(false)
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    if (!sessionId) return
    const { data, error: scoreError } = await supabase
      .from('quiz_session_scores')
      .select('team_label,total_score,questions_correct')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
    if (scoreError) throw scoreError
    setRows((data || []) as ScoreRow[])

    const sessionRes = await fetch(`/api/quiz/session/${sessionId}`)
    const sessionData = await sessionRes.json().catch(() => ({}))
    if (sessionRes.ok) {
      setTitle(sessionData?.session?.title || 'Live Leaderboard')
      setIsTestSession(Boolean(sessionData?.session?.is_test_session))
      setRoundName(
        sessionData?.activeRound?.title ||
          sessionData?.activeRound?.round_type ||
          'Waiting',
      )
    }
    setLastUpdatedAt(new Date())
  }, [sessionId, supabase])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        await fetchLeaderboard()
      } catch (e: unknown) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [sessionId, fetchLeaderboard])

  const { status: realtimeStatus, usePollFallback } = usePostgresLeaderboardRealtime({
    supabase,
    enabled: Boolean(sessionId),
    channelName: `public-session-leaderboard-${sessionId ?? 'none'}`,
    table: 'quiz_session_scores',
    filter: `session_id=eq.${sessionId}`,
    onDataStale: fetchLeaderboard,
  })

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
        Loading leaderboard...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    )
  }

  const maxScore = Math.max(1, ...rows.map((r) => r.total_score || 0))

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Current round: {roundName}
            </p>
            {isTestSession ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Test session — leaderboard is for rehearsal only.
              </p>
            ) : null}
          </div>
          <LiveLeaderboardMeta
            lastUpdatedAt={lastUpdatedAt}
            status={realtimeStatus}
            usePollFallback={usePollFallback}
            showLive={Boolean(sessionId)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const percent = Math.max(
            4,
            Math.round((row.total_score / maxScore) * 100),
          )
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
          return (
            <div
              key={row.team_label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900">
                  {medal} Team {row.team_label}
                </p>
                <p className="text-2xl font-bold text-[#C0392B]">
                  {row.total_score} pts
                </p>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C0392B] to-[#E67E22] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
