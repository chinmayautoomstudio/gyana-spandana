-- Fix: Add user_id column to existing participants table
-- Run this in Supabase SQL Editor if you get "column user_id does not exist" error

-- Step 1: Add user_id column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE participants 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
    
    RAISE NOTICE 'user_id column added successfully';
  ELSE
    RAISE NOTICE 'user_id column already exists';
  END IF;
END $$;

-- Step 2: Remove password_hash column (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE participants DROP COLUMN password_hash;
    RAISE NOTICE 'password_hash column removed successfully';
  ELSE
    RAISE NOTICE 'password_hash column does not exist (already removed)';
  END IF;
END $$;

-- Step 3: Drop old incorrect RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view own participant data" ON participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;

-- Step 4: Create corrected RLS policies
CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 4b: Drop insert policy if exists, then create
DROP POLICY IF EXISTS "Users can insert own participant data" ON participants;
CREATE POLICY "Users can insert own participant data"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Add quiz session policies (if needed)
DROP POLICY IF EXISTS "Users can view own quiz sessions" ON quiz_sessions;
CREATE POLICY "Users can view own quiz sessions"
  ON quiz_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own quiz sessions" ON quiz_sessions;
CREATE POLICY "Users can insert own quiz sessions"
  ON quiz_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- Verification: Check if user_id column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;

