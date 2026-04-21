'use client'

import { useMemo, useState } from 'react'
import { TEAM_COLORS, type TeamLabel } from '@/lib/utils/teamColors'

const TEAM_LABELS: TeamLabel[] = ['A', 'B', 'C', 'D']

const ROUND_TYPE_COLUMN_LABELS: Record<string, string> = {
  direct_question: 'Direct Question',
  rapid_fire: 'Rapid Fire',
  true_or_false: 'True False',
  buzzer: 'Buzzer',
  unknown: 'Other',
}

export interface LiveScoreboardProps {
  teams: Record<TeamLabel, string>
  scores: Record<TeamLabel, number>
  rounds: Array<{ id?: string; round_type?: string | null; round_order?: number | null }>
  scoresByRoundType: Record<TeamLabel, Record<string, number>>
}

function columnRoundTypes(rounds: LiveScoreboardProps['rounds']): string[] {
  const sorted = [...(rounds || [])].sort(
    (a, b) => Number(a?.round_order ?? 0) - Number(b?.round_order ?? 0),
  )
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of sorted) {
    const rt = String(r?.round_type || '').trim()
    if (!rt || seen.has(rt)) continue
    seen.add(rt)
    out.push(rt)
  }
  return out
}

export function LiveScoreboard({ teams, scores, rounds, scoresByRoundType }: LiveScoreboardProps) {
  const [open, setOpen] = useState(false)
  const roundTypes = useMemo(() => columnRoundTypes(rounds), [rounds])

  const collapseSummary = useMemo(
    () =>
      TEAM_LABELS.map((l) => `${l}:${scores[l] ?? 0}`).join(' · '),
    [scores],
  )

  return (
    <div
      className="fixed top-4 right-4 z-40 max-w-[min(100vw-2rem,28rem)] rounded-xl border border-gray-200 bg-white/95 shadow-lg backdrop-blur-sm"
      role="region"
      aria-label="Live scoreboard"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Scoreboard</span>
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {!open ? (
        <div className="px-3 py-2">
          <p className="truncate text-xs tabular-nums text-gray-800" title={collapseSummary}>
            {collapseSummary}
          </p>
        </div>
      ) : (
        <div className="max-h-[min(70vh,32rem)] overflow-auto p-2">
          <table className="w-full min-w-[260px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-[1] bg-white px-2 py-2 font-semibold text-gray-700">Team</th>
                {roundTypes.map((rt) => (
                  <th key={rt} className="whitespace-nowrap px-2 py-2 font-semibold text-gray-700">
                    {ROUND_TYPE_COLUMN_LABELS[rt] ?? rt.replace(/_/g, ' ')}
                  </th>
                ))}
                <th className="whitespace-nowrap px-2 py-2 font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_LABELS.map((label) => {
                const colors = TEAM_COLORS[label]
                const byType = scoresByRoundType?.[label] ?? {}
                return (
                  <tr key={label} className={`border-t border-gray-100 ${colors.light}`}>
                    <td
                      className={`sticky left-0 z-[1] whitespace-nowrap border-r border-gray-200 px-2 py-1.5 font-medium text-gray-900 ${colors.light} ${colors.text}`}
                      title={`Team ${label}`}
                    >
                      {teams[label] || `Team ${label}`}
                    </td>
                    {roundTypes.map((rt) => (
                      <td key={`${label}-${rt}`} className="px-2 py-1.5 tabular-nums text-gray-800">
                        {byType[rt] ?? 0}
                      </td>
                    ))}
                    <td className={`px-2 py-1.5 font-semibold tabular-nums ${colors.text}`}>
                      {scores[label] ?? 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
