-- Direct-question adjudication: text answers + optional public reveal of correct answer.

ALTER TABLE public.quiz_question_events
  ADD COLUMN IF NOT EXISTS correct_answer_revealed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quiz_question_events.correct_answer_revealed_at IS
  'When set, clients may show the official correct answer (e.g. after all teams failed).';

CREATE TABLE IF NOT EXISTS public.quiz_direct_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  question_event_id UUID NOT NULL REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label VARCHAR(1) NOT NULL CHECK (team_label IN ('A', 'B', 'C', 'D')),
  answer_text TEXT NOT NULL DEFAULT '',
  verdict VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verdict IN ('pending', 'wrong', 'correct')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_event_id, team_label)
);

CREATE INDEX IF NOT EXISTS idx_quiz_direct_attempts_session
  ON public.quiz_direct_attempts (session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_direct_attempts_event
  ON public.quiz_direct_attempts (question_event_id);

ALTER TABLE public.quiz_direct_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_direct_attempts_read" ON public.quiz_direct_attempts;
CREATE POLICY "quiz_direct_attempts_read"
  ON public.quiz_direct_attempts FOR SELECT
  USING (true);

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
        AND r.round_type = 'direct_question'
        AND qe.status = 'revealed'
        AND qe.directed_team = quiz_direct_attempts.team_label
        AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
        AND quiz_direct_attempts.session_id = s.id
        AND quiz_direct_attempts.verdict = 'pending'
    )
  );

DROP POLICY IF EXISTS "quiz_direct_attempts_host_update" ON public.quiz_direct_attempts;
CREATE POLICY "quiz_direct_attempts_host_update"
  ON public.quiz_direct_attempts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM quiz_live_sessions s
      LEFT JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE s.id = quiz_direct_attempts.session_id
        AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quiz_live_sessions s
      LEFT JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE s.id = quiz_direct_attempts.session_id
        AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quiz_question_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_question_events;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quiz_direct_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_direct_attempts;
  END IF;
END $$;
