-- ============================================================================
-- Verification Script: Check Questions Database State
-- ============================================================================
-- 
-- PURPOSE: This script helps verify the state of the questions database
--          and diagnose why questions might not be showing in the question bank.
--
-- WHEN TO RUN: Run this in your Supabase SQL Editor to check:
--              - If questions exist in the database
--              - If RLS policies are correctly configured
--              - If admin users have proper roles
--
-- ============================================================================

-- Step 1: Check if questions table exists and has data
-- ============================================================================

SELECT 
  'Questions Table Check' as check_type,
  COUNT(*) as total_questions,
  COUNT(CASE WHEN exam_id IS NULL THEN 1 END) as questions_in_bank,
  COUNT(CASE WHEN exam_id IS NOT NULL THEN 1 END) as questions_in_exams
FROM questions;

-- Step 2: Check questions by category
-- ============================================================================

SELECT 
  'Questions by Category' as check_type,
  category,
  COUNT(*) as count
FROM questions
GROUP BY category
ORDER BY count DESC;

-- Step 3: Check questions by difficulty level
-- ============================================================================

SELECT 
  'Questions by Difficulty' as check_type,
  COALESCE(difficulty_level, 'not_set') as difficulty_level,
  COUNT(*) as count
FROM questions
GROUP BY difficulty_level
ORDER BY count DESC;

-- Step 4: Check if user_profiles table exists and has admin users
-- ============================================================================

SELECT 
  'Admin Users Check' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
  COUNT(CASE WHEN role = 'participant' THEN 1 END) as participant_users
FROM user_profiles;

-- Step 5: List all admin users
-- ============================================================================

SELECT 
  'Admin Users List' as check_type,
  up.user_id,
  up.role,
  au.email,
  up.created_at
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;

-- Step 6: Check RLS policies on questions table
-- ============================================================================

SELECT 
  'RLS Policies Check' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

-- Step 7: Check if RLS is enabled on questions table
-- ============================================================================

SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'questions';

-- Step 8: Sample questions (first 5)
-- ============================================================================

SELECT 
  'Sample Questions' as check_type,
  id,
  LEFT(question_text, 50) || '...' as question_preview,
  category,
  difficulty_level,
  exam_id,
  created_at
FROM questions
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- Verification Complete!
-- ============================================================================
-- 
-- Review the results above to diagnose issues:
--
-- 1. If total_questions is 0:
--    - Run the sample questions SQL file: docs/sample-odisha-culture-questions-comprehensive.sql
--
-- 2. If admin_users is 0:
--    - Create an admin user using: scripts/create-admin-user.ts
--    - Or manually insert into user_profiles table
--
-- 3. If RLS policies are missing or incorrect:
--    - Run the fix migration: docs/fix-questions-rls-policy.sql
--
-- 4. If RLS is not enabled:
--    - Run: ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
--
-- ============================================================================

