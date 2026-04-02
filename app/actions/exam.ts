'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AvailableExam {
    id: string
    title: string
    description: string | null
    duration_minutes: number
    total_questions: number
    scheduled_start: string | null
    scheduled_end: string | null
    status: string
}

/**
 * @param verifiedParticipantId - When provided, skips a separate participant lookup after auth
 *   (caller must have loaded this id for the same user). Server still verifies id belongs to the session user.
 */
export async function getAvailableExams(verifiedParticipantId?: string): Promise<AvailableExam[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    let participantId: string

    if (verifiedParticipantId) {
        const { data: row, error } = await supabase
            .from('participants')
            .select('id')
            .eq('id', verifiedParticipantId)
            .eq('user_id', user.id)
            .single()

        if (error || !row) {
            return []
        }
        participantId = row.id
    } else {
        const { data: participant } = await supabase
            .from('participants')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!participant) {
            return []
        }
        participantId = participant.id
    }

    const supabaseAdmin = createAdminClient()

    // 1. Fetch available exams (active or scheduled)
    const { data: exams, error: examsError } = await supabaseAdmin
        .from('exams')
        .select('id, title, description, duration_minutes, total_questions, scheduled_start, scheduled_end, status')
        .in('status', ['scheduled', 'active'])
        .order('scheduled_start', { ascending: true })

    if (examsError || !exams) {
        console.error('Error fetching exams:', examsError)
        return []
    }

    // 2. Fetch assignments for this participant
    const { data: myAssignments } = await supabaseAdmin
        .from('exam_participants')
        .select('exam_id')
        .eq('participant_id', participantId)

    const myExamIds = new Set((myAssignments || []).map(a => a.exam_id))

    // 3. Check which exams have ANY assignments (to distinguish public vs private)
    // We can't easily do a "count group by" efficiently in one query with PostgREST without a view,
    // so we'll fetch all assignments for these exams.
    // Optimization: If the number of exams/participants is huge, this might need a dedicated RPC or View.
    // For now, fetching exam_ids from exam_participants where exam_id IN (exams) is okay.

    const examIds = exams.map(e => e.id)

    // Use a raw query or just select distinct exam_ids if possible, but standard select is safer
    const { data: allAssignments } = await supabaseAdmin
        .from('exam_participants')
        .select('exam_id')
        .in('exam_id', examIds)

    const restrictedExamIds = new Set((allAssignments || []).map(a => a.exam_id))

    // 4. Filter exams
    const availableExams = exams.filter(exam => {
        // If exam has assignments (restricted), only show if I am assigned
        if (restrictedExamIds.has(exam.id)) {
            return myExamIds.has(exam.id)
        }
        // If exam has NO assignments, it's public -> show to everyone
        return true
    }).filter(exam => (exam.total_questions ?? 0) > 0) // Ensure exam has questions

    return availableExams
}
