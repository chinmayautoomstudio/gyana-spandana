-- Allow participants to finish an attempt: UPDATE must satisfy RLS for the NEW row.
-- Without WITH CHECK, PostgreSQL uses USING for both old and new rows, so setting
-- status to 'submitted' failed (new row no longer matches status = 'in_progress').

DROP POLICY IF EXISTS "Participants can update own attempts" ON exam_attempts;

CREATE POLICY "Participants can update own attempts"
  ON exam_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
        AND participants.user_id = auth.uid()
        AND (
          exam_attempts.status = 'in_progress'
          OR exam_attempts.status = 'submitted'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
        AND participants.user_id = auth.uid()
        AND (
          exam_attempts.status = 'in_progress'
          OR exam_attempts.status = 'submitted'
        )
    )
  );
