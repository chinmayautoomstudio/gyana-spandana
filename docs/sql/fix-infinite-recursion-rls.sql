-- ============================================================================
-- Fix Infinite Recursion in user_profiles RLS
-- ============================================================================
-- 
-- CRITICAL FIX: This script fixes the "infinite recursion detected in policy 
--               for relation user_profiles" error (code 42P17).
--
-- ROOT CAUSE: The user_profiles RLS policy checks user_profiles itself,
--             creating infinite recursion when questions RLS policy tries to
--             check user_profiles.role.
--
-- WHEN TO RUN: Run this immediately when you see error code 42P17 or
--              "infinite recursion detected in policy for relation user_profiles"
--
-- ============================================================================

-- Step 1: Remove ALL problematic policies that cause recursion
-- ============================================================================

-- Remove the "Allow role checks for RLS" policy if it exists (this causes recursion)
DROP POLICY IF EXISTS "Allow role checks for RLS" ON user_profiles;

-- Step 2: Create SECURITY DEFINER function to check admin role
-- ============================================================================
-- This function runs with postgres privileges and bypasses RLS,
-- preventing infinite recursion

CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from user_profiles without triggering RLS
  -- SECURITY DEFINER allows this to bypass RLS
  SELECT role INTO user_role
  FROM user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Return true if role is admin
  RETURN COALESCE(user_role, '') = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    -- If query fails, fallback to user_metadata
    RETURN (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin() TO anon;

-- Add comment
COMMENT ON FUNCTION check_is_admin() IS 'Checks if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- ============================================================================
-- Step 3: Drop and recreate questions RLS policies using the function
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

-- Policy 1: Admins can manage questions (uses function to avoid recursion)
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Policy 2: Participants can view questions for active exams
CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    OR check_is_admin()
  );

-- ============================================================================
-- Step 4: Fix user_profiles RLS policies to prevent recursion
-- ============================================================================
-- The existing policies check user_profiles itself, causing recursion.
-- We need to fix them to use the function or auth.jwt() only.

-- Drop existing admin policies on user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Recreate using the function (which bypasses RLS)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (check_is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (check_is_admin());

-- ============================================================================
-- Step 5: Verify the function works
-- ============================================================================

-- Test the function (should return true/false without recursion)
-- SELECT check_is_admin();

-- ============================================================================
-- Step 6: Verify policies
-- ============================================================================

SELECT 
  'Questions Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

SELECT 
  'User Profiles Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- The infinite recursion issue has been fixed by:
-- 1. Removing the problematic "Allow role checks for RLS" policy
-- 2. Creating a SECURITY DEFINER function that bypasses RLS
-- 3. Updating all RLS policies to use the function instead of direct queries
--
-- Test the fix:
-- 1. Refresh your browser
-- 2. Check browser console - should see no more 500 errors
-- 3. Questions should now be visible in question bank
--
-- ============================================================================

