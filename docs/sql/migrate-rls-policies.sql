-- ============================================================================
-- Migration Script: Update RLS Policies for Exam System
-- ============================================================================
-- 
-- PURPOSE: This script updates all RLS policies to use the correct syntax
--          (auth.jwt() instead of auth.users.raw_user_meta_data) to properly
--          check admin roles and prevent participants from creating/updating exams.
--
-- WHEN TO RUN: Run this in your Supabase SQL Editor if you already have the
--              exam tables created and need to fix the RLS policies.
--
-- IMPORTANT: This will drop and recreate the policies. Make sure you have
--            a backup of your database before running this script.
--
-- ============================================================================

-- Step 1: Drop all existing policies that need to be updated
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage exams" ON exams;
DROP POLICY IF EXISTS "Participants can view scheduled exams" ON exams;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;
DROP POLICY IF EXISTS "Participants can view own exam attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Participants can view own exam answers" ON exam_answers;
DROP POLICY IF EXISTS "Only admins can view team scores" ON team_scores;

-- ============================================================================
-- Step 2: Recreate policies with corrected syntax using auth.jwt()
-- ============================================================================
-- 
-- All policies now use: (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
-- This correctly accesses the user's role from the JWT token metadata.
--
-- ============================================================================

-- RLS Policy: Admins can do everything with exams (INSERT, UPDATE, DELETE, SELECT)
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

-- RLS Policy: Only admins can view team scores (leaderboard)
CREATE POLICY "Only admins can view team scores"
  ON team_scores FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- All RLS policies have been updated to use the correct auth.jwt() syntax.
-- 
-- Security improvements:
-- ✓ Only admins can create/update/delete exams
-- ✓ Only admins can create/update/delete questions
-- ✓ Participants can only view scheduled/active exams
-- ✓ Participants can only view questions for active exams
-- ✓ Only admins can view team scores (leaderboard)
--
-- Test the changes by:
-- 1. Logging in as a participant and trying to create an exam (should fail)
-- 2. Logging in as an admin and creating an exam (should succeed)
--
-- ============================================================================

