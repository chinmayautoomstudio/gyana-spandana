-- Gyana Spardha — live quiz session tables + RLS (see docs/markdown/GYANA-SPARDHA-QUIZ-ROUNDS-IMPLEMENTATION-PLAN.md)
-- Run in Supabase SQL editor after reviewing policies for your security model.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- quiz_live_sessions
CREATE TABLE IF NOT EXISTS quiz_live_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(255) NOT NULL,
  status              VARCHAR(20) DEFAULT 'setup'
                        CHECK (status IN ('setup','lobby','active','paused','completed')),
  team_slots          JSONB NOT NULL DEFAULT '{}',
  current_round_id    UUID,
  assigned_host_id    UUID REFERENCES auth.users(id),
  points_full         INTEGER DEFAULT 10,
  points_half         INTEGER DEFAULT 5,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_rounds
CREATE TABLE IF NOT EXISTS quiz_rounds (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                 UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  round_order                INTEGER NOT NULL,
  round_type                 VARCHAR(30) NOT NULL
                               CHECK (round_type IN (
                                 'direct_question','rapid_fire',
                                 'true_or_false','buzzer','visual'
                               )),
  title                      VARCHAR(255),
  question_set_id            UUID,
  rapid_fire_duration_seconds INTEGER DEFAULT 45,
  true_false_mode            VARCHAR(20) DEFAULT 'directed'
                               CHECK (true_false_mode IN ('directed','buzzer')),
  status                     VARCHAR(20) DEFAULT 'pending'
                               CHECK (status IN ('pending','active','completed')),
  current_question_index     INTEGER DEFAULT 0,
  created_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id            UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  source_question_id  UUID REFERENCES questions(id),
  question_text       TEXT NOT NULL,
  question_type       VARCHAR(30) DEFAULT 'mcq'
                        CHECK (question_type IN ('mcq','true_false','visual_image','visual_video')),
  option_a            TEXT,
  option_b            TEXT,
  option_c            TEXT,
  option_d            TEXT,
  correct_answer      VARCHAR(10) NOT NULL,
  media_url           TEXT,
  question_order      INTEGER NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_question_events
CREATE TABLE IF NOT EXISTS quiz_question_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id              UUID REFERENCES quiz_rounds(id) ON DELETE CASCADE,
  question_id           UUID REFERENCES quiz_questions(id),
  status                VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','revealed','options_revealed',
                            'buzzer_open','answered','dropped'
                          )),
  directed_team         VARCHAR(1) CHECK (directed_team IN ('A','B','C','D')),
  attempt_number        INTEGER DEFAULT 1,
  rapid_fire_team       VARCHAR(1) CHECK (rapid_fire_team IN ('A','B','C','D')),
  answered_by_team      VARCHAR(1) CHECK (answered_by_team IN ('A','B','C','D')),
  points_awarded        INTEGER DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_pass_log
CREATE TABLE IF NOT EXISTS quiz_pass_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label            VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  attempt_number        INTEGER NOT NULL,
  passed_or_wrong       BOOLEAN NOT NULL,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quiz_buzz_events
CREATE TABLE IF NOT EXISTS quiz_buzz_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id) ON DELETE CASCADE,
  team_label            VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  buzzed_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  buzz_order            INTEGER,
  selected_answer       VARCHAR(10),
  is_correct            BOOLEAN,
  UNIQUE(question_event_id, team_label)
);

-- quiz_session_scores
CREATE TABLE IF NOT EXISTS quiz_session_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID REFERENCES quiz_live_sessions(id) ON DELETE CASCADE,
  team_label          VARCHAR(1) NOT NULL CHECK (team_label IN ('A','B','C','D')),
  team_id             UUID REFERENCES teams(id),
  total_score         INTEGER DEFAULT 0,
  questions_answered  INTEGER DEFAULT 0,
  questions_correct   INTEGER DEFAULT 0,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, team_label)
);

-- quiz_rapid_fire_sessions
CREATE TABLE IF NOT EXISTS quiz_rapid_fire_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_event_id     UUID REFERENCES quiz_question_events(id),
  team_label            VARCHAR(1) NOT NULL,
  started_at            TIMESTAMP WITH TIME ZONE,
  duration_seconds      INTEGER NOT NULL,
  ended_at              TIMESTAMP WITH TIME ZONE,
  questions_attempted   INTEGER DEFAULT 0,
  questions_correct     INTEGER DEFAULT 0,
  score_earned          INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_rounds_session         ON quiz_rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_round        ON quiz_questions(round_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_events_round  ON quiz_question_events(round_id);
CREATE INDEX IF NOT EXISTS idx_quiz_buzz_events_question   ON quiz_buzz_events(question_event_id, buzzed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_session_scores_session ON quiz_session_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_host     ON quiz_live_sessions(assigned_host_id);
CREATE INDEX IF NOT EXISTS idx_quiz_live_sessions_status   ON quiz_live_sessions(status);

-- Enable RLS
ALTER TABLE quiz_live_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_rounds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_pass_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_buzz_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_session_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_rapid_fire_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access
CREATE POLICY "Admin full access quiz_live_sessions"
  ON quiz_live_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- RLS: Host access to their assigned sessions
CREATE POLICY "Host access quiz_live_sessions"
  ON quiz_live_sessions FOR ALL
  USING (
    assigned_host_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS: Public read on scores (display board, public leaderboard)
CREATE POLICY "Public read quiz_session_scores"
  ON quiz_session_scores FOR SELECT USING (true);

-- RLS: Public read on question events (display board knows current state)
CREATE POLICY "Public read quiz_question_events"
  ON quiz_question_events FOR SELECT USING (true);

-- RLS: Public read on rounds and questions
CREATE POLICY "Public read quiz_rounds"
  ON quiz_rounds FOR SELECT USING (true);

CREATE POLICY "Public read quiz_questions"
  ON quiz_questions FOR SELECT USING (true);

-- RLS: Host and admin write quiz data
CREATE POLICY "Host admin write quiz_rounds"
  ON quiz_rounds FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

CREATE POLICY "Host admin write quiz_question_events"
  ON quiz_question_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

CREATE POLICY "Host admin write quiz_session_scores"
  ON quiz_session_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin','host')
  ));

-- RLS: Authenticated users can insert buzz events
CREATE POLICY "Authenticated insert quiz_buzz_events"
  ON quiz_buzz_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read quiz_buzz_events"
  ON quiz_buzz_events FOR SELECT USING (true);
