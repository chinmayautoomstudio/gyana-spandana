/**
 * Check if scheduled exams should be activated or completed
 * Call this periodically or on page load
 */
export async function updateExamStatuses(supabase: any) {
  const now = new Date().toISOString()

  // Activate scheduled exams whose start time has passed
  // Only activate if end time hasn't passed (or doesn't exist)
  const { error: activateError } = await supabase
    .from('exams')
    .update({ status: 'active' })
    .eq('status', 'scheduled')
    .lte('scheduled_start', now)
    .or(`scheduled_end.is.null,scheduled_end.gt.${now}`)

  if (activateError) {
    console.error('Error activating scheduled exams:', activateError)
    return { success: false, error: activateError }
  }

  // Mark as completed exams whose end time has passed
  const { error: completeError } = await supabase
    .from('exams')
    .update({ status: 'completed' })
    .in('status', ['active', 'scheduled'])
    .not('scheduled_end', 'is', null)
    .lte('scheduled_end', now)

  if (completeError) {
    console.error('Error completing exams:', completeError)
    return { success: false, error: completeError }
  }

  return { success: true }
}
