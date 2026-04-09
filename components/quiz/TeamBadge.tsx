import { TEAM_COLORS, type TeamLabel } from '@/lib/utils/teamColors'

interface TeamBadgeProps {
  label: TeamLabel
  text?: string
}

export function TeamBadge({ label, text }: TeamBadgeProps) {
  const colors = TEAM_COLORS[label]
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}>
      Team {label}
      {text ? ` - ${text}` : ''}
    </span>
  )
}

