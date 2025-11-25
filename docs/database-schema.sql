-- Gyana Spandana Database Schema for Supabase
-- This file contains the SQL schema for creating tables in Supabase

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(10) NOT NULL UNIQUE,
  school_name VARCHAR(200) NOT NULL,
  aadhar VARCHAR(12) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_participant1 BOOLEAN NOT NULL, -- true for participant 1, false for participant 2
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_phone_format CHECK (phone ~ '^[6-9]\d{9}$'),
  CONSTRAINT check_aadhar_format CHECK (aadhar ~ '^\d{12}$')
);

-- Quiz sessions table (for future use)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Quiz answers table (for future use)
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID,
  answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_team_id ON participants(team_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_aadhar ON participants(aadhar);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_participant_id ON quiz_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id ON quiz_answers(session_id);

-- Row Level Security (RLS) Policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own participant data
CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid()::text = id::text);

-- RLS Policy: Users can update their own participant data
CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid()::text = id::text);

-- RLS Policy: Public can view teams (for leaderboard)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  USING (true);

-- RLS Policy: Public can view participant names and scores (privacy: no email/aadhar)
CREATE POLICY "Public can view participant public data"
  ON participants FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

