export type TeamLabel = 'A' | 'B' | 'C' | 'D'

export const TEAM_COLORS: Record<
  TeamLabel,
  {
    bg: string
    text: string
    border: string
    badge: string
    light: string
  }
> = {
  A: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    light: 'bg-blue-50',
  },
  B: {
    bg: 'bg-green-600',
    text: 'text-green-600',
    border: 'border-green-600',
    badge: 'bg-green-100 text-green-800',
    light: 'bg-green-50',
  },
  C: {
    bg: 'bg-amber-600',
    text: 'text-amber-600',
    border: 'border-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    light: 'bg-amber-50',
  },
  D: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    border: 'border-purple-600',
    badge: 'bg-purple-100 text-purple-800',
    light: 'bg-purple-50',
  },
}

export function getTeamColor(label: TeamLabel) {
  return TEAM_COLORS[label]
}

