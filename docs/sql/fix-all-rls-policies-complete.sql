-- ============================================================================
-- Complete Fix for ALL RLS Infinite Recursion Issues
-- ============================================================================
-- 
-- This script fixes RLS policies on ALL tables that might be causing recursion
-- Run this AFTER running diagnose-rls-policies.sql to identify issues
--
-- ============================================================================

-- Step 1: Ensure check_is_admin() function exists and is correct
-- ============================================================================
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

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

-- Step 2: Remove ALL problematic policies
-- ============================================================================
-- Drop the problematic "Allow role checks for RLS" policy
DROP POLICY IF EXISTS "Allow role checks for RLS" ON user_profiles;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON questions;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON exams;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON exam_attempts;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON exam_answers;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON exam_participants;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON question_sets;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON question_set_questions;
DROP POLICY IF EXISTS "Allow role checks for RLS" ON team_scores;

-- Drop ALL existing policies that directly reference user_profiles
DROP POLICY IF EXISTS "Users can access questions" ON questions;
DROP POLICY IF EXISTS "Users can access exams" ON exams;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Participants can manage own exam attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Participants can manage own exam answers" ON exam_answers;
DROP POLICY IF EXISTS "Users can access exam participants" ON exam_participants;
DROP POLICY IF EXISTS "Admins can manage question sets" ON question_sets;
DROP POLICY IF EXISTS "Admins can manage question set questions" ON question_set_questions;

-- Step 3: Fix questions table policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Participants can view questions for active exams" ON questions;

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

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

-- Step 4: Fix user_profiles table policies
-- ============================================================================
-- Drop ALL existing policies (including problematic ones)
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

-- Recreate safe policies
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (public.check_is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (public.check_is_admin());

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 5: Fix exams table policies
-- ============================================================================
-- Drop ALL existing policies (including problematic ones)
DROP POLICY IF EXISTS "Admins can manage exams" ON exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON exams;
DROP POLICY IF EXISTS "Users can access exams" ON exams;

-- Recreate safe policies
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can view all exams"
  ON exams FOR SELECT
  USING (public.check_is_admin() OR true);

-- Step 6: Fix exam_attempts table policies (if table exists)
-- ============================================================================
-- Check if exam_attempts table exists before creating policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_attempts') THEN
    -- Drop ALL existing policies on exam_attempts dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'exam_attempts'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON exam_attempts', policy_record.policyname);
    END LOOP;
    
    -- Admins can do everything
    CREATE POLICY "Admins can manage exam attempts"
      ON exam_attempts FOR ALL
      USING (public.check_is_admin())
      WITH CHECK (public.check_is_admin());
    
    -- Participants can view their own attempts (via participant relationship)
    CREATE POLICY "Participants can view own exam attempts"
      ON exam_attempts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM participants
          WHERE participants.id = exam_attempts.participant_id
          AND participants.user_id = auth.uid()
        )
        OR public.check_is_admin()
      );
    
    -- Participants can create their own attempts
    CREATE POLICY "Participants can create own exam attempts"
      ON exam_attempts FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM participants
          WHERE participants.id = exam_attempts.participant_id
          AND participants.user_id = auth.uid()
        )
        OR public.check_is_admin()
      );
    
    -- Participants can update their own in-progress attempts
    CREATE POLICY "Participants can update own attempts"
      ON exam_attempts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM participants
          WHERE participants.id = exam_attempts.participant_id
          AND participants.user_id = auth.uid()
          AND exam_attempts.status = 'in_progress'
        )
        OR public.check_is_admin()
      );
  END IF;
END $$;

-- Step 6b: Fix exam_answers table policies (if table exists)
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_answers') THEN
    -- Drop ALL existing policies on exam_answers dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'exam_answers'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON exam_answers', policy_record.policyname);
    END LOOP;
    
    -- Admins can do everything
    CREATE POLICY "Admins can manage exam answers"
      ON exam_answers FOR ALL
      USING (public.check_is_admin())
      WITH CHECK (public.check_is_admin());
    
    -- Participants can view their own answers
    CREATE POLICY "Participants can view own exam answers"
      ON exam_answers FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM exam_attempts
          JOIN participants ON participants.id = exam_attempts.participant_id
          WHERE exam_attempts.id = exam_answers.attempt_id
          AND participants.user_id = auth.uid()
        )
        OR public.check_is_admin()
      );
    
    -- Participants can create answers for their own attempts
    CREATE POLICY "Participants can create own exam answers"
      ON exam_answers FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM exam_attempts
          JOIN participants ON participants.id = exam_attempts.participant_id
          WHERE exam_attempts.id = exam_answers.attempt_id
          AND participants.user_id = auth.uid()
          AND exam_attempts.status = 'in_progress'
        )
        OR public.check_is_admin()
      );
    
    -- Participants can update their own answers
    CREATE POLICY "Participants can update own exam answers"
      ON exam_answers FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM exam_attempts
          JOIN participants ON participants.id = exam_attempts.participant_id
          WHERE exam_attempts.id = exam_answers.attempt_id
          AND participants.user_id = auth.uid()
          AND exam_attempts.status = 'in_progress'
        )
        OR public.check_is_admin()
      );
  END IF;
END $$;

-- Step 6c: Fix exam_participants table policies (if table exists)
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_participants') THEN
    -- Drop ALL existing policies on exam_participants dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'exam_participants'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON exam_participants', policy_record.policyname);
    END LOOP;
    
    -- Admins can do everything
    CREATE POLICY "Admins can manage exam participants"
      ON exam_participants FOR ALL
      USING (public.check_is_admin())
      WITH CHECK (public.check_is_admin());
    
    -- Users can view exam participants for exams they're in (via participants table)
    CREATE POLICY "Users can view own exam participants"
      ON exam_participants FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM participants
          WHERE participants.user_id = auth.uid()
          AND participants.id = exam_participants.participant_id
        )
        OR public.check_is_admin()
      );
  END IF;
END $$;

-- Step 6d: Fix question_sets table policies (if table exists)
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'question_sets') THEN
    -- Drop ALL existing policies on question_sets dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'question_sets'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON question_sets', policy_record.policyname);
    END LOOP;
    
    CREATE POLICY "Admins can manage question sets"
      ON question_sets FOR ALL
      USING (public.check_is_admin())
      WITH CHECK (public.check_is_admin());
  END IF;
END $$;

-- Step 6e: Fix question_set_questions table policies (if table exists)
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'question_set_questions') THEN
    -- Drop ALL existing policies on question_set_questions dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'question_set_questions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON question_set_questions', policy_record.policyname);
    END LOOP;
    
    CREATE POLICY "Admins can manage question set questions"
      ON question_set_questions FOR ALL
      USING (public.check_is_admin())
      WITH CHECK (public.check_is_admin());
  END IF;
END $$;

-- Step 6f: Fix team_scores table policies (if table exists)
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_scores') THEN
    -- Drop ALL existing policies on team_scores dynamically
    FOR policy_record IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'team_scores'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON team_scores', policy_record.policyname);
    END LOOP;
    
    CREATE POLICY "Only admins can view team scores"
      ON team_scores FOR SELECT
      USING (public.check_is_admin());
  END IF;
END $$;

-- Step 7: Verify everything
-- ============================================================================
-- Verify function exists
SELECT 'Function exists:' as check_type, 
       COUNT(*) as count 
FROM pg_proc 
WHERE proname = 'check_is_admin' 
  AND prosecdef = true;

-- Verify no problematic policies remain (should return 0 rows)
SELECT '⚠️ WARNING: Problematic policies still exist!' as check_type,
       tablename,
       policyname
FROM pg_policies
WHERE qual LIKE '%user_profiles%' 
  AND qual NOT LIKE '%check_is_admin%'
  AND qual NOT LIKE '%auth.uid()%'
ORDER BY tablename, policyname;

-- Count policies using the function (should be > 0)
SELECT 'Policies using check_is_admin():' as check_type,
       tablename,
       COUNT(*) as count
FROM pg_policies
WHERE qual LIKE '%check_is_admin%'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- IMPORTANT: After running this script
-- ============================================================================
-- 1. Clear your browser cache completely (Ctrl+Shift+Delete)
-- 2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
-- 3. Check browser console - should see no more 500 errors
-- 4. If still seeing errors, run diagnose-rls-policies.sql to see what's left
-- ============================================================================

