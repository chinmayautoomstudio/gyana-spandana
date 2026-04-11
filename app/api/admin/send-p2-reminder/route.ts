import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'
import { buildTeamInvitationReminderEmail } from '@/lib/email/templates/team-invitation-reminder'

const INVITATION_EXPIRY_DAYS = 7

function generateInvitationToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseServer
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId } = body as { teamId?: string }

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    if (!isSendGridConfigured()) {
      return NextResponse.json({
        error: 'Email service not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.',
      }, { status: 500 })
    }

    const admin = createAdminClient()

    const { data: team, error: teamError } = await admin
      .from('teams')
      .select('id, team_name, p2_invited_email, status')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.p2_invited_email) {
      return NextResponse.json({ error: 'No invited email found for Participant 2' }, { status: 400 })
    }

    if (team.status !== 'pending_p2') {
      return NextResponse.json({ error: 'This team is already complete' }, { status: 400 })
    }

    const { data: p1 } = await admin
      .from('participants')
      .select('name, school_name')
      .eq('team_id', teamId)
      .eq('is_participant1', true)
      .single()

    const invitationToken = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const { error: updateError } = await admin
      .from('teams')
      .update({
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq('id', teamId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invitation token' }, { status: 500 })
    }

    const siteUrl = getSiteUrl()
    const invitationLink = `${siteUrl}/register/invite/${invitationToken}`
    const expiresAtFormatted = expiresAt.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const { subject, html, text } = buildTeamInvitationReminderEmail({
      p2Email: team.p2_invited_email,
      p1Name: p1?.name ?? 'Your teammate',
      teamName: team.team_name,
      schoolName: p1?.school_name ?? '',
      invitationLink,
      expiresAt: expiresAtFormatted,
    })

    const result = await sendEmail(
      {
        to: team.p2_invited_email,
        subject,
        html,
        text,
      },
      {
        emailType: SENT_EMAIL_TYPES.TEAM_INVITATION_REMINDER,
        metadata: {
          team_id: teamId,
          team_name: team.team_name,
          triggered_by_user_id: user.id,
        },
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send reminder email', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending P2 reminder email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

