'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { TeamRegistrationFormData } from '@/lib/validations'

/**
 * Generate initials from a name (max 2-3 letters)
 * Example: "John Doe" -> "JD", "Mary Jane Watson" -> "MJ"
 */
function generateInitials(name: string): string {
    const words = name.trim().split(/\s+/)
    if (words.length === 0) return 'XX'
    
    // Take first letter of first word
    let initials = words[0].charAt(0).toUpperCase()
    
    // Take first letter of second word if exists
    if (words.length > 1) {
        initials += words[1].charAt(0).toUpperCase()
    } else {
        // If only one word, take second character if available
        initials += words[0].length > 1 ? words[0].charAt(1).toUpperCase() : 'X'
    }
    
    return initials
}

/**
 * Generate unique team code in format: GS-P1INIT-P2INIT-XXXX
 */
async function generateTeamCode(
    supabase: ReturnType<typeof createAdminClient>,
    p1Name: string,
    p2Name: string
): Promise<string> {
    const p1Initials = generateInitials(p1Name)
    const p2Initials = generateInitials(p2Name)
    
    let sequential = 1
    let teamCode = `GS-${p1Initials}-${p2Initials}-${sequential.toString().padStart(4, '0')}`
    
    // Check if code exists and increment until we find a unique one
    while (true) {
        const { data: existing } = await supabase
            .from('teams')
            .select('id')
            .eq('team_code', teamCode)
            .single()
        
        if (!existing) {
            break // Code is unique
        }
        
        sequential++
        teamCode = `GS-${p1Initials}-${p2Initials}-${sequential.toString().padStart(4, '0')}`
        
        // Safety check to prevent infinite loop
        if (sequential > 9999) {
            // Fallback to timestamp-based code
            const timestamp = Date.now().toString().slice(-4)
            teamCode = `GS-${p1Initials}-${p2Initials}-${timestamp}`
            break
        }
    }
    
    return teamCode
}

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

        // 2. Generate Team Code
        const teamCode = await generateTeamCode(supabase, data.participant1.name, data.participant2.name)

        // 3. Create Team
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
            .insert({ 
                team_name: data.teamName,
                team_code: teamCode
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

        for (const p of participants) {
            const { error: participantError } = await supabase
                .from('participants')
                .insert({
                    user_id: p.userId,
                    team_id: team.id,
                    name: p.name,
                    gender: p.gender,
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

        return { success: true, teamCode: teamCode }
    } catch (error: any) {
        console.error('Registration Error:', error)
        return { success: false, error: error.message }
    }
}
