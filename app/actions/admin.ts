'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Verify if the current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false
  
  // Check user_profiles table first (primary source)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // Fallback to user_metadata if profile doesn't exist
  const role = profile?.role || user.user_metadata?.role || 'participant'
  return role === 'admin'
}

/**
 * Verify admin and redirect if not admin
 * Use this in server components or server actions
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await verifyAdmin()
  if (!isAdmin) {
    redirect('/dashboard')
  }
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats() {
  const supabase = await createClient()
  await requireAdmin()

  const [exams, participants, teams, attempts] = await Promise.all([
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_attempts').select('score, status', { count: 'exact' }),
  ])

  const submittedAttempts = attempts.data?.filter(a => a.status === 'submitted') || []
  const averageScore = submittedAttempts.length > 0
    ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
    : 0

  return {
    totalExams: exams.count || 0,
    totalParticipants: participants.count || 0,
    totalTeams: teams.count || 0,
    totalAttempts: attempts.count || 0,
    averageScore,
  }
}

/**
 * Get exam analytics
 */
export async function getExamAnalytics(examId: string) {
  const supabase = await createClient()
  await requireAdmin()

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('score, status, time_taken_minutes')
    .eq('exam_id', examId)

  const submittedAttempts = attempts?.filter(a => a.status === 'submitted') || []
  
  return {
    totalAttempts: attempts?.length || 0,
    submittedAttempts: submittedAttempts.length,
    averageScore: submittedAttempts.length > 0
      ? Math.round(submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length)
      : 0,
  }
}

/**
 * Check for schedule conflicts
 */
export async function checkScheduleConflicts(
  examId: string,
  startTime: string,
  endTime: string
) {
  const supabase = await createClient()
  await requireAdmin()

  const { data: conflicts } = await supabase
    .from('exams')
    .select('id, title, scheduled_start, scheduled_end')
    .neq('id', examId)
    .not('scheduled_start', 'is', null)
    .not('scheduled_end', 'is', null)
    .or(`and(scheduled_start.lte.${endTime},scheduled_end.gte.${startTime})`)

  return conflicts || []
}

