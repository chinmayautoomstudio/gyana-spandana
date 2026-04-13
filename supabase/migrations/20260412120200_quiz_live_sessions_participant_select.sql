-- Allow authenticated participants to read live quiz sessions where their team is in a slot (A–D).

DROP POLICY IF EXISTS "quiz_live_sessions_participant_read" ON public.quiz_live_sessions;
CREATE POLICY "quiz_live_sessions_participant_read"
  ON public.quiz_live_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.participants p
      WHERE p.user_id = auth.uid()
        AND p.team_id IS NOT NULL
        AND (
          (quiz_live_sessions.team_slots ->> 'A') = p.team_id::text
          OR (quiz_live_sessions.team_slots ->> 'B') = p.team_id::text
          OR (quiz_live_sessions.team_slots ->> 'C') = p.team_id::text
          OR (quiz_live_sessions.team_slots ->> 'D') = p.team_id::text
        )
    )
  );
