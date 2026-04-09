import { TEAM_COLORS, type TeamLabel } from '@/lib/utils/teamColors'

interface ScoreSidebarProps {
  teams: Record<TeamLabel, string>
  scores: Record<TeamLabel, number>
}

export function ScoreSidebar({ teams, scores }: ScoreSidebarProps) {
  const labels: TeamLabel[] = ['A', 'B', 'C', 'D']
  return (
    <aside className="space-y-3">
      {labels.map((label) => {
        const colors = TEAM_COLORS[label]
        return (
          <div key={label} className={`rounded-xl border p-3 ${colors.light} ${colors.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase ${colors.text}`}>Team {label}</p>
                <p className="text-sm font-medium text-gray-900">{teams[label] || 'Unassigned'}</p>
              </div>
              <p className={`text-2xl font-bold ${colors.text}`}>{scores[label] ?? 0}</p>
            </div>
          </div>
        )
      })}
    </aside>
  )
}

