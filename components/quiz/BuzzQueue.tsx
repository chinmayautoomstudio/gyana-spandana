'use client'

import { TeamBadge } from '@/components/quiz/TeamBadge'
import type { TeamLabel } from '@/lib/utils/teamColors'

interface BuzzQueueItem {
  id: string
  team_label: TeamLabel
  buzz_order: number | null
  buzzed_at?: string | null
  /** Epoch ms at physical press (client); used for ordering and precise display. */
  client_pressed_at_ms?: number | null
}

function formatClientPressTime(clientMs: number | null | undefined): string {
  if (clientMs == null || !Number.isFinite(clientMs)) return ''
  try {
    return new Date(clientMs).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  } catch {
    return ''
  }
}

interface BuzzQueueProps {
  items: BuzzQueueItem[]
  activeTeam?: TeamLabel | null
}

export function BuzzQueue({ items, activeTeam = null }: BuzzQueueProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500">Waiting for buzzes...</p>
  }

  return (
    <div className="space-y-2">
      {items
        .slice()
        .sort((a, b) => Number(a.buzz_order || 999) - Number(b.buzz_order || 999))
        .map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              activeTeam && item.team_label === activeTeam
                ? 'border-[#C0392B] bg-[#C0392B]/5'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">#{item.buzz_order ?? '-'}</span>
              <TeamBadge label={item.team_label} text={activeTeam === item.team_label ? 'Answering' : 'Queued'} />
            </div>
            <span className="text-xs text-gray-500 tabular-nums" title="Press time (local, with ms)">
              {formatClientPressTime(item.client_pressed_at_ms) ||
                (item.buzzed_at ? new Date(item.buzzed_at).toLocaleTimeString() : '')}
            </span>
          </div>
        ))}
    </div>
  )
}
