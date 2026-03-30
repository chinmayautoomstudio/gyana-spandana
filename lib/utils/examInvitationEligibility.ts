/**
 * Used when sending exam invitation emails: only participants assigned to the exam
 * (present in exam_participants) may receive messages.
 */
export function findParticipantsNotAssignedToExam<T extends { id: string }>(
  participants: T[],
  assignedParticipantIds: Set<string>
): T[] {
  return participants.filter((p) => !assignedParticipantIds.has(p.id))
}
