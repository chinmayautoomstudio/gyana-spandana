-- ============================================================================
-- Diagnostic Queries to Find Remaining RLS Issues
-- ============================================================================
-- 
-- Run these queries in Supabase SQL Editor to diagnose why the fix isn't working
-- This will show you what policies exist and identify any problematic ones
--
-- ============================================================================

-- 1. Check if check_is_admin() function exists and is correct
-- ============================================================================
SELECT 
  'Function Check' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  pronargs as arg_count,
  CASE 
    WHEN prosecdef THEN '✅ Function has SECURITY DEFINER (correct)'
    ELSE '❌ Function missing SECURITY DEFINER (WRONG!)'
  END as status
FROM pg_proc
WHERE proname = 'check_is_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. List ALL policies on user_profiles table
-- ============================================================================
SELECT 
  'User Profiles Policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%user_profiles%' OR qual LIKE '%EXISTS%SELECT%FROM%user_profiles%' THEN '⚠️ WARNING: Policy references user_profiles (may cause recursion)'
    WHEN qual LIKE '%check_is_admin%' THEN '✅ Uses check_is_admin() function (good)'
    ELSE 'ℹ️ Other'
  END as status
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 3. List ALL policies on questions table
-- ============================================================================
SELECT 
  'Questions Policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%user_profiles%' AND qual NOT LIKE '%check_is_admin%' THEN '❌ Directly references user_profiles (BAD - causes recursion)'
    WHEN qual LIKE '%check_is_admin%' THEN '✅ Uses check_is_admin() function (good)'
    ELSE 'ℹ️ Other'
  END as status
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

-- 4. List ALL policies on exams table
-- ============================================================================
SELECT 
  'Exams Policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%user_profiles%' AND qual NOT LIKE '%check_is_admin%' THEN '❌ Directly references user_profiles (BAD - causes recursion)'
    WHEN qual LIKE '%check_is_admin%' THEN '✅ Uses check_is_admin() function (good)'
    ELSE 'ℹ️ Other'
  END as status
FROM pg_policies
WHERE tablename = 'exams'
ORDER BY policyname;

-- 5. Check exam_attempts table (this might also have policies causing issues)
-- ============================================================================
SELECT 
  'Exam Attempts Policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%user_profiles%' AND qual NOT LIKE '%check_is_admin%' THEN '❌ Directly references user_profiles (BAD - causes recursion)'
    WHEN qual LIKE '%check_is_admin%' THEN '✅ Uses check_is_admin() function (good)'
    ELSE 'ℹ️ Other'
  END as status
FROM pg_policies
WHERE tablename = 'exam_attempts'
ORDER BY policyname;

-- 6. Find ALL tables with policies that reference user_profiles directly
-- ============================================================================
SELECT DISTINCT
  'Tables with user_profiles references' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%user_profiles%' AND qual NOT LIKE '%check_is_admin%' THEN '❌ Problematic policy'
    ELSE 'ℹ️ Uses function (OK)'
  END as status
FROM pg_policies
WHERE qual LIKE '%user_profiles%'
ORDER BY tablename, policyname;

-- 7. Test the check_is_admin() function directly
-- ============================================================================
-- Uncomment and run this to test the function (replace with your user ID if needed)
-- SELECT public.check_is_admin() as is_admin_result, auth.uid() as current_user_id;

-- 8. Check for any remaining "Allow role checks for RLS" policy
-- ============================================================================
SELECT 
  'Problematic Policy Check' as check_type,
  tablename,
  policyname,
  '❌ This policy causes recursion!' as status
FROM pg_policies
WHERE policyname = 'Allow role checks for RLS';

