import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'

/**
 * POST /api/test-email
 * Sends a test email to verify SendGrid is working.
 * Body: { "to": "your@email.com" }
 *
 * SECURITY (VULN-02): Restricted to development environment only.
 * This route must NOT be accessible in production or staging.
 */

// SECURITY (VULN-03): Strict rate limit for test endpoint (3 per minute per IP)
import { createRateLimiter, getCallerIp } from '@/lib/rate-limit'
const rateLimiter = createRateLimiter({ limit: 3, windowMs: 60_000 })

export async function POST(request: NextRequest) {
  // SECURITY (VULN-02): Block access in all non-development environments
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Rate limiting
    const ip = getCallerIp(request)
    if (!rateLimiter.check(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

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
      console.error('[API /test-email] SendGrid error:', result.error)
      return NextResponse.json(
        { error: 'Failed to send email.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Test email sent successfully to ' + to }, { status: 200 })
  } catch (err: unknown) {
    console.error('[API /test-email] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
