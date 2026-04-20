import sgMail from '@sendgrid/mail'
import type { SentEmailType } from './email-types'
import { recordSentEmail } from './record-sent-email'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailAudit {
  emailType: SentEmailType
  metadata?: Record<string, unknown>
}

/**
 * Check if SendGrid is configured (API key and from email present).
 */
export function isSendGridConfigured(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL
  return Boolean(apiKey && fromEmail)
}

/**
 * Send an email via SendGrid API.
 * After a successful send, optionally persists a row to `sent_emails` (audit log failures are logged only).
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendEmail(
  options: SendEmailOptions,
  audit?: SendEmailAudit
): Promise<{ success: true } | { success: false; error: string }> {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'GYANA SPARDHA <noreply@example.com>'

  if (!apiKey) {
    return { success: false, error: 'SENDGRID_API_KEY not configured' }
  }

  sgMail.setApiKey(apiKey)

  const msg = {
    to: options.to,
    from: fromEmail,
    subject: options.subject,
    html: options.html,
    text: options.text,
    // Disable click tracking so users receive direct links.
    // This avoids SSL/certificate issues on misconfigured branded tracking domains.
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
    },
  }

  try {
    await sgMail.send(msg)
    if (audit) {
      try {
        await recordSentEmail({
          emailType: audit.emailType,
          toEmail: options.to,
          subject: options.subject,
          htmlBody: options.html,
          textBody: options.text,
          metadata: audit.metadata,
        })
      } catch (logErr) {
        console.error('recordSentEmail failed (email was sent):', logErr)
      }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
