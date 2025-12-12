-- Gyana Spandana Exam System Database Schema
-- This file contains the SQL schema for exam management tables
-- Run this in your Supabase SQL Editor AFTER running the base database-schema.sql

-- Exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  total_questions INTEGER DEFAULT 0,
  passing_score INTEGER,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer VARCHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points INTEGER DEFAULT 1,
  explanation TEXT,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam attempts table (replaces quiz_sessions for exam system)
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER,
  correct_answers INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'timeout')),
  time_taken_minutes INTEGER,
  UNIQUE(exam_id, participant_id) -- Prevent multiple attempts per exam per participant
);

-- Exam answers table (replaces quiz_answers for exam system)
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer VARCHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id) -- One answer per question per attempt
);

-- Team scores table for leaderboard
CREATE TABLE IF NOT EXISTS team_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  participant1_score INTEGER DEFAULT 0,
  participant2_score INTEGER DEFAULT 0,
  total_team_score INTEGER DEFAULT 0,
  rank INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, team_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_start ON exams(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_order_index ON questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_participant_id ON exam_attempts(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_team_scores_exam_id ON team_scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_team_scores_team_id ON team_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_team_scores_total_score ON team_scores(exam_id, total_team_score DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can do everything with exams
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can view scheduled/active exams
CREATE POLICY "Participants can view scheduled exams"
  ON exams FOR SELECT
  USING (
    status IN ('scheduled', 'active')
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Admins can manage questions
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can view questions for scheduled/active exams
CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can create their own exam attempts
CREATE POLICY "Participants can create own exam attempts"
  ON exam_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- RLS Policy: Participants can view their own exam attempts
CREATE POLICY "Participants can view own exam attempts"
  ON exam_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
      AND participants.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can update their own in-progress attempts
CREATE POLICY "Participants can update own attempts"
  ON exam_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
      AND participants.user_id = auth.uid()
      AND exam_attempts.status = 'in_progress'
    )
  );

-- RLS Policy: Participants can create answers for their own attempts
CREATE POLICY "Participants can create own exam answers"
  ON exam_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_attempts
      JOIN participants ON participants.id = exam_attempts.participant_id
      WHERE exam_attempts.id = exam_answers.attempt_id
      AND participants.user_id = auth.uid()
      AND exam_attempts.status = 'in_progress'
    )
  );

-- RLS Policy: Participants can view their own exam answers
CREATE POLICY "Participants can view own exam answers"
  ON exam_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts
      JOIN participants ON participants.id = exam_attempts.participant_id
      WHERE exam_attempts.id = exam_answers.attempt_id
      AND participants.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can update their own answers (only if attempt is in progress)
CREATE POLICY "Participants can update own exam answers"
  ON exam_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts
      JOIN participants ON participants.id = exam_attempts.participant_id
      WHERE exam_attempts.id = exam_answers.attempt_id
      AND participants.user_id = auth.uid()
      AND exam_attempts.status = 'in_progress'
    )
  );

-- RLS Policy: Only admins can view team scores (leaderboard)
CREATE POLICY "Only admins can view team scores"
  ON team_scores FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- Function to calculate team scores
CREATE OR REPLACE FUNCTION calculate_team_scores(exam_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Delete existing scores for this exam
  DELETE FROM team_scores WHERE exam_id = exam_uuid;
  
  -- Insert calculated team scores
  INSERT INTO team_scores (exam_id, team_id, participant1_score, participant2_score, total_team_score)
  SELECT 
    exam_uuid,
    t.id as team_id,
    COALESCE(p1_scores.score, 0) as participant1_score,
    COALESCE(p2_scores.score, 0) as participant2_score,
    COALESCE(p1_scores.score, 0) + COALESCE(p2_scores.score, 0) as total_team_score
  FROM teams t
  LEFT JOIN (
    SELECT 
      p.team_id,
      ea.score
    FROM participants p
    JOIN exam_attempts ea ON ea.participant_id = p.id
    WHERE p.is_participant1 = true
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  ) p1_scores ON p1_scores.team_id = t.id
  LEFT JOIN (
    SELECT 
      p.team_id,
      ea.score
    FROM participants p
    JOIN exam_attempts ea ON ea.participant_id = p.id
    WHERE p.is_participant1 = false
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  ) p2_scores ON p2_scores.team_id = t.id
  WHERE EXISTS (
    SELECT 1 FROM exam_attempts ea
    JOIN participants p ON p.id = ea.participant_id
    WHERE p.team_id = t.id
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  );
  
  -- Update ranks
  UPDATE team_scores ts
  SET rank = subq.rank
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_team_score DESC, last_updated ASC) as rank
    FROM team_scores
    WHERE exam_id = exam_uuid
  ) subq
  WHERE ts.id = subq.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update team scores when exam attempt is submitted
CREATE OR REPLACE FUNCTION update_team_scores_on_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    PERFORM calculate_team_scores(NEW.exam_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_scores
  AFTER UPDATE ON exam_attempts
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' AND OLD.status != 'submitted')
  EXECUTE FUNCTION update_team_scores_on_submit();

-- Function to update updated_at timestamp
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update total_questions count in exams table
CREATE OR REPLACE FUNCTION update_exam_question_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exams
  SET total_questions = (
    SELECT COUNT(*) FROM questions WHERE exam_id = NEW.exam_id
  )
  WHERE id = NEW.exam_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_question_count
  AFTER INSERT OR DELETE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_question_count();

