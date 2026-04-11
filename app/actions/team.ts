'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  TEAM_NAME_MAX_LENGTH,
  teamNameSchema,
  type TeamCreationFormData,
  type P2RegistrationFormData,
  type P2RegistrationWithGoogleFormData,
} from '@/lib/validations'
import { notifyAllAdmins } from '@/app/actions/notification'
import { isSendGridConfigured, sendEmail } from '@/lib/email/sendgrid'
import { SENT_EMAIL_TYPES } from '@/lib/email/email-types'
import { buildTeamNameChangedP2Email } from '@/lib/email/templates/team-name-changed-p2'

const INVITATION_EXPIRY_DAYS = 7

const P2_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Escape `%`, `_`, and `\` for an exact Postgres `ILIKE` match (no wildcards). */
function escapeForExactIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

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
export type UpdateP2EmailResult = { success: true } | { success: false; error: string }
export type RenameTeamOnceResult = { success: true } | { success: false; error: string }
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
  if (trimmed.length < 2) {
    return { available: false, error: 'Team name must be at least 2 characters.' }
  }
  if (trimmed.length > TEAM_NAME_MAX_LENGTH) {
    return {
      available: false,
      error: `Team name must be at most ${TEAM_NAME_MAX_LENGTH} characters.`,
    }
  }
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

export type InvitedP2EmailCheckResult = { ok: true } | { ok: false; error: string }

type P2InviteEmailAvail = { ok: true } | { ok: false; error: string }

/**
 * Participant 2 invite email must not match any registered participant and must not be
 * p2_invited_email on another pending_p2 team (even if an invite link was already opened).
 */
async function assertP2InviteEmailAvailable(
  normalizedEmail: string,
  excludeTeamId?: string
): Promise<P2InviteEmailAvail> {
  const admin = createAdminClient()

  const { data: p2Rows, error: p2Err } = await admin
    .from('participants')
    .select('id')
    .ilike('email', escapeForExactIlike(normalizedEmail))
    .limit(1)
  if (p2Err) {
    return { ok: false, error: 'Unable to verify Participant 2 email. Please try again.' }
  }
  const p2List = Array.isArray(p2Rows) ? p2Rows : p2Rows ? [p2Rows] : []
  if (p2List.length > 0) {
    return {
      ok: false,
      error:
        'This email is already registered on a team. Use a different address for Participant 2.',
    }
  }

  let pendingQuery = admin
    .from('teams')
    .select('id')
    .ilike('p2_invited_email', escapeForExactIlike(normalizedEmail))
    .eq('status', 'pending_p2')
    .limit(1)
  if (excludeTeamId) {
    pendingQuery = pendingQuery.neq('id', excludeTeamId)
  }
  const { data: pendingRows, error: pendErr } = await pendingQuery
  if (pendErr) {
    return { ok: false, error: 'Unable to verify Participant 2 email. Please try again.' }
  }
  const pendList = Array.isArray(pendingRows) ? pendingRows : pendingRows ? [pendingRows] : []
  if (pendList.length > 0) {
    return {
      ok: false,
      error:
        'This email is already invited as Participant 2 on another team that has not finished registration. Use a different address.',
    }
  }

  return { ok: true }
}

/**
 * Validates Participant 2 invite email before team creation (step UX + same rules as createTeamAndInviteP2).
 */
export async function validateInvitedP2EmailForTeamCreation(
  p2EmailRaw: string
): Promise<InvitedP2EmailCheckResult> {
  const trimmed = p2EmailRaw?.trim() ?? ''
  if (!trimmed) {
    return { ok: false, error: 'Participant 2 email is required.' }
  }
  if (!P2_EMAIL_REGEX.test(trimmed)) {
    return { ok: false, error: 'Please enter a valid email address for Participant 2.' }
  }

  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const p1EmailRaw = user.email ?? (user.user_metadata?.email as string | undefined)
  const p1Email = p1EmailRaw?.trim().toLowerCase() ?? ''
  const p2Email = trimmed.toLowerCase()
  if (p1Email && p2Email === p1Email) {
    return { ok: false, error: 'Participant 2 must use a different email address than yours.' }
  }

  return assertP2InviteEmailAvailable(p2Email)
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

  const p2InviteCheck = await validateInvitedP2EmailForTeamCreation(data.p2Email)
  if (!p2InviteCheck.ok) {
    return { success: false, error: p2InviteCheck.error }
  }

  const teamNameTrimmed = data.teamName.trim()
  if (teamNameTrimmed.length < 2 || teamNameTrimmed.length > TEAM_NAME_MAX_LENGTH) {
    return {
      success: false,
      error: `Team name must be between 2 and ${TEAM_NAME_MAX_LENGTH} characters.`,
    }
  }

  const { data: existingTeam } = await admin
    .from('teams')
    .select('id')
    .eq('team_name', teamNameTrimmed)
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
        team_name: teamNameTrimmed,
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
    email: p1Email,
    school_name: data.schoolName,
    gender: data.p1Gender ?? null,
    phone: data.p1Phone?.trim() || null,
    aadhar: data.p1Aadhar?.replace(/\s/g, '') || null,
    class: data.p1Class ?? null,
    date_of_birth: data.p1DateOfBirth,
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
      teamName: teamNameTrimmed,
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
    `Team "${teamNameTrimmed}" created. Invitation sent to ${data.p2Email}.`,
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

  const { data: existingRows, error: existingErr } = await admin
    .from('participants')
    .select('id')
    .ilike('email', escapeForExactIlike(emailLower))
    .limit(1)
  if (existingErr) {
    return { success: false, error: 'Unable to verify email. Please try again.' }
  }
  const existingList = Array.isArray(existingRows) ? existingRows : existingRows ? [existingRows] : []
  if (existingList.length > 0) {
    return { success: false, error: 'This email is already registered for a team. Please log in or use a different email.' }
  }

  const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
    email: emailLower,
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
    email: emailLower,
    phone: data.phone,
    school_name: schoolName,
    aadhar: data.aadhar,
    class: data.class,
    gender: data.gender,
    date_of_birth: data.dateOfBirth,
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
    participantEmail: emailLower,
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

  const { data: existingGoogleRows, error: existingGoogleErr } = await admin
    .from('participants')
    .select('id')
    .ilike('email', escapeForExactIlike(userEmail))
    .limit(1)
  if (existingGoogleErr) {
    return { success: false, error: 'Unable to verify email. Please try again.' }
  }
  const existingGoogleList = Array.isArray(existingGoogleRows)
    ? existingGoogleRows
    : existingGoogleRows
      ? [existingGoogleRows]
      : []
  if (existingGoogleList.length > 0) {
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
    email: userEmail,
    phone: data.phone,
    school_name: schoolName,
    aadhar: data.aadhar,
    class: data.class,
    gender: data.gender,
    date_of_birth: data.dateOfBirth,
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
    participantEmail: userEmail,
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

/**
 * Participant 1 may change Participant 2's invited email only while the team is still pending P2 registration.
 * Rotates the invitation token and sends a new invitation to the updated address.
 */
export async function updateP2InvitedEmail(newEmail: string): Promise<UpdateP2EmailResult> {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const trimmed = newEmail?.trim()
  if (!trimmed) {
    return { success: false, error: 'Email address is required.' }
  }
  if (!P2_EMAIL_REGEX.test(trimmed)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const p2EmailLower = trimmed.toLowerCase()
  const p1EmailRaw = user.email ?? (user.user_metadata?.email as string | undefined)
  const p1Email = p1EmailRaw?.trim().toLowerCase() ?? ''
  if (p1Email && p2EmailLower === p1Email) {
    return { success: false, error: 'Participant 2 must use a different email address than yours.' }
  }

  const admin = createAdminClient()
  const { data: p1Participant, error: p1Error } = await admin
    .from('participants')
    .select('id, team_id, email')
    .eq('user_id', user.id)
    .eq('is_participant1', true)
    .maybeSingle()

  if (p1Error || !p1Participant?.team_id) {
    return { success: false, error: 'Only Participant 1 can update the invited email.' }
  }

  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, team_name, p2_invited_email, status, invitation_used_at')
    .eq('id', p1Participant.team_id)
    .single()

  if (teamError || !team) {
    return { success: false, error: 'Team not found.' }
  }
  if (team.status !== 'pending_p2' || team.invitation_used_at) {
    return { success: false, error: 'You can only change Participant 2’s email before registration is complete.' }
  }

  const previousLower = (team.p2_invited_email ?? '').trim().toLowerCase()
  if (previousLower === p2EmailLower) {
    return { success: false, error: 'Enter a different email address than the current invite.' }
  }

  const avail = await assertP2InviteEmailAvailable(p2EmailLower, team.id)
  if (!avail.ok) {
    return { success: false, error: avail.error }
  }

  const invitationToken = generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

  const { error: updateError } = await admin
    .from('teams')
    .update({
      p2_invited_email: p2EmailLower,
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
    })
    .eq('id', team.id)

  if (updateError) {
    return { success: false, error: updateError.message ?? 'Failed to update invited email.' }
  }

  const { data: p1 } = await admin
    .from('participants')
    .select('name, school_name')
    .eq('team_id', team.id)
    .eq('is_participant1', true)
    .single()

  const invitationLink = `${getSiteUrl()}/register/invite/${invitationToken}`
  const expiresAtFormatted = expiresAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  void fetch(`${getSiteUrl()}/api/send-team-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p2Email: trimmed,
      p1Name: p1?.name ?? 'Your teammate',
      teamName: team.team_name,
      schoolName: p1?.school_name ?? '',
      invitationLink,
      expiresAt: expiresAtFormatted,
    }),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => ({}))
      if (!res.ok && !(body as { skipped?: boolean }).skipped) {
        console.error('Send invitation after P2 email update failed', res.status, body)
      }
    })
    .catch((e) => {
      console.error('Send invitation after P2 email update error', e)
    })

  return { success: true }
}

/**
 * Participant 1 may rename the team once per `team_name_renamed_at` cycle (admins can clear the flag).
 * Allowed when the team is `pending_p2` or `complete`. Refreshes the P2 invite email when still pending;
 * emails Participant 2 when the team is already complete.
 */
export async function renameTeamNameOnce(newTeamName: string): Promise<RenameTeamOnceResult> {
  const supabaseServer = await createClient()
  const {
    data: { user },
  } = await supabaseServer.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const parsed = teamNameSchema.safeParse(newTeamName)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid team name.'
    return { success: false, error: msg }
  }
  const newNameTrimmed = parsed.data

  const admin = createAdminClient()
  const { data: p1Participant, error: p1Error } = await admin
    .from('participants')
    .select('id, team_id')
    .eq('user_id', user.id)
    .eq('is_participant1', true)
    .maybeSingle()

  if (p1Error || !p1Participant?.team_id) {
    return { success: false, error: 'Only Participant 1 can rename the team.' }
  }

  const { data: team, error: teamError } = await admin
    .from('teams')
    .select('id, team_name, status, team_name_renamed_at, p2_invited_email')
    .eq('id', p1Participant.team_id)
    .single()

  if (teamError || !team) {
    return { success: false, error: 'Team not found.' }
  }
  if (team.status !== 'pending_p2' && team.status !== 'complete') {
    return { success: false, error: 'Your team cannot be renamed at this time.' }
  }
  if (team.team_name_renamed_at) {
    return {
      success: false,
      error:
        'You have already used your one-time team rename. Contact support if you need further changes.',
    }
  }
  if (newNameTrimmed === team.team_name) {
    return { success: false, error: 'Choose a different name than your current team name.' }
  }

  const { data: nameDup } = await admin
    .from('teams')
    .select('id')
    .eq('team_name', newNameTrimmed)
    .neq('id', team.id)
    .maybeSingle()
  if (nameDup) {
    return { success: false, error: 'That team name is already taken.' }
  }

  const previousName = team.team_name
  const p2Addr = team.p2_invited_email?.trim()
  const pendingWithP2 = team.status === 'pending_p2' && Boolean(p2Addr)

  const renamedAt = new Date().toISOString()
  let invitationToken: string | null = null
  let expiresAtIso: string | null = null

  if (pendingWithP2) {
    invitationToken = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)
    expiresAtIso = expiresAt.toISOString()
  }

  const updatePayload: Record<string, string> = {
    team_name: newNameTrimmed,
    team_name_renamed_at: renamedAt,
  }
  if (pendingWithP2 && invitationToken && expiresAtIso) {
    updatePayload.invitation_token = invitationToken
    updatePayload.invitation_expires_at = expiresAtIso
  }

  const { error: renameErr } = await admin.from('teams').update(updatePayload).eq('id', team.id)

  if (renameErr) {
    return { success: false, error: renameErr.message ?? 'Failed to rename team.' }
  }

  if (pendingWithP2 && p2Addr && invitationToken && expiresAtIso) {
    const { data: p1Row } = await admin
      .from('participants')
      .select('name, school_name')
      .eq('team_id', team.id)
      .eq('is_participant1', true)
      .single()

    const invitationLink = `${getSiteUrl()}/register/invite/${invitationToken}`
    const expiresAtFormatted = new Date(expiresAtIso).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    void fetch(`${getSiteUrl()}/api/send-team-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p2Email: p2Addr,
        p1Name: p1Row?.name ?? 'Your teammate',
        teamName: newNameTrimmed,
        schoolName: p1Row?.school_name ?? '',
        invitationLink,
        expiresAt: expiresAtFormatted,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok && !(body as { skipped?: boolean }).skipped) {
          console.error('Send invitation after team rename failed', res.status, body)
        }
      })
      .catch((e) => {
        console.error('Send invitation after team rename error', e)
      })
  } else if (team.status === 'complete') {
    const { data: p2Row } = await admin
      .from('participants')
      .select('email, name')
      .eq('team_id', team.id)
      .eq('is_participant1', false)
      .maybeSingle()

    const p2Email = p2Row?.email?.trim()
    if (!p2Email) {
      console.warn('renameTeamNameOnce: complete team has no P2 email; skipping notice')
      return { success: true }
    }

    const { data: p1Row } = await admin
      .from('participants')
      .select('name')
      .eq('team_id', team.id)
      .eq('is_participant1', true)
      .single()

    const { subject, html, text } = buildTeamNameChangedP2Email({
      p2Name: p2Row?.name ?? 'there',
      p1Name: p1Row?.name ?? 'Your teammate',
      previousTeamName: previousName,
      newTeamName: newNameTrimmed,
    })

    void sendEmail(
      { to: p2Email, subject, html, text },
      {
        emailType: SENT_EMAIL_TYPES.TEAM_NAME_CHANGED_P2,
        metadata: { team_id: team.id, previous_team_name: previousName, new_team_name: newNameTrimmed },
      },
    ).then((r) => {
      if (!r.success) {
        console.error('Team name changed email to P2 failed:', r.error)
      }
    })
  }

  return { success: true }
}
