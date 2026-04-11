import type { TeamLabel } from '@/lib/utils/teamColors'

const ORDER: TeamLabel[] = ['A', 'B', 'C', 'D']

/**
 * Labels that have a non-empty team id in session team_slots.
 */
export function getOccupiedLabels(teamSlots: Record<string, string | undefined | null>): TeamLabel[] {
  return ORDER.filter((label) => {
    const v = teamSlots[label]
    return typeof v === 'string' && v.trim().length > 0
  })
}

/**
 * Next label in circular order among occupied slots only.
 * If current is not in occupied, starts from occupied[0].
 * If exactly one occupied, returns that label.
 */
export function nextOccupiedLabel(current: TeamLabel, occupied: TeamLabel[]): TeamLabel {
  if (occupied.length === 0) return current
  if (occupied.length === 1) return occupied[0]
  const idx = occupied.indexOf(current)
  const start = idx >= 0 ? idx : 0
  return occupied[(start + 1) % occupied.length]
}
