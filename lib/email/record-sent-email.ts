import { createAdminClient } from '@/lib/supabase/admin'
import type { SentEmailType } from './email-types'

export async function recordSentEmail(params: {
  emailType: SentEmailType
  toEmail: string
  subject: string
  htmlBody: string
  textBody: string | null | undefined
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('sent_emails').insert({
    email_type: params.emailType,
    to_email: params.toEmail,
    subject: params.subject,
    html_body: params.htmlBody,
    text_body: params.textBody ?? null,
    metadata: params.metadata ?? {},
  })
  if (error) {
    throw error
  }
}
