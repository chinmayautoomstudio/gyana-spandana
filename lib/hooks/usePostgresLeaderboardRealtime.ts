/*
 * -----------------------------------------------------------------------------
 * Supabase dashboard (gyanaspardha / production)
 * -----------------------------------------------------------------------------
 * 1. Enable Realtime for tables that drive live UI:
 *    - Leaderboards: `public.quiz_session_scores`, `public.team_scores` (see
 *      `20260411120000_public_competition_leaderboard_rls.sql`).
 *    - Host session list: `public.quiz_live_sessions` (see
 *      `20260411140000_quiz_live_sessions_realtime_publication.sql`).
 * 2. RLS: Realtime still respects Row Level Security. Anonymous users must be
 *    allowed to SELECT rows they should see (e.g. public leaderboard by session),
 *    or they will not receive postgres_changes events for those rows.
 * 3. No trigger is required for basic INSERT/UPDATE/DELETE replication; changes
 *    on the table propagate when Realtime is enabled on it.
 * -----------------------------------------------------------------------------
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LeaderboardRealtimeStatus =
  | 'idle'
  | 'paused'
  | 'connecting'
  | 'SUBSCRIBED'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'

type UsePostgresLeaderboardRealtimeParams = {
  supabase: SupabaseClient
  /** When false, no channel is opened (missing id, inactive tab, etc.). */
  enabled: boolean
  /** Unique per resource so channels never collide across exams/sessions. */
  channelName: string
  table: string
  /**
   * Narrow the stream, e.g. `session_id=eq.<uuid>` or `exam_id=eq.<uuid>`.
   * Omit or leave undefined to receive all changes on `table` allowed by RLS
   * (e.g. admin view of all quiz_live_sessions).
   */
  filter?: string
  /** Refetch (or merge) leaderboard data when postgres reports a change. */
  onDataStale: () => void | Promise<void>
  /** If Realtime fails to subscribe, poll this often (ms). Default 5000. */
  pollFallbackMs?: number
}

/**
 * Subscribes to `postgres_changes` for one table + filter, pauses when the
 * browser tab is hidden (disconnects the channel), and falls back to polling
 * if the channel errors or times out — avoids stale UI when Realtime is off
 * or misconfigured.
 */
export function usePostgresLeaderboardRealtime({
  supabase,
  enabled,
  channelName,
  table,
  filter,
  onDataStale,
  pollFallbackMs = 5000,
}: UsePostgresLeaderboardRealtimeParams) {
  const [pageVisible, setPageVisible] = useState(
    () => typeof document !== 'undefined' && !document.hidden,
  )
  const [status, setStatus] = useState<LeaderboardRealtimeStatus>('idle')
  const [usePollFallback, setUsePollFallback] = useState(false)

  const onDataStaleRef = useRef(onDataStale)
  onDataStaleRef.current = onDataStale

  // Pause/resume: hidden tabs should not hold Realtime slots or process events.
  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const runRefresh = useCallback(async () => {
    try {
      await onDataStaleRef.current()
    } catch (e) {
      console.error('[leaderboard realtime] refresh failed', e)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setUsePollFallback(false)
      return
    }

    if (!pageVisible) {
      setStatus('paused')
      return
    }

    setStatus('connecting')
    setUsePollFallback(false)

    const onChange = () => {
      void runRefresh()
    }

    const base = supabase.channel(channelName)
    const withListener = filter
      ? base.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter },
          onChange,
        )
      : base.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          onChange,
        )

    const channel = withListener.subscribe((subscribeStatus, err) => {
        console.log(
          `[leaderboard realtime] channel "${channelName}" →`,
          subscribeStatus,
          err?.message ?? '',
        )
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED')
          setUsePollFallback(false)
        } else if (
          subscribeStatus === 'CHANNEL_ERROR' ||
          subscribeStatus === 'TIMED_OUT'
        ) {
          setStatus(subscribeStatus)
          setUsePollFallback(true)
        } else if (subscribeStatus === 'CLOSED') {
          setStatus('CLOSED')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [
    enabled,
    pageVisible,
    supabase,
    channelName,
    table,
    filter,
    runRefresh,
  ])

  // Fallback polling: keeps leaderboard fresh if Realtime is unavailable.
  useEffect(() => {
    if (!enabled || !pageVisible || !usePollFallback) return
    void runRefresh()
    const id = setInterval(() => void runRefresh(), pollFallbackMs)
    return () => clearInterval(id)
  }, [enabled, pageVisible, usePollFallback, pollFallbackMs, runRefresh])

  return { status, usePollFallback, pageVisible }
}
