-- Allow participants to update their own pending text answer before the host judges.

DROP POLICY IF EXISTS "quiz_direct_attempts_participant_update_own" ON public.quiz_direct_attempts;
CREATE POLICY "quiz_direct_attempts_participant_update_own"
  ON public.quiz_direct_attempts FOR UPDATE
  TO authenticated
  USING (
    verdict = 'pending'
    AND EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_live_sessions s ON s.id = quiz_direct_attempts.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND qe.directed_team = quiz_direct_attempts.team_label
        AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
    )
  )
  WITH CHECK (
    verdict = 'pending'
    AND EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_live_sessions s ON s.id = quiz_direct_attempts.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND qe.directed_team = quiz_direct_attempts.team_label
        AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
    )
  );
