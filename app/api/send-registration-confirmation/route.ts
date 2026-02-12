import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { buildRegistrationConfirmationEmail } from '@/lib/email/templates/registration-confirmation'

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

    const result = await sendEmail({
      to: participantEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    })

    if (!result.success) {
      console.error('SendGrid error:', result.error)
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
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
  } catch (error: any) {
    console.error('Error sending registration confirmation email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
