export interface ScoreUpdate {
  sessionId: string
  teamLabel: 'A' | 'B' | 'C' | 'D'
  pointsDelta: number
  questionEventId: string
}

export function resolvePoints(
  attemptNumber: number,
  pointsFull: number,
  pointsHalf: number,
  roundType: string,
): number {
  if (roundType === 'rapid_fire') return pointsFull
  if (roundType === 'true_or_false') return pointsFull
  if (roundType === 'buzzer') return pointsFull
  return attemptNumber === 1 ? pointsFull : pointsHalf
}

/** Negative points for a wrong buzzer answer or buzzer timeout (50% of full question value, rounded). */
export function buzzerWrongPenaltyPoints(pointsFull: number): number {
  const full = Math.max(0, Math.floor(Number(pointsFull) || 0))
  return -Math.round(full / 2)
}

export async function applyScoreUpdate(update: ScoreUpdate): Promise<void> {
  const response = await fetch('/api/quiz/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to update score')
  }
}

