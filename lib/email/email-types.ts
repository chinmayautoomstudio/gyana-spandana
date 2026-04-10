/** Stable values stored in sent_emails.email_type */

export const SENT_EMAIL_TYPES = {
  REGISTRATION_CONFIRMATION: 'registration_confirmation',
  TEAM_INVITATION: 'team_invitation',
  TEAM_INVITATION_REMINDER: 'team_invitation_reminder',
  P1_PENDING_PARTNER_REMINDER: 'p1_pending_partner_reminder',
  EXAM_INVITATION: 'exam_invitation',
  AUTHORITY_NOTIFICATION: 'authority_notification',
  TEST: 'test',
} as const

export type SentEmailType = (typeof SENT_EMAIL_TYPES)[keyof typeof SENT_EMAIL_TYPES]

export const SENT_EMAIL_TYPE_LABELS: Record<SentEmailType, string> = {
  [SENT_EMAIL_TYPES.REGISTRATION_CONFIRMATION]: 'Registration confirmation',
  [SENT_EMAIL_TYPES.TEAM_INVITATION]: 'Team invitation',
  [SENT_EMAIL_TYPES.TEAM_INVITATION_REMINDER]: 'P2 invitation reminder',
  [SENT_EMAIL_TYPES.P1_PENDING_PARTNER_REMINDER]: 'P1 pending partner reminder',
  [SENT_EMAIL_TYPES.EXAM_INVITATION]: 'Exam invitation',
  [SENT_EMAIL_TYPES.AUTHORITY_NOTIFICATION]: 'School authority notification',
  [SENT_EMAIL_TYPES.TEST]: 'Test email',
}

export const ALL_SENT_EMAIL_TYPES: SentEmailType[] = Object.values(SENT_EMAIL_TYPES)
