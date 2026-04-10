import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { buildP1PendingPartnerReminderEmail } from '@/lib/email/templates/p1-pending-partner-reminder'

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

export async function POST() {
  try {
    const supabaseServer = await createClient()
    const {
      data: { user },
    } = await supabaseServer.auth.getUser()

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

    if (!isSendGridConfigured()) {
      return NextResponse.json(
        {
          error: 'Email service not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.',
        },
        { status: 500 },
      )
    }

    const admin = createAdminClient()
    const { data: teams, error: listError } = await admin
      .from('teams')
      .select('id, team_name, p2_invited_email, status')
      .eq('status', 'pending_p2')
      .not('p2_invited_email', 'is', null)

    if (listError) {
      return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 })
    }

    const pending = (teams ?? []).filter((t) => Boolean(t.p2_invited_email?.trim()))
    let sent = 0
    let failed = 0
    const errors: string[] = []
    const siteUrl = getSiteUrl()
    const updateP2EmailLink = `${siteUrl}/team/update-p2-email`

    for (const team of pending) {
      const p2InvitedEmail = team.p2_invited_email!.trim()

      const { data: p1 } = await admin
        .from('participants')
        .select('name, school_name, email')
        .eq('team_id', team.id)
        .eq('is_participant1', true)
        .single()

      const p1Email = p1?.email?.trim()
      if (!p1Email) {
        failed += 1
        errors.push(`${team.team_name}: Participant 1 has no email on file`)
        continue
      }

      const invitationToken = generateInvitationToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

      const { error: updateError } = await admin
        .from('teams')
        .update({
          invitation_token: invitationToken,
          invitation_expires_at: expiresAt.toISOString(),
        })
        .eq('id', team.id)

      if (updateError) {
        failed += 1
        errors.push(`${team.team_name}: failed to refresh invitation token`)
        continue
      }

      const invitationLink = `${siteUrl}/register/invite/${invitationToken}`
      const expiresAtFormatted = expiresAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const { subject, html, text } = buildP1PendingPartnerReminderEmail({
        p1Name: p1?.name ?? 'there',
        teamName: team.team_name,
        p2InvitedEmail,
        invitationLink,
        updateP2EmailLink,
        expiresAt: expiresAtFormatted,
      })

      const result = await sendEmail({
        to: p1Email,
        subject,
        html,
        text,
      })

      if (!result.success) {
        failed += 1
        errors.push(`${team.team_name}: ${result.error}`)
      } else {
        sent += 1
      }
    }

    return NextResponse.json({ success: true, sent, failed, errors, total: pending.length })
  } catch (error: unknown) {
    console.error('Bulk P1 pending-partner notify error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
