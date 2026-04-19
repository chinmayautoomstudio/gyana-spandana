import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'
import { buildTeamInvitationEmail } from '@/lib/email/templates/team-invitation'
import { createRateLimiter, getCallerIp } from '@/lib/rate-limit'

interface TeamInvitationPayload {
  p2Email: string
  p1Name: string
  teamName: string
  schoolName: string
  invitationLink: string
  expiresAt: string
}

// SECURITY (VULN-03): 5 invitations per IP per 10 minutes
const rateLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })

export async function POST(request: NextRequest) {
  try {
    // SECURITY (VULN-01): Require an authenticated session before sending any email.
    // Without this, anyone can craft a request to trigger outbound emails via our SendGrid account.
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

    const body: TeamInvitationPayload = await request.json()
    const { p2Email, p1Name, teamName, schoolName, invitationLink, expiresAt } = body

    if (!p2Email || !p1Name || !teamName || !invitationLink || !expiresAt) {
      return NextResponse.json(
        { error: 'Missing required fields: p2Email, p1Name, teamName, invitationLink, expiresAt' },
        { status: 400 }
      )
    }

    if (!isSendGridConfigured()) {
      console.warn('SendGrid not configured. Team invitation email skipped.')
      return NextResponse.json(
        { message: 'Email service not configured', skipped: true },
        { status: 200 }
      )
    }

    const { subject, html, text } = buildTeamInvitationEmail({
      p2Email,
      p1Name,
      teamName,
      schoolName: schoolName || '',
      invitationLink,
      expiresAt,
    })

    const result = await sendEmail(
      { to: p2Email, subject, html, text },
      {
        emailType: SENT_EMAIL_TYPES.TEAM_INVITATION,
        metadata: { team_name: teamName, p2_email: p2Email },
      }
    )

    if (!result.success) {
      // SECURITY (VULN-07): Log detailed error server-side; return generic message to client
      console.error('[API /send-team-invitation] SendGrid error:', result.error)
      return NextResponse.json(
        { error: 'Failed to send invitation email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API /send-team-invitation] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
