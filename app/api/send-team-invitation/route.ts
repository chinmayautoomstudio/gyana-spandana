import { NextRequest, NextResponse } from 'next/server'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'
import { buildTeamInvitationEmail } from '@/lib/email/templates/team-invitation'

interface TeamInvitationPayload {
  p2Email: string
  p1Name: string
  teamName: string
  schoolName: string
  invitationLink: string
  expiresAt: string
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send team invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
