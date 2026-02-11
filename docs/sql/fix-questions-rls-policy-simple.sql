-- ============================================================================
-- Migration Script: Fix RLS Policy for Questions Table (Simple Version)
-- ============================================================================
-- 
-- PURPOSE: This is a simpler version that temporarily disables RLS on
--          user_profiles for the role check, or uses a different approach.
--          Use this if the function-based approach doesn't work.
--
-- WHEN TO RUN: Run this if fix-questions-rls-policy-v2.sql doesn't work.
--
-- ============================================================================

-- Step 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

-- ============================================================================
-- Step 2: Create policy that checks user_profiles with explicit handling
-- ============================================================================
-- This version uses a COALESCE to handle NULL cases and explicit role check

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    COALESCE(
      (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
      (auth.jwt() -> 'user_metadata' ->> 'role')::text,
      'participant'
    ) = 'admin'
  )
  WITH CHECK (
    COALESCE(
      (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
      (auth.jwt() -> 'user_metadata' ->> 'role')::text,
      'participant'
    ) = 'admin'
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
    OR COALESCE(
      (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
      (auth.jwt() -> 'user_metadata' ->> 'role')::text,
      'participant'
    ) = 'admin'
  );

-- ============================================================================
-- Alternative: If RLS on user_profiles is blocking, temporarily allow
-- ============================================================================
-- If the above doesn't work, you may need to add a policy to user_profiles
-- that allows role checks from other RLS policies:

/*
-- Add this policy to user_profiles to allow role checks
CREATE POLICY "Allow role checks for RLS policies"
  ON user_profiles FOR SELECT
  USING (true);  -- This allows anyone to read roles (for RLS checks only)
*/

-- ============================================================================
-- Migration Complete!
-- ============================================================================

