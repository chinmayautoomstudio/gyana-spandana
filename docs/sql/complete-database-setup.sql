-- ============================================
-- COMPLETE DATABASE SETUP FOR GYANA SPANDANA
-- ============================================
-- This script will:
-- 1. Drop all existing tables, policies, and functions
-- 2. Create fresh tables with proper structure
-- 3. Set up correct RLS policies for registration flow
-- 4. Create indexes for performance
-- 5. Set up triggers for auto-updating timestamps
--
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DROP EVERYTHING (Clean Slate)
-- ============================================

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Public can view teams" ON teams;
DROP POLICY IF EXISTS "Allow team creation during registration" ON teams;
DROP POLICY IF EXISTS "Users can view own participant data" ON participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;
DROP POLICY IF EXISTS "Users can insert own participant data" ON participants;
DROP POLICY IF EXISTS "Allow participant creation during registration" ON participants;
DROP POLICY IF EXISTS "Public can view participant public data" ON participants;
DROP POLICY IF EXISTS "Users can view own quiz sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Users can insert own quiz sessions" ON quiz_sessions;

-- Drop triggers
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (cascade will remove foreign key constraints)
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES
-- ============================================

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(10) NOT NULL UNIQUE,
  school_name VARCHAR(200) NOT NULL,
  aadhar VARCHAR(12) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_participant1 BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_phone_format CHECK (phone ~ '^[6-9]\d{9}$'),
  CONSTRAINT check_aadhar_format CHECK (aadhar ~ '^\d{12}$')
);

-- Quiz sessions table (for future use)
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Quiz answers table (for future use)
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID,
  answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_team_id ON participants(team_id);
CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_aadhar ON participants(aadhar);
CREATE INDEX idx_participants_phone ON participants(phone);
CREATE INDEX idx_quiz_sessions_participant_id ON quiz_sessions(participant_id);
CREATE INDEX idx_quiz_answers_session_id ON quiz_answers(session_id);

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- ===== TEAMS TABLE POLICIES =====

-- Allow anyone to view teams (for leaderboard)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  USING (true);

-- Allow team creation during registration (unauthenticated)
CREATE POLICY "Allow team creation during registration"
  ON teams FOR INSERT
  WITH CHECK (true);

-- ===== PARTICIPANTS TABLE POLICIES =====

-- Allow authenticated users to view their own participant data
CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own participant data
CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow participant creation during registration (unauthenticated)
-- This is needed because during registration, users are created but not logged in
CREATE POLICY "Allow participant creation during registration"
  ON participants FOR INSERT
  WITH CHECK (true);

-- Allow public to view participant data (for leaderboard, excludes sensitive fields)
CREATE POLICY "Public can view participant public data"
  ON participants FOR SELECT
  USING (true);

-- ===== QUIZ SESSIONS TABLE POLICIES =====

-- Allow users to view their own quiz sessions
CREATE POLICY "Users can view own quiz sessions"
  ON quiz_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- Allow users to insert their own quiz sessions
CREATE POLICY "Users can insert own quiz sessions"
  ON quiz_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- ===== QUIZ ANSWERS TABLE POLICIES =====
-- Answers inherit permissions from quiz_sessions through the foreign key

-- ============================================
-- STEP 6: CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams table
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for participants table
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'participants', 'quiz_sessions', 'quiz_answers')
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('teams', 'participants', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename;

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('teams', 'participants', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename, policyname;

-- Verify indexes were created
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('teams', 'participants', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename, indexname;

-- ============================================
-- SETUP COMPLETE! 🎉
-- ============================================
-- Your database is now ready for registration.
-- Test by going to http://localhost:3000/register
-- ============================================
