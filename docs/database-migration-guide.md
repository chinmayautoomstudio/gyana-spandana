# Database Migration Guide

If you've already created the database schema in Supabase, use this migration script to update it to the corrected version.

## Migration Steps

### Step 1: Add user_id column to participants table

Run this in your Supabase SQL Editor:

```sql
-- Add user_id column to link with Supabase Auth
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
```

### Step 2: Remove password_hash column (if exists)

```sql
-- Remove password_hash column (Supabase Auth handles passwords)
ALTER TABLE participants 
DROP COLUMN IF EXISTS password_hash;
```

### Step 3: Update existing RLS policies

```sql
-- Drop old incorrect policies
DROP POLICY IF EXISTS "Users can view own participant data" ON participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;

-- Create corrected policies
CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Add insert policy
CREATE POLICY "Users can insert own participant data"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Step 4: Add quiz session RLS policies (if needed)

```sql
-- RLS Policy: Users can view their own quiz sessions
CREATE POLICY IF NOT EXISTS "Users can view own quiz sessions"
  ON quiz_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own quiz sessions
CREATE POLICY IF NOT EXISTS "Users can insert own quiz sessions"
  ON quiz_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );
```

## Complete Migration Script (All-in-One)

If you prefer to run everything at once:

```sql
-- ============================================
-- MIGRATION SCRIPT FOR EXISTING DATABASE
-- ============================================

-- Step 1: Add user_id column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);

-- Step 3: Remove password_hash (if exists)
ALTER TABLE participants 
DROP COLUMN IF EXISTS password_hash;

-- Step 4: Update RLS policies
DROP POLICY IF EXISTS "Users can view own participant data" ON participants;
DROP POLICY IF EXISTS "Users can update own participant data" ON participants;

CREATE POLICY "Users can view own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own participant data"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Add quiz session policies
CREATE POLICY IF NOT EXISTS "Users can view own quiz sessions"
  ON quiz_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert own quiz sessions"
  ON quiz_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = quiz_sessions.participant_id
      AND participants.user_id = auth.uid()
    )
  );
```

## Important Notes

1. **If you have existing data**: You'll need to manually link existing participants to their auth users by updating the `user_id` column:
   ```sql
   -- Example: Update user_id for existing participants
   -- You'll need to match by email
   UPDATE participants p
   SET user_id = au.id
   FROM auth.users au
   WHERE p.email = au.email
   AND p.user_id IS NULL;
   ```

2. **Test after migration**: 
   - Try registering a new team
   - Verify the `user_id` is properly stored
   - Test login and dashboard access

3. **Backup first**: Always backup your database before running migrations in production.

## Verification

After migration, verify the schema:

```sql
-- Check if user_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'participants' 
AND column_name = 'user_id';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'participants';
```

