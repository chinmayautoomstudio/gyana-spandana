'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { TEAM_NAME_MAX_LENGTH, TeamRegistrationFormData } from '@/lib/validations'
import { notifyAllAdmins } from '@/app/actions/notification'

/** Team code: GS- + first 8 chars of UUID (e.g. GS-A7F2K9M4). Same format as team.ts. */
function generateShortTeamCode(): string {
    return 'GS-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

export async function registerTeam(
    data: TeamRegistrationFormData,
    p1UserId: string,
    p2UserId: string
) {
    const supabase = createAdminClient()

    try {
        const teamNameTrimmed = data.teamName.trim()
        if (teamNameTrimmed.length < 2 || teamNameTrimmed.length > TEAM_NAME_MAX_LENGTH) {
            return {
                success: false,
                error: `Team name must be between 2 and ${TEAM_NAME_MAX_LENGTH} characters.`,
            }
        }

        // 1. Update passwords for both users
        // We use the admin client to update the user's password without needing their old password
        const { error: p1Error } = await supabase.auth.admin.updateUserById(p1UserId, {
            password: data.participant1.password,
            user_metadata: { name: data.participant1.name }
        })
        if (p1Error) throw new Error(`Participant 1 Error: ${p1Error.message}`)

        const { error: p2Error } = await supabase.auth.admin.updateUserById(p2UserId, {
            password: data.participant2.password,
            user_metadata: { name: data.participant2.name }
        })
        if (p2Error) throw new Error(`Participant 2 Error: ${p2Error.message}`)

        // 2. Generate Team Code (GS- + short UUID)
        const teamCode = generateShortTeamCode()

        // 3. Create Team
        // Check if team name exists
        const { data: existingTeam } = await supabase
            .from('teams')
            .select('id')
            .eq('team_name', teamNameTrimmed)
            .single()

        if (existingTeam) {
            return { success: false, error: 'Team name already exists.' }
        }

        const authorityName = data.schoolAuthority?.name?.trim() || null
        const authorityEmail = data.schoolAuthority?.email?.trim() || null
        const authorityPhone = data.schoolAuthority?.phone?.trim() || null

        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                team_name: teamNameTrimmed,
                team_code: teamCode,
                authority_name: authorityName,
                authority_email: authorityEmail,
                authority_phone: authorityPhone
            })
            .select()
            .single()

        if (teamError || !team) {
            throw new Error(teamError?.message || 'Failed to create team')
        }

        // 4. Create Participants
        const participants = [
            {
                ...data.participant1,
                userId: p1UserId,
                isParticipant1: true,
            },
            {
                ...data.participant2,
                userId: p2UserId,
                isParticipant1: false,
            },
        ]

        const participantIds: string[] = []
        for (const p of participants) {
            const { data: inserted, error: participantError } = await supabase
                .from('participants')
                .insert({
                    user_id: p.userId,
                    team_id: team.id,
                    name: p.name,
                    gender: p.gender,
                    email: p.email.trim().toLowerCase(),
                    phone: p.phone,
                    school_name: data.schoolName,
                    aadhar: p.aadhar,
                    class: p.class,
                    is_participant1: p.isParticipant1,
                    email_verified: true, // They verified via OTP
                    phone_verified: false,
                })
                .select('id')
                .single()

            if (participantError || !inserted?.id) {
                throw new Error(`Failed to create participant record: ${participantError?.message || 'No id returned'}`)
            }
            participantIds.push(inserted.id)

            // Create user profile with 'participant' role
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: p.userId,
                    role: 'participant',
                    name: p.name,
                })

            // If profile already exists, update it (shouldn't happen, but handle gracefully)
            if (profileError && profileError.code !== '23505') { // 23505 is unique violation
                console.warn(`Failed to create user profile for ${p.userId}:`, profileError.message)
                // Don't throw - profile creation is not critical for registration
            }
        }

        // Send email notification to school authority only when both email and name were provided (non-blocking)
        if (authorityEmail && authorityName) {
            try {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

                await fetch(`${siteUrl}/api/send-authority-notification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        authorityEmail,
                        authorityName,
                        teamName: teamNameTrimmed,
                        teamCode: teamCode,
                        participant1Name: data.participant1.name,
                        participant1School: data.schoolName,
                        participant2Name: data.participant2.name,
                        participant2School: data.schoolName,
                    }),
                })
            } catch (emailError) {
                // Log error but don't fail registration
                console.error('Failed to send authority notification email:', emailError)
            }
        }

        // Send confirmation emails to both participants (non-blocking)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        const registrationDate = new Date().toISOString()
        const apiUrl = `${siteUrl}/api/send-registration-confirmation`

        const sendOne = async (
            payload: { participantEmail: string; participantName: string; participantSchool: string; teammateName: string; teammateSchool: string; teamName: string; teamCode: string; registrationDate: string; participantId?: string }
        ) => {
            try {
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                const body = await res.json().catch(() => ({}))
                if (!res.ok) {
                    console.error('Registration email failed for', payload.participantEmail, res.status, body)
                    return
                }
                if (body.skipped) {
                    console.warn('Registration email skipped (SendGrid not configured) for', payload.participantEmail)
                }
            } catch (err) {
                console.error('Failed to send participant confirmation email:', err)
            }
        }

        await sendOne({
            participantEmail: data.participant1.email,
            participantName: data.participant1.name,
            participantSchool: data.schoolName,
            teammateName: data.participant2.name,
            teammateSchool: data.schoolName,
            teamName: teamNameTrimmed,
            teamCode: teamCode,
            registrationDate,
            participantId: participantIds[0],
        })
        await sendOne({
            participantEmail: data.participant2.email,
            participantName: data.participant2.name,
            participantSchool: data.schoolName,
            teammateName: data.participant1.name,
            teammateSchool: data.schoolName,
            teamName: teamNameTrimmed,
            teamCode: teamCode,
            registrationDate,
            participantId: participantIds[1],
        })

        // Notify admins about new team registration (non-blocking)
        try {
            await notifyAllAdmins(
                'New Team Registered',
                `Team "${teamNameTrimmed}" has registered with code ${teamCode}.`,
                'success',
                '/admin/teams'
            )
        } catch (error) {
            console.error('Failed to notify admins of new team:', error)
        }

        return { success: true, teamCode: teamCode }
    } catch (error: any) {
        console.error('Registration Error:', error)
        return { success: false, error: error.message }
    }
}
