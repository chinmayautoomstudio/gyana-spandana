-- ============================================================================
-- Migration Script: Fix RLS Policy for Questions Table
-- ============================================================================
-- 
-- PURPOSE: This script updates the RLS policy for the questions table to check
--          the user_profiles.role instead of user_metadata.role, matching the
--          application's role checking logic.
--
-- WHEN TO RUN: Run this in your Supabase SQL Editor if questions are not
--              showing in the question bank for admin users.
--
-- IMPORTANT: This will drop and recreate the policy. Make sure you have
--            a backup of your database before running this script.
--
-- ============================================================================

-- Step 1: Drop existing policy
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;

-- ============================================================================
-- Step 2: Create new policy that checks user_profiles table
-- ============================================================================
-- 
-- The new policy checks user_profiles.role first (primary source),
-- with fallback to user_metadata.role for backward compatibility.
--
-- ============================================================================

-- RLS Policy: Admins can manage questions (checks user_profiles.role)
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- ============================================================================
-- Step 3: Update the "Participants can view questions" policy as well
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- The RLS policies for the questions table have been updated to check
-- user_profiles.role as the primary source, with fallback to user_metadata.role.
-- 
-- This matches the application's role checking logic in middleware.ts and
-- other parts of the codebase.
--
-- Test the changes by:
-- 1. Logging in as an admin user (with role in user_profiles table)
-- 2. Navigating to the question bank page
-- 3. Verifying that questions are now visible
--
-- ============================================================================

