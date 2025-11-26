'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { TeamRegistrationFormData } from '@/lib/validations'

export async function registerTeam(
    data: TeamRegistrationFormData,
    p1UserId: string,
    p2UserId: string
) {
    const supabase = createAdminClient()

    try {
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

        // 2. Create Team
        // Check if team name exists
        const { data: existingTeam } = await supabase
            .from('teams')
            .select('id')
            .eq('team_name', data.teamName)
            .single()

        if (existingTeam) {
            return { success: false, error: 'Team name already exists.' }
        }

        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({ team_name: data.teamName })
            .select()
            .single()

        if (teamError || !team) {
            throw new Error(teamError?.message || 'Failed to create team')
        }

        // 3. Create Participants
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

        for (const p of participants) {
            const { error: participantError } = await supabase
                .from('participants')
                .insert({
                    user_id: p.userId,
                    team_id: team.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                    school_name: p.schoolName,
                    aadhar: p.aadhar,
                    is_participant1: p.isParticipant1,
                    email_verified: true, // They verified via OTP
                    phone_verified: false,
                })

            if (participantError) {
                throw new Error(`Failed to create participant record: ${participantError.message}`)
            }
        }

        return { success: true }
    } catch (error: any) {
        console.error('Registration Error:', error)
        return { success: false, error: error.message }
    }
}
