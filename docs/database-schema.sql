-- Gyana Spandana Database Schema for Supabase
-- This file contains the SQL schema for creating tables in Supabase
-- Run this in your Supabase SQL Editor

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(100) NOT NULL UNIQUE,
  team_code VARCHAR(50) NOT NULL UNIQUE, -- Custom Team ID: GS-P1INIT-P2INIT-XXXX
  authority_name VARCHAR(100), -- School/College Authority Name
  authority_email VARCHAR(255), -- School/College Authority Email
  authority_phone VARCHAR(10) NOT NULL, -- School/College Authority Phone (required)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_authority_phone_format CHECK (authority_phone ~ '^[6-9]\d{9}$')
);

-- Participants table (CORRECTED - Added user_id to link with Supabase Auth)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(10) NOT NULL UNIQUE,
  school_name VARCHAR(200) NOT NULL,
  aadhar VARCHAR(12) NOT NULL UNIQUE,
  -- Removed password_hash (Supabase Auth handles passwords)
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_participant1 BOOLEAN NOT NULL, -- true for participant 1, false for participant 2
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')), -- Gender
  -- Profile completion fields
  profile_photo_url TEXT, -- URL to uploaded profile photo in Supabase Storage
  address TEXT, -- Full residential address
  school_address TEXT, -- School/College address
  class VARCHAR(50), -- Current class/grade (e.g., "10th", "12th", "B.Tech 2nd Year")
  date_of_birth DATE, -- Date of birth
  profile_completed BOOLEAN DEFAULT FALSE, -- Flag to track if profile is completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_phone_format CHECK (phone ~ '^[6-9]\\d{9}$'),
  CONSTRAINT check_aadhar_format CHECK (aadhar ~ '^\\d{12}$')
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
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
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

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own participant data" ON participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;
DROP POLICY IF EXISTS "Allow participant creation during registration" ON participants;
DROP POLICY IF EXISTS "Public can view teams" ON teams;
DROP POLICY IF EXISTS "Allow team creation during registration" ON teams;
DROP POLICY IF EXISTS "Public can view participant public data" ON participants;
DROP POLICY IF EXISTS "Users can view own quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Users can insert own quiz sessions" ON quiz_sessions;

-- RLS Policy: Users can view their own participant data
CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own participant data
CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Allow participant creation during registration
-- During registration, users are created but not yet authenticated,
-- so we need to allow INSERT without requiring auth.uid() = user_id
CREATE POLICY "Allow participant creation during registration"
  ON participants FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Public can view teams (for leaderboard)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  USING (true);

-- RLS Policy: Allow team creation during registration
CREATE POLICY "Allow team creation during registration"
  ON teams FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Public can view participant public data (privacy: no email/aadhar)
CREATE POLICY "Public can view participant public data"
  ON participants FOR SELECT
  USING (true);

-- RLS Policy: Users can view their own quiz sessions
CREATE POLICY "Users can view own quiz sessions"
  ON quiz_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own quiz sessions
CREATE POLICY "Users can insert own quiz sessions"
  ON quiz_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
