'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LeaderboardRealtimeStatus } from '@/lib/hooks/usePostgresLeaderboardRealtime'

function formatRelativeTime(d: Date | null): string {
  if (!d) return '—'
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (sec < 15) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  return `${h}h ago`
}

function statusHint(
  status: LeaderboardRealtimeStatus,
  usePollFallback: boolean,
): string {
  if (usePollFallback) return 'Polling (realtime unavailable)'
  switch (status) {
    case 'SUBSCRIBED':
      return 'Realtime connected'
    case 'connecting':
      return 'Connecting…'
    case 'paused':
      return 'Paused (tab in background)'
    case 'CHANNEL_ERROR':
      return 'Channel error'
    case 'TIMED_OUT':
      return 'Connection timed out'
    case 'CLOSED':
      return 'Connection closed'
    default:
      return 'Idle'
  }
}

type LiveLeaderboardMetaProps = {
  lastUpdatedAt: Date | null
  status: LeaderboardRealtimeStatus
  usePollFallback: boolean
  /** When false, hide LIVE (e.g. loading or no session selected). */
  showLive?: boolean
}

/**
 * LIVE pill, connection hint, and relative “last updated” (re-renders on an interval).
 */
export function LiveLeaderboardMeta({
  lastUpdatedAt,
  status,
  usePollFallback,
  showLive = true,
}: LiveLeaderboardMetaProps) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const label = useMemo(
    () => formatRelativeTime(lastUpdatedAt),
    [lastUpdatedAt, tick],
  )

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
      {showLive && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-semibold uppercase tracking-wide text-green-800"
          title={statusHint(status, usePollFallback)}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          LIVE
        </span>
      )}
      <span className="text-gray-500" title={lastUpdatedAt?.toISOString()}>
        Last updated {label}
      </span>
      <span
        className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
          status === 'SUBSCRIBED' && !usePollFallback
            ? 'bg-emerald-100 text-emerald-800'
            : usePollFallback
              ? 'bg-amber-100 text-amber-900'
              : status === 'paused'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-gray-100 text-gray-700'
        }`}
      >
        {statusHint(status, usePollFallback)}
      </span>
    </div>
  )
}
