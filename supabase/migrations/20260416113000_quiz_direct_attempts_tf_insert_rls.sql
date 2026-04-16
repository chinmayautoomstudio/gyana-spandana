-- Allow participant INSERT into quiz_direct_attempts for true/false rounds.
-- Keep existing directed-team and session/team mapping checks intact.

DROP POLICY IF EXISTS "quiz_direct_attempts_participant_insert" ON public.quiz_direct_attempts;

CREATE POLICY "quiz_direct_attempts_participant_insert"
  ON public.quiz_direct_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_rounds r ON r.id = qe.round_id
      JOIN quiz_live_sessions s ON s.id = r.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND (
          (r.round_type = 'direct_question' AND qe.status = 'revealed')
          OR (r.round_type = 'true_or_false' AND qe.status = 'options_revealed')
        )
        AND qe.directed_team = quiz_direct_attempts.team_label
        AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
        AND quiz_direct_attempts.session_id = s.id
        AND quiz_direct_attempts.verdict = 'pending'
    )
  );
