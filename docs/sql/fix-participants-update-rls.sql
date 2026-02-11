-- Fix RLS Policy for Participants UPDATE Operation
-- This script ensures the UPDATE policy has both USING and WITH CHECK clauses

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;

-- Create UPDATE policy with both USING and WITH CHECK clauses
-- USING: determines which rows can be updated (must match user_id)
-- WITH CHECK: determines what values can be set (must match user_id)
CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'participants'
ORDER BY policyname;

