-- ============================================================================
-- Final Fix for RLS Infinite Recursion in user_profiles
-- ============================================================================
-- 
-- CRITICAL FIX: This script fixes the "infinite recursion detected in policy 
--               for relation user_profiles" error (code 42P17).
--
-- ROOT CAUSE: RLS policies on questions/exams check user_profiles.role, but
--             user_profiles RLS policies also check user_profiles, creating
--             infinite recursion.
--
-- SOLUTION: Use SECURITY DEFINER function that bypasses RLS to check admin role
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

CREATE OR REPLACE FUNCTION public.check_is_admin()
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
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Return true if role is admin
  RETURN COALESCE(user_role, '') = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    -- If query fails, fallback to user_metadata
    RETURN COALESCE((auth.jwt() -> 'user_metadata' ->> 'role')::text, '') = 'admin';
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

-- Add comment
COMMENT ON FUNCTION public.check_is_admin() IS 'Checks if current user is admin. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- ============================================================================
-- Step 3: Fix questions RLS policies using the function
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

-- Policy 1: Admins can manage questions (uses function to avoid recursion)
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

-- Policy 2: Participants can view questions for active exams
CREATE POLICY "Participants can view questions for active exams"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = questions.exam_id
      AND exams.status IN ('scheduled', 'active')
    )
    OR public.check_is_admin()
  );

-- ============================================================================
-- Step 4: Fix user_profiles RLS policies to prevent recursion
-- ============================================================================

-- Drop existing admin policies on user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Recreate using the function (which bypasses RLS)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (public.check_is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (public.check_is_admin());

-- Users can view their own profile (no recursion - just checks auth.uid())
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (no recursion - just checks auth.uid())
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Step 5: Fix exams RLS policies if they exist
-- ============================================================================

-- Check if exams table has policies that check user_profiles
-- Drop and recreate with function if needed
DROP POLICY IF EXISTS "Admins can manage exams" ON exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON exams;

-- Create admin policies using the function
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can view all exams"
  ON exams FOR SELECT
  USING (public.check_is_admin() OR true); -- Allow all to view exams, admins can manage

-- ============================================================================
-- Step 6: Verify the function works
-- ============================================================================

-- Test the function (should return true/false without recursion)
-- Uncomment to test:
-- SELECT public.check_is_admin();

-- ============================================================================
-- Step 7: Verify policies
-- ============================================================================

-- Check questions policies
SELECT 
  'Questions Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

-- Check user_profiles policies
SELECT 
  'User Profiles Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Check exams policies
SELECT 
  'Exams Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'exams'
ORDER BY policyname;

-- Verify function exists and is correct
SELECT 
  'Function Check' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  pronargs as arg_count
FROM pg_proc
WHERE proname = 'check_is_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- 
-- The infinite recursion issue has been fixed by:
-- 1. Removing the problematic "Allow role checks for RLS" policy
-- 2. Creating a SECURITY DEFINER function that bypasses RLS
-- 3. Updating all RLS policies to use the function instead of direct queries
-- 4. Ensuring user_profiles policies don't reference themselves
--
-- Test the fix:
-- 1. Refresh your browser
-- 2. Check browser console - should see no more 500 errors
-- 3. Questions should now be visible in question bank
-- 4. Admin access should work without recursion errors
--
-- ============================================================================

