'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TeamCreationFormData, P2RegistrationFormData } from '@/lib/validations'
import { notifyAllAdmins } from '@/app/actions/notification'

const INVITATION_EXPIRY_DAYS = 7

function generateInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return 'XX'
  let initials = words[0].charAt(0).toUpperCase()
  if (words.length > 1) {
    initials += words[1].charAt(0).toUpperCase()
  } else {
    initials += words[0].length > 1 ? words[0].charAt(1).toUpperCase() : 'X'
  }
  return initials
}

async function generateTeamCode(
  supabase: ReturnType<typeof createAdminClient>,
  p1Initials: string,
  p2Initials: string
): Promise<string> {
  let sequential = 1
  let teamCode = `GS-${p1Initials}-${p2Initials}-${sequential.toString().padStart(4, '0')}`
  while (true) {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('team_code', teamCode)
      .single()
    if (!existing) break
    sequential++
    teamCode = `GS-${p1Initials}-${p2Initials}-${sequential.toString().padStart(4, '0')}`
    if (sequential > 9999) {
      teamCode = `GS-${p1Initials}-${p2Initials}-${Date.now().toString().slice(-4)}`
      break
    }
  }
  return teamCode
}

function generateInvitationToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

export type CreateTeamResult = { success: true } | { success: false; error: string }
export type CompleteP2Result = { success: true } | { success: false; error: string }
export type ResendInvitationResult = { success: true } | { success: false; error: string }
export type InvitationDetails = {
  valid: true
  teamName: string
  p1Name: string
  schoolName: string
  p2Email: string
} | { valid: false; error: string }

export async function getInvitationByToken(token: string): Promise<InvitationDetails> {
  const supabase = createAdminClient()
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, team_name, p2_invited_email, invitation_expires_at, invitation_used_at, status')
    .eq('invitation_token', token)
    .single()

  if (error || !team) {
    return { valid: false, error: 'Invitation not found.' }
  }
  if (team.invitation_used_at) {
    return { valid: false, error: 'This invitation has already been used.' }
  }
  if (team.invitation_expires_at && new Date(team.invitation_expires_at) < new Date()) {
    return { valid: false, error: 'This invitation has expired.' }
  }

  const { data: p1 } = await supabase
    .from('participants')
    .select('name, school_name')
    .eq('team_id', team.id)
    .eq('is_participant1', true)
    .single()

  return {
    valid: true,
    teamName: team.team_name,
    p1Name: p1?.name ?? 'Your teammate',
    schoolName: p1?.school_name ?? '',
    p2Email: team.p2_invited_email ?? '',
  }
}

export async function createTeamAndInviteP2(data: TeamCreationFormData): Promise<CreateTeamResult> {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user?.email) {
    return { success: false, error: 'You must be signed in to create a team.' }
  }

  const admin = createAdminClient()

  const { data: existingParticipant } = await admin
    .from('participants')
    .select('id, team_id')
    .eq('user_id', user.id)
    .single()
  if (existingParticipant) {
    return { success: false, error: 'You have already created or joined a team.' }
  }

  const { data: existingTeam } = await admin
    .from('teams')
    .select('id')
    .eq('team_name', data.teamName)
    .single()
  if (existingTeam) {
    return { success: false, error: 'Team name already exists.' }
  }

  const p1Initials = generateInitials(data.p1Name)
  const tempTeamCode = await generateTeamCode(admin, p1Initials, 'P2')
  const invitationToken = generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

  const authorityName = data.schoolAuthority?.name?.trim() || null
  const authorityEmail = data.schoolAuthority?.email?.trim() || null
  const authorityPhone = data.schoolAuthority?.phone?.trim() || null

  const { data: team, error: teamError } = await admin
    .from('teams')
    .insert({
      team_name: data.teamName,
      team_code: tempTeamCode,
      authority_name: authorityName,
      authority_email: authorityEmail,
      authority_phone: authorityPhone,
      invitation_token: invitationToken,
      p2_invited_email: data.p2Email.trim().toLowerCase(),
      invitation_expires_at: expiresAt.toISOString(),
      status: 'pending_p2',
    })
    .select('id')
    .single()

  if (teamError || !team) {
    return { success: false, error: teamError?.message ?? 'Failed to create team.' }
  }

  const { error: participantError } = await admin.from('participants').insert({
    user_id: user.id,
    team_id: team.id,
    name: data.p1Name,
    email: user.email,
    school_name: data.schoolName,
    phone: null,
    aadhar: null,
    class: null,
    gender: null,
    is_participant1: true,
    email_verified: true,
    phone_verified: false,
  })

  if (participantError) {
    await admin.from('teams').delete().eq('id', team.id)
    return { success: false, error: 'Failed to create your participant record.' }
  }

  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: user.id,
    role: 'participant',
    name: data.p1Name,
  })
  if (profileError && profileError.code !== '23505') {
    console.warn('User profile insert failed:', profileError.message)
  }

  const invitationLink = `${getSiteUrl()}/register/invite/${invitationToken}`
  const expiresAtFormatted = expiresAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  try {
    const res = await fetch(`${getSiteUrl()}/api/send-team-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p2Email: data.p2Email.trim(),
        p1Name: data.p1Name,
        teamName: data.teamName,
        schoolName: data.schoolName,
        invitationLink,
        expiresAt: expiresAtFormatted,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok && !body.skipped) {
      console.error('Send invitation failed', res.status, body)
    }
  } catch (e) {
    console.error('Send invitation error', e)
  }

  try {
    await notifyAllAdmins(
      'New Team Created (Pending P2)',
      `Team "${data.teamName}" created. Invitation sent to ${data.p2Email}.`,
      'info',
      '/admin/teams'
    )
  } catch {
    // ignore
  }

  return { success: true }
}

export async function completeP2Registration(
  token: string,
  data: P2RegistrationFormData
): Promise<CompleteP2Result> {
  const invitation = await getInvitationByToken(token)
  if (!invitation.valid) {
    return { success: false, error: invitation.error }
  }
  const emailLower = data.email.trim().toLowerCase()
  if (emailLower !== invitation.p2Email.toLowerCase()) {
    return { success: false, error: 'Email must match the invited email address.' }
  }

  const admin = createAdminClient()

  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, invitation_used_at, invitation_expires_at')
    .eq('invitation_token', token)
    .single()
  if (teamError || !team || team.invitation_used_at) {
    return { success: false, error: 'Invitation is invalid or already used.' }
  }
  if (team.invitation_expires_at && new Date(team.invitation_expires_at) < new Date()) {
    return { success: false, error: 'This invitation has expired.' }
  }

  const { data: p1Participant } = await admin
    .from('participants')
    .select('name, email')
    .eq('team_id', team.id)
    .eq('is_participant1', true)
    .single()
  const p1Name = p1Participant?.name ?? 'Participant 1'
  const p1Email = p1Participant?.email ?? ''

  const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name },
  })
  if (createUserError || !newUser.user) {
    return { success: false, error: createUserError?.message ?? 'Failed to create account.' }
  }

  const p1Initials = generateInitials(p1Name)
  const p2Initials = generateInitials(data.name)
  const teamCode = await generateTeamCode(admin, p1Initials, p2Initials)

  const { error: updateTeamError } = await admin
    .from('teams')
    .update({
      team_code: teamCode,
      invitation_used_at: new Date().toISOString(),
      status: 'complete',
    })
    .eq('id', team.id)
  if (updateTeamError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Failed to update team.' }
  }

  const { data: teamRow } = await admin.from('teams').select('team_name').eq('id', team.id).single()
  const { data: p1Row } = await admin.from('participants').select('school_name').eq('team_id', team.id).eq('is_participant1', true).single()
  const schoolName = p1Row?.school_name ?? ''

  const { error: participantError } = await admin.from('participants').insert({
    user_id: newUser.user.id,
    team_id: team.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    school_name: schoolName,
    aadhar: data.aadhar,
    class: data.class,
    gender: data.gender,
    is_participant1: false,
    email_verified: true,
    phone_verified: false,
  })
  if (participantError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    await admin.from('teams').update({ invitation_used_at: null, status: 'pending_p2' }).eq('id', team.id)
    return { success: false, error: 'Failed to create participant record.' }
  }

  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: newUser.user.id,
    role: 'participant',
    name: data.name,
  })
  if (profileError && profileError.code !== '23505') {
    console.warn('User profile insert failed:', profileError.message)
  }

  const siteUrl = getSiteUrl()
  const registrationDate = new Date().toISOString()
  const apiUrl = `${siteUrl}/api/send-registration-confirmation`
  const sendOne = async (payload: {
    participantEmail: string
    participantName: string
    participantSchool: string
    teammateName: string
    teammateSchool: string
    teamName: string
    teamCode: string
    registrationDate: string
  }) => {
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Registration confirmation email failed', err)
    }
  }
  await sendOne({
    participantEmail: data.email,
    participantName: data.name,
    participantSchool: schoolName,
    teammateName: p1Name,
    teammateSchool: schoolName,
    teamName: teamRow?.team_name ?? '',
    teamCode,
    registrationDate,
  })
  if (p1Email) {
    await sendOne({
      participantEmail: p1Email,
      participantName: p1Name,
      participantSchool: schoolName,
      teammateName: data.name,
      teammateSchool: schoolName,
      teamName: teamRow?.team_name ?? '',
      teamCode,
      registrationDate,
    })
  }

  try {
    await notifyAllAdmins(
      'New Team Registered',
      `Team "${teamRow?.team_name}" is now complete with both participants.`,
      'success',
      '/admin/teams'
    )
  } catch {
    // ignore
  }

  return { success: true }
}

export async function resendInvitation(teamId: string): Promise<ResendInvitationResult> {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const admin = createAdminClient()
  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, team_name, p2_invited_email, status')
    .eq('id', teamId)
    .single()
  if (teamError || !team) {
    return { success: false, error: 'Team not found.' }
  }
  if (team.status !== 'pending_p2') {
    return { success: false, error: 'This team is already complete.' }
  }

  const { data: p1 } = await admin
    .from('participants')
    .select('user_id, name, school_name')
    .eq('team_id', teamId)
    .eq('is_participant1', true)
    .single()
  if (!p1 || p1.user_id !== user.id) {
    return { success: false, error: 'You are not authorized to resend this invitation.' }
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
    .eq('id', teamId)
  if (updateError) {
    return { success: false, error: 'Failed to update invitation.' }
  }

  const invitationLink = `${getSiteUrl()}/register/invite/${invitationToken}`
  const expiresAtFormatted = expiresAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  try {
    const res = await fetch(`${getSiteUrl()}/api/send-team-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p2Email: team.p2_invited_email,
        p1Name: p1.name ?? 'Your teammate',
        teamName: team.team_name,
        schoolName: p1.school_name ?? '',
        invitationLink,
        expiresAt: expiresAtFormatted,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (!(body as { skipped?: boolean }).skipped) {
        return { success: false, error: 'Failed to send invitation email.' }
      }
    }
  } catch (e) {
    console.error('Resend invitation error', e)
    return { success: false, error: 'Failed to send invitation email.' }
  }

  return { success: true }
}
