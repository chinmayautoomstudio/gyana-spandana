import { NextRequest, NextResponse } from 'next/server'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'

/**
 * POST /api/test-email
 * Sends a test email to verify SendGrid is working.
 * Body: { "to": "your@email.com" }
 * Only available in development, or when SENDGRID_API_KEY is set (no auth in production - remove or secure this route if needed).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSendGridConfigured()) {
      return NextResponse.json(
        { error: 'SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const to = typeof body.to === 'string' ? body.to.trim() : ''

    if (!to) {
      return NextResponse.json(
        { error: 'Missing "to" email in request body. Example: { "to": "you@example.com" }' },
        { status: 400 }
      )
    }

    const result = await sendEmail(
      {
        to,
        subject: 'GYANA SPARDHA – Test Email',
        html: `
        <p>This is a test email from GYANA SPARDHA.</p>
        <p>If you received this, SendGrid is configured correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
        text: `This is a test email from GYANA SPARDHA. If you received this, SendGrid is configured correctly. Sent at: ${new Date().toISOString()}`,
      },
      { emailType: SENT_EMAIL_TYPES.TEST }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Test email sent successfully to ' + to }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
