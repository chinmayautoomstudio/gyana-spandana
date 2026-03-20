'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TeamCreationFormData, P2RegistrationFormData, P2RegistrationWithGoogleFormData } from '@/lib/validations'
import { notifyAllAdmins } from '@/app/actions/notification'

const INVITATION_EXPIRY_DAYS = 7

/** Team code: GS- + first 8 chars of UUID (e.g. GS-A7F2K9M4). Unique, no name info, never updated. */
function generateShortTeamCode(): string {
  return 'GS-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
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
export type TeamNameAvailabilityResult = { available: true } | { available: false; error: string }
export type CompleteP2Result = { success: true } | { success: false; error: string }
export type ResendInvitationResult = { success: true } | { success: false; error: string }
export type UpdateTeamAuthorityResult = { success: true } | { success: false; error: string }
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

export async function checkTeamNameAvailability(teamName: string): Promise<TeamNameAvailabilityResult> {
  const trimmed = teamName?.trim()
  if (!trimmed) return { available: false, error: 'Team name is required.' }
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('teams')
    .select('id')
    .eq('team_name', trimmed)
    .maybeSingle()
  if (existing) return { available: false, error: 'Team name already exists.' }
  return { available: true }
}

export async function checkPendingInvitationForEmail(
  email: string
): Promise<{ hasPending: true; token: string; teamName: string } | { hasPending: false }> {
  const trimmed = email?.trim().toLowerCase()
  if (!trimmed) return { hasPending: false }

  const admin = createAdminClient()
  // Use limit(1) instead of maybeSingle() - maybeSingle errors when multiple rows match.
  // Use ilike for case-insensitive match in case p2_invited_email has mixed case.
  const { data: rows } = await admin
    .from('teams')
    .select('invitation_token, team_name, invitation_expires_at')
    .ilike('p2_invited_email', trimmed)
    .is('invitation_used_at', null)
    .eq('status', 'pending_p2')
    .limit(1)

  const data = Array.isArray(rows) ? rows[0] : rows
  if (data?.invitation_token && (!data.invitation_expires_at || new Date(data.invitation_expires_at) > new Date())) {
    return { hasPending: true, token: data.invitation_token, teamName: data.team_name ?? '' }
  }
  return { hasPending: false }
}

export async function createTeamAndInviteP2(data: TeamCreationFormData): Promise<CreateTeamResult> {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to create a team.' }
  }
  // Get logged-in email (works for both email/password and Google/OAuth)
  const p1EmailRaw = user.email ?? (user.user_metadata?.email as string | undefined)
  if (!p1EmailRaw?.trim()) {
    return { success: false, error: 'You must be signed in to create a team.' }
  }

  const p1Email = p1EmailRaw.trim().toLowerCase()
  const p2Email = data.p2Email.trim().toLowerCase()
  if (p1Email === p2Email) {
    return { success: false, error: 'Participant 2 must use a different email address than yours.' }
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

  const pendingInvite = await checkPendingInvitationForEmail(p1Email)
  if (pendingInvite.hasPending) {
    return {
      success: false,
      error: `Your email already has a pending team invitation for "${pendingInvite.teamName}". Please check your email and use the invitation link to join your team instead.`,
    }
  }

  const { data: existingTeam } = await admin
    .from('teams')
    .select('id')
    .eq('team_name', data.teamName)
    .single()
  if (existingTeam) {
    return { success: false, error: 'Team name already exists.' }
  }

  const invitationToken = generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

  const authorityName = data.schoolAuthority?.name?.trim() || null
  const authorityEmail = data.schoolAuthority?.email?.trim() || null
  const authorityPhone = data.schoolAuthority?.phone?.trim() || null

  let teamCode = generateShortTeamCode()
  let team: { id: string } | null = null
  let teamError: { message?: string; code?: string } | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await admin
      .from('teams')
      .insert({
        team_name: data.teamName,
        team_code: teamCode,
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
    team = result.data
    teamError = result.error
    if (!teamError || teamError.code !== '23505') break
    teamCode = generateShortTeamCode()
  }

  if (teamError || !team) {
    return { success: false, error: teamError?.message ?? 'Failed to create team.' }
  }

  const profilePhotoUrl = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) ?? null
  const { error: participantError } = await admin.from('participants').insert({
    user_id: user.id,
    team_id: team.id,
    name: data.p1Name,
    email: user.email,
    school_name: data.schoolName,
    gender: data.p1Gender ?? null,
    phone: data.p1Phone?.trim() || null,
    aadhar: data.p1Aadhar?.replace(/\s/g, '') || null,
    class: data.p1Class ?? null,
    is_participant1: true,
    email_verified: true,
    phone_verified: false,
    profile_photo_url: typeof profilePhotoUrl === 'string' ? profilePhotoUrl : null,
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

  // Fire-and-forget: do not block response on email or admin notifications
  void fetch(`${getSiteUrl()}/api/send-team-invitation`, {
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
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}))
    if (!res.ok && !(body as { skipped?: boolean }).skipped) {
      console.error('Send invitation failed', res.status, body)
    }
  }).catch((e) => {
    console.error('Send invitation error', e)
  })

  notifyAllAdmins(
    'New Team Created (Pending P2)',
    `Team "${data.teamName}" created. Invitation sent to ${data.p2Email}.`,
    'info',
    '/admin/teams'
  ).catch((err) => {
    console.error('[notifyAllAdmins] failed (createTeamAndInviteP2):', err)
  })

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

  // Prevent P2 from using the same email as P1
  if (p1Participant?.email && emailLower === p1Participant.email.toLowerCase()) {
    return { success: false, error: 'Participant 2 cannot use the same email address as Participant 1.' }
  }

  // Check if the email is already registered as a participant (e.g. previous attempt)
  const { data: existingParticipant } = await admin
    .from('participants')
    .select('id')
    .eq('email', emailLower)
    .single()
  if (existingParticipant) {
    return { success: false, error: 'This email is already registered for a team. Please log in or use a different email.' }
  }

  const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name },
  })
  if (createUserError || !newUser.user) {
    const isDuplicate =
      createUserError?.message?.toLowerCase().includes('already') ||
      createUserError?.message?.toLowerCase().includes('registered') ||
      createUserError?.message?.toLowerCase().includes('exists')
    if (isDuplicate) {
      return {
        success: false,
        error:
          'An account with this email already exists (possibly from a Google sign-in). ' +
          'Please use a different email address or contact support.',
      }
    }
    return { success: false, error: createUserError?.message ?? 'Failed to create account.' }
  }

  const { error: updateTeamError } = await admin
    .from('teams')
    .update({
      invitation_used_at: new Date().toISOString(),
      status: 'complete',
    })
    .eq('id', team.id)
  if (updateTeamError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return { success: false, error: 'Failed to update team.' }
  }

  const { data: teamRow } = await admin.from('teams').select('team_name, team_code').eq('id', team.id).single()
  const { data: p1Row } = await admin.from('participants').select('id, school_name').eq('team_id', team.id).eq('is_participant1', true).single()
  const schoolName = p1Row?.school_name ?? ''

  const { data: p2Participant, error: participantError } = await admin.from('participants').insert({
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
  }).select('id').single()
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
  const teamCode = teamRow?.team_code ?? ''
  const teamName = teamRow?.team_name ?? ''

  const sendConfirmation = (payload: {
    participantEmail: string
    participantName: string
    participantSchool: string
    teammateName: string
    teammateSchool: string
    teamName: string
    teamCode: string
    registrationDate: string
    participantId?: string
  }) => {
    void fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => { console.error('Registration confirmation email failed', err) })
  }

  // Fire-and-forget: do not block on confirmation emails or admin notifications
  sendConfirmation({
    participantEmail: data.email,
    participantName: data.name,
    participantSchool: schoolName,
    teammateName: p1Name,
    teammateSchool: schoolName,
    teamName,
    teamCode,
    registrationDate,
    participantId: p2Participant?.id,
  })
  if (p1Email) {
    sendConfirmation({
      participantEmail: p1Email,
      participantName: p1Name,
      participantSchool: schoolName,
      teammateName: data.name,
      teammateSchool: schoolName,
      teamName,
      teamCode,
      registrationDate,
      participantId: p1Row?.id,
    })
  }

  notifyAllAdmins(
    'New Team Registered',
    `Team "${teamName}" is now complete with both participants.`,
    'success',
    '/admin/teams'
  ).catch((err) => {
    console.error('[notifyAllAdmins] failed (completeP2Registration):', err)
  })

  return { success: true }
}

export async function completeP2RegistrationWithGoogle(
  token: string,
  data: P2RegistrationWithGoogleFormData
): Promise<CompleteP2Result> {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user?.email) {
    return { success: false, error: 'Not authenticated.' }
  }

  const invitation = await getInvitationByToken(token)
  if (!invitation.valid) {
    return { success: false, error: invitation.error }
  }
  const userEmail = user.email.trim().toLowerCase()
  const invitedEmail = invitation.p2Email.toLowerCase()
  if (userEmail !== invitedEmail) {
    return { success: false, error: 'Email does not match invitation.' }
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
    .select('id, name, email, school_name')
    .eq('team_id', team.id)
    .eq('is_participant1', true)
    .single()
  const p1Name = p1Participant?.name ?? 'Participant 1'
  const p1Email = p1Participant?.email ?? ''
  const schoolName = p1Participant?.school_name ?? ''

  if (p1Participant?.email && userEmail === p1Participant.email.toLowerCase()) {
    return { success: false, error: 'Participant 2 cannot use the same email address as Participant 1.' }
  }

  const { data: existingParticipant } = await admin
    .from('participants')
    .select('id')
    .eq('email', userEmail)
    .single()
  if (existingParticipant) {
    return { success: false, error: 'This email is already registered for a team. Please log in.' }
  }

  const { error: updateTeamError } = await admin
    .from('teams')
    .update({
      invitation_used_at: new Date().toISOString(),
      status: 'complete',
    })
    .eq('id', team.id)
  if (updateTeamError) {
    return { success: false, error: 'Failed to update team.' }
  }

  const { data: teamRow } = await admin.from('teams').select('team_name, team_code').eq('id', team.id).single()

  const profilePhotoUrl = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) ?? null
  const { data: p2Participant, error: participantError } = await admin.from('participants').insert({
    user_id: user.id,
    team_id: team.id,
    name: data.name,
    email: user.email,
    phone: data.phone,
    school_name: schoolName,
    aadhar: data.aadhar,
    class: data.class,
    gender: data.gender,
    is_participant1: false,
    email_verified: true,
    phone_verified: false,
    profile_photo_url: typeof profilePhotoUrl === 'string' ? profilePhotoUrl : null,
  }).select('id').single()
  if (participantError) {
    await admin.from('teams').update({ invitation_used_at: null, status: 'pending_p2' }).eq('id', team.id)
    return { success: false, error: 'Failed to create participant record.' }
  }

  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: user.id,
    role: 'participant',
    name: data.name,
  })
  if (profileError && profileError.code !== '23505') {
    console.warn('User profile insert failed:', profileError.message)
  }

  const siteUrl = getSiteUrl()
  const registrationDate = new Date().toISOString()
  const apiUrl = `${siteUrl}/api/send-registration-confirmation`
  const teamCode = teamRow?.team_code ?? ''
  const teamName = teamRow?.team_name ?? ''

  const sendConfirmation = (payload: {
    participantEmail: string
    participantName: string
    participantSchool: string
    teammateName: string
    teammateSchool: string
    teamName: string
    teamCode: string
    registrationDate: string
    participantId?: string
  }) => {
    void fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => { console.error('Registration confirmation email failed', err) })
  }
  sendConfirmation({
    participantEmail: user.email,
    participantName: data.name,
    participantSchool: schoolName,
    teammateName: p1Name,
    teammateSchool: schoolName,
    teamName,
    teamCode,
    registrationDate,
    participantId: p2Participant?.id,
  })
  if (p1Email) {
    sendConfirmation({
      participantEmail: p1Email,
      participantName: p1Name,
      participantSchool: schoolName,
      teammateName: data.name,
      teammateSchool: schoolName,
      teamName,
      teamCode,
      registrationDate,
      participantId: p1Participant?.id,
    })
  }
  notifyAllAdmins(
    'New Team Registered',
    `Team "${teamName}" is now complete with both participants.`,
    'success',
    '/admin/teams'
  ).catch((err) => {
    console.error('[notifyAllAdmins] failed (completeP2RegistrationWithGoogle):', err)
  })

  return { success: true }
}

export async function updateTeamAuthority(
  teamId: string,
  authority: { name: string | null; email: string | null; phone: string | null }
): Promise<UpdateTeamAuthorityResult> {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const admin = createAdminClient()
  const { data: participant } = await admin
    .from('participants')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()
  if (!participant) {
    return { success: false, error: 'You are not a member of this team.' }
  }

  const { error } = await admin
    .from('teams')
    .update({
      authority_name: authority.name?.trim() || null,
      authority_email: authority.email?.trim() || null,
      authority_phone: authority.phone?.trim() || null,
    })
    .eq('id', teamId)
  if (error) {
    return { success: false, error: 'Failed to update authority details.' }
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
