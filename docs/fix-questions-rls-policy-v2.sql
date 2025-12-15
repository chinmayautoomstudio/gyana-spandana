-- ============================================================================
-- Migration Script: Fix RLS Policy for Questions Table (Version 2)
-- ============================================================================
-- 
-- PURPOSE: This script creates a security definer function to check admin role
--          and updates the RLS policy to use it. This avoids RLS circular
--          dependency issues when checking user_profiles.role.
--
-- WHEN TO RUN: Run this if the previous fix didn't work. This version uses
--              a function that can bypass RLS to check user roles.
--
-- IMPORTANT: This will drop and recreate the policy. Make sure you have
--            a backup of your database before running this script.
--
-- ============================================================================

-- Step 1: Create a security definer function to check if user is admin
-- ============================================================================
-- This function runs with the privileges of the function creator (postgres),
-- allowing it to bypass RLS when checking user_profiles.

CREATE OR REPLACE FUNCTION is_admin_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check user_profiles table first
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_uuid
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback: Check user_metadata from auth.users (requires direct access)
  -- Note: This requires the function to have access to auth schema
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION is_admin_user(UUID) IS 'Checks if a user has admin role in user_profiles table. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- Step 2: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

-- ============================================================================
-- Step 3: Create new policies using the function
-- ============================================================================

-- RLS Policy: Admins can manage questions (uses function to check role)
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- RLS Policy: Participants can view questions for scheduled/active exams
CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    OR is_admin_user(auth.uid())
  );

-- ============================================================================
-- Alternative: Simpler approach without function (if function doesn't work)
-- ============================================================================
-- If the function approach doesn't work, try this simpler version that
-- uses a subquery with explicit RLS bypass hint:

/*
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    -- Use a subquery that should work even with RLS
    (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );
*/

-- ============================================================================
-- Step 4: Verify the function works
-- ============================================================================
-- Test the function (replace with your actual user ID):
-- SELECT is_admin_user('your-user-id-here');

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- The RLS policies now use a security definer function that can check
-- user_profiles.role without being blocked by RLS on user_profiles itself.
--
-- Test the changes by:
-- 1. Logging in as an admin user
-- 2. Navigating to the question bank page
-- 3. Verifying that questions are now visible
--
-- If this still doesn't work, check:
-- 1. The function was created successfully
-- 2. Your user has role='admin' in user_profiles table
-- 3. The function returns TRUE for your user ID
--
-- ============================================================================

