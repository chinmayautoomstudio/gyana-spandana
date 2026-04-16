-- Add rapid-fire session tracking and buzzer event tracking.

CREATE TABLE IF NOT EXISTS quiz_rapid_fire_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id UUID REFERENCES quiz_question_events(id) ON DELETE SET NULL,
  team_label VARCHAR(1) NOT NULL CHECK (team_label IN ('A', 'B', 'C', 'D')),
  started_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  ended_at TIMESTAMPTZ,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  score_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_buzz_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id UUID NOT NULL REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label VARCHAR(1) NOT NULL CHECK (team_label IN ('A', 'B', 'C', 'D')),
  buzzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  buzz_order INTEGER,
  selected_answer VARCHAR(10),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_event_id, team_label)
);

CREATE INDEX IF NOT EXISTS idx_quiz_rapid_fire_sessions_question_event
  ON quiz_rapid_fire_sessions(question_event_id);

CREATE INDEX IF NOT EXISTS idx_quiz_buzz_events_question_time
  ON quiz_buzz_events(question_event_id, buzzed_at);

ALTER TABLE quiz_rapid_fire_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_buzz_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_rapid_fire_sessions_read" ON quiz_rapid_fire_sessions;
CREATE POLICY "quiz_rapid_fire_sessions_read"
  ON quiz_rapid_fire_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_rapid_fire_sessions_admin_host_write" ON quiz_rapid_fire_sessions;
CREATE POLICY "quiz_rapid_fire_sessions_admin_host_write"
  ON quiz_rapid_fire_sessions FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_rapid_fire_sessions.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_rapid_fire_sessions.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_buzz_events_read" ON quiz_buzz_events;
CREATE POLICY "quiz_buzz_events_read"
  ON quiz_buzz_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_buzz_events_insert_authenticated" ON quiz_buzz_events;
CREATE POLICY "quiz_buzz_events_insert_authenticated"
  ON quiz_buzz_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "quiz_buzz_events_admin_host_update" ON quiz_buzz_events;
CREATE POLICY "quiz_buzz_events_admin_host_update"
  ON quiz_buzz_events FOR UPDATE
  USING (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_buzz_events.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_buzz_events.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_buzz_events_admin_host_delete" ON quiz_buzz_events;
CREATE POLICY "quiz_buzz_events_admin_host_delete"
  ON quiz_buzz_events FOR DELETE
  USING (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_buzz_events.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quiz_rapid_fire_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rapid_fire_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quiz_buzz_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_buzz_events;
  END IF;
END $$;
