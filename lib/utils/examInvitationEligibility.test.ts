import { describe, it, expect } from 'vitest'
import { findParticipantsNotAssignedToExam } from './examInvitationEligibility'

describe('findParticipantsNotAssignedToExam', () => {
  it('returns empty when every participant is assigned', () => {
    const participants = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    const assigned = new Set(['a', 'b'])
    expect(findParticipantsNotAssignedToExam(participants, assigned)).toEqual([])
  })

  it('returns only participants missing from assignment set (mixed batch)', () => {
    const participants = [
      { id: 'assigned-1', name: 'On exam' },
      { id: 'stranger', name: 'Not on exam' },
    ]
    const assigned = new Set(['assigned-1'])
    const unassigned = findParticipantsNotAssignedToExam(participants, assigned)
    expect(unassigned).toHaveLength(1)
    expect(unassigned[0].id).toBe('stranger')
  })

  it('returns all participants when assignment set is empty', () => {
    const participants = [{ id: 'x', name: 'X' }]
    expect(findParticipantsNotAssignedToExam(participants, new Set())).toEqual(participants)
  })

  it('returns empty for empty participant list', () => {
    expect(findParticipantsNotAssignedToExam([], new Set(['a']))).toEqual([])
  })
})
