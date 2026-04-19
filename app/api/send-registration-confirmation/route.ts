import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'
import { buildRegistrationConfirmationEmail } from '@/lib/email/templates/registration-confirmation'
import { createRateLimiter, getCallerIp } from '@/lib/rate-limit'

// SECURITY (VULN-03): 10 confirmation emails per IP per 15 minutes
const rateLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 })

interface RegistrationConfirmationPayload {
  participantEmail: string
  participantName: string
  participantSchool: string
  teammateName: string
  teammateSchool: string
  teamName: string
  teamCode: string
  registrationDate: string
  participantId?: string
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY (VULN-01): Require an authenticated session before sending any email.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY (VULN-03): Rate limit to prevent email flooding
    const ip = getCallerIp(request)
    if (!rateLimiter.check(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body: RegistrationConfirmationPayload = await request.json()
    const {
      participantEmail,
      participantName,
      participantSchool,
      teammateName,
      teammateSchool,
      teamName,
      teamCode,
      registrationDate,
      participantId,
    } = body

    // Validate required fields
    if (!participantEmail || !participantName || !teamName || !teamCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isSendGridConfigured()) {
      console.warn('SendGrid not configured. Email notification skipped.')
      return NextResponse.json(
        { message: 'Email service not configured', skipped: true },
        { status: 200 }
      )
    }

    // Format registration date
    const registrationDateFormatted = new Date(registrationDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Get site URL for login link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const loginUrl = `${siteUrl}/login`

    const { subject: emailSubject, html: emailHtml, text: emailText } = buildRegistrationConfirmationEmail({
      participantName,
      participantEmail,
      participantSchool: participantSchool || '',
      teammateName,
      teammateSchool: teammateSchool || '',
      teamName,
      teamCode,
      registrationDateFormatted,
      loginUrl,
    })

    const result = await sendEmail(
      {
        to: participantEmail,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      },
      {
        emailType: SENT_EMAIL_TYPES.REGISTRATION_CONFIRMATION,
        metadata: {
          participant_id: participantId ?? null,
          team_name: teamName,
          team_code: teamCode,
        },
      }
    )

    if (!result.success) {
      console.error('[API /send-registration-confirmation] SendGrid error:', result.error)
      return NextResponse.json(
        { error: 'Failed to send confirmation email. Please try again.' },
        { status: 500 }
      )
    }

    if (participantId) {
      try {
        const supabase = createAdminClient()
        await supabase
          .from('participants')
          .update({ registration_email_sent_at: new Date().toISOString() })
          .eq('id', participantId)
      } catch (updateErr) {
        console.error('Failed to update registration_email_sent_at for participant', participantId, updateErr)
        // Do not fail the response; email was sent
      }
    }

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('[API /send-registration-confirmation] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
