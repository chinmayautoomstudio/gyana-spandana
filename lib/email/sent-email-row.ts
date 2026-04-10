/** Row shape from public.sent_emails (admin log) */

export interface SentEmailRow {
  id: string
  email_type: string
  to_email: string
  subject: string
  html_body: string
  text_body: string | null
  metadata: Record<string, unknown>
  sent_at: string
}
