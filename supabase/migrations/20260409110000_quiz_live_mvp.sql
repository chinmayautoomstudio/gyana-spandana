-- Quiz Live MVP schema + RLS baseline (direct question round first)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS quiz_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'setup'
    CHECK (status IN ('setup', 'lobby', 'active', 'paused', 'completed')),
  team_slots JSONB NOT NULL DEFAULT '{}',
  current_round_id UUID,
  assigned_host_id UUID REFERENCES auth.users(id),
  points_full INTEGER NOT NULL DEFAULT 10,
  points_half INTEGER NOT NULL DEFAULT 5,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  round_order INTEGER NOT NULL,
  round_type VARCHAR(30) NOT NULL
    CHECK (round_type IN ('direct_question', 'rapid_fire', 'true_or_false', 'buzzer', 'visual')),
  title VARCHAR(255),
  question_set_id UUID REFERENCES question_sets(id),
  rapid_fire_duration_seconds INTEGER DEFAULT 45,
  true_false_mode VARCHAR(20) DEFAULT 'directed'
    CHECK (true_false_mode IN ('directed', 'buzzer')),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed')),
  current_question_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES questions(id),
  question_text TEXT NOT NULL,
  question_type VARCHAR(30) DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'true_false', 'visual_image', 'visual_video')),
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer VARCHAR(10) NOT NULL,
  media_url TEXT,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_question_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'revealed', 'options_revealed', 'buzzer_open', 'answered', 'dropped')),
  directed_team VARCHAR(1) CHECK (directed_team IN ('A', 'B', 'C', 'D')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  rapid_fire_team VARCHAR(1) CHECK (rapid_fire_team IN ('A', 'B', 'C', 'D')),
  answered_by_team VARCHAR(1) CHECK (answered_by_team IN ('A', 'B', 'C', 'D')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_pass_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id UUID NOT NULL REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label VARCHAR(1) NOT NULL CHECK (team_label IN ('A', 'B', 'C', 'D')),
  attempt_number INTEGER NOT NULL,
  passed_or_wrong BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_session_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  team_label VARCHAR(1) NOT NULL CHECK (team_label IN ('A', 'B', 'C', 'D')),
  team_id UUID REFERENCES teams(id),
  total_score INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, team_label)
);

CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_status ON quiz_live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_host ON quiz_live_sessions(assigned_host_id);
CREATE INDEX IF NOT EXISTS idx_quiz_rounds_session_order ON quiz_rounds(session_id, round_order);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_round_order ON quiz_questions(round_id, question_order);
CREATE INDEX IF NOT EXISTS idx_quiz_question_events_round_created ON quiz_question_events(round_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_pass_log_event_attempt ON quiz_pass_log(question_event_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_quiz_session_scores_session ON quiz_session_scores(session_id);

ALTER TABLE quiz_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_pass_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_live_sessions_admin_all" ON quiz_live_sessions;
CREATE POLICY "quiz_live_sessions_admin_all"
  ON quiz_live_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "quiz_live_sessions_host_rw" ON quiz_live_sessions;
CREATE POLICY "quiz_live_sessions_host_rw"
  ON quiz_live_sessions FOR ALL
  USING (assigned_host_id = auth.uid())
  WITH CHECK (assigned_host_id = auth.uid());

DROP POLICY IF EXISTS "quiz_rounds_read" ON quiz_rounds;
CREATE POLICY "quiz_rounds_read"
  ON quiz_rounds FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_questions_read" ON quiz_questions;
CREATE POLICY "quiz_questions_read"
  ON quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_question_events_read" ON quiz_question_events;
CREATE POLICY "quiz_question_events_read"
  ON quiz_question_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_session_scores_read" ON quiz_session_scores;
CREATE POLICY "quiz_session_scores_read"
  ON quiz_session_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_rounds_admin_host_write" ON quiz_rounds;
CREATE POLICY "quiz_rounds_admin_host_write"
  ON quiz_rounds FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_live_sessions s
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE s.id = quiz_rounds.session_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_live_sessions s
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE s.id = quiz_rounds.session_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_questions_admin_host_write" ON quiz_questions;
CREATE POLICY "quiz_questions_admin_host_write"
  ON quiz_questions FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_rounds r
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.id = quiz_questions.round_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_rounds r
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.id = quiz_questions.round_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_question_events_admin_host_write" ON quiz_question_events;
CREATE POLICY "quiz_question_events_admin_host_write"
  ON quiz_question_events FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_rounds r
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.id = quiz_question_events.round_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_rounds r
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE r.id = quiz_question_events.round_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_pass_log_admin_host_write" ON quiz_pass_log;
CREATE POLICY "quiz_pass_log_admin_host_write"
  ON quiz_pass_log FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_pass_log.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_question_events qe
    JOIN quiz_rounds r ON r.id = qe.round_id
    JOIN quiz_live_sessions s ON s.id = r.session_id
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE qe.id = quiz_pass_log.question_event_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

DROP POLICY IF EXISTS "quiz_session_scores_admin_host_write" ON quiz_session_scores;
CREATE POLICY "quiz_session_scores_admin_host_write"
  ON quiz_session_scores FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM quiz_live_sessions s
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE s.id = quiz_session_scores.session_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM quiz_live_sessions s
    LEFT JOIN user_profiles up ON up.user_id = auth.uid()
    WHERE s.id = quiz_session_scores.session_id
      AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
  ));

