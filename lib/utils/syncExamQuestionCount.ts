import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Set exams.total_questions to the current count of questions for this exam.
 */
export async function syncExamTotalQuestions(
  supabase: SupabaseClient,
  examId: string
): Promise<{ error: Error | null }> {
  const { count, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('exam_id', examId)

  if (countError) {
    return { error: new Error(countError.message) }
  }

  const { error: updateError } = await supabase
    .from('exams')
    .update({ total_questions: count ?? 0 })
    .eq('id', examId)

  if (updateError) {
    return { error: new Error(updateError.message) }
  }

  return { error: null }
}
