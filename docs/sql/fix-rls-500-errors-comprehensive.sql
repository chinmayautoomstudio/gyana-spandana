-- ============================================================================
-- Comprehensive Fix for RLS 500 Errors
-- ============================================================================
-- 
-- PURPOSE: This script fixes RLS policies that are causing 500 server errors.
--          It removes complex function dependencies and uses simpler, direct checks.
--
-- WHEN TO RUN: Run this when you see 500 errors on all Supabase queries.
--              This indicates RLS policies are broken.
--
-- IMPORTANT: This will drop and recreate policies. Make sure you have
--            a backup of your database before running this script.
--
-- ============================================================================

-- Step 1: Drop problematic function if it exists and has errors
-- ============================================================================

DROP FUNCTION IF EXISTS is_admin_user(UUID);

-- Step 2: Drop all existing RLS policies on questions table
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

-- Step 3: Create simple, working RLS policies
-- ============================================================================
-- These policies use direct subqueries instead of functions to avoid errors

-- Policy 1: Admins can do everything with questions
-- This checks user_profiles directly with a simple subquery
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    -- Direct check of user_profiles table
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    -- Fallback to user_metadata for backward compatibility
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- Policy 2: Participants can view questions for active exams
CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    -- Questions for active/scheduled exams
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    -- OR admin users
    OR EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- ============================================================================
-- Step 4: Fix user_profiles RLS to allow role checks
-- ============================================================================
-- The user_profiles table needs a policy that allows RLS policies to check roles

-- Check if policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Allow role checks for RLS'
  ) THEN
    CREATE POLICY "Allow role checks for RLS"
      ON user_profiles FOR SELECT
      USING (true);  -- Allow reading roles for RLS policy evaluation
  END IF;
END $$;

-- ============================================================================
-- Step 5: Verify policies were created
-- ============================================================================

-- Check questions policies
SELECT 
  'Questions Policies' as check_type,
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
  CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

-- ============================================================================
-- Step 6: Test the policies
-- ============================================================================
-- Run these as your admin user to test:

-- Test 1: Check if you can see questions (replace with your user_id)
-- SELECT COUNT(*) FROM questions;

-- Test 2: Check your role
-- SELECT role FROM user_profiles WHERE user_id = auth.uid();

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- The RLS policies have been simplified to avoid function dependencies
-- and server-side errors. They now use direct subqueries which are more reliable.
--
-- If you still get 500 errors after this:
-- 1. Check Supabase logs for the exact error
-- 2. Verify user_profiles table exists and has your admin user
-- 3. Check that RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'questions';
--
-- ============================================================================

