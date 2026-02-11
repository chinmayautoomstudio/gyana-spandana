-- Migration: Fix RLS Policy for Exam Submission
-- This migration fixes the RLS policy to allow participants to submit their exam attempts
-- Run this in your Supabase SQL Editor

-- Drop existing update policy
DROP POLICY IF EXISTS "Participants can update own attempts" ON exam_attempts;

-- Create new policy that allows submission
-- The policy allows updates when:
-- 1. Status is 'in_progress' (for regular updates during exam)
-- 2. Status is 'submitted' (allows updating already submitted attempts if needed)
CREATE POLICY "Participants can update own attempts"
  ON exam_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
      AND participants.user_id = auth.uid()
      AND (
        exam_attempts.status = 'in_progress'
        OR exam_attempts.status = 'submitted'  -- Allow if already submitted (edge case)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_attempts.participant_id
      AND participants.user_id = auth.uid()
      AND (
        exam_attempts.status = 'in_progress'
        OR exam_attempts.status = 'submitted'  -- Allow updating to submitted
      )
    )
  );

-- Verification query (optional - run to verify policy exists)
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'exam_attempts' AND policyname = 'Participants can update own attempts';
