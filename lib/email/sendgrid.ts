import sgMail from '@sendgrid/mail'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
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
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: true } | { success: false; error: string }> {
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
  }

  try {
    await sgMail.send(msg)
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
