# Supabase Connection Test Guide

Use this guide to verify your Supabase connection and database setup is working correctly.

## Prerequisites

1. ✅ Supabase project created
2. ✅ Database schema created (using `database-schema.sql`)
3. ✅ Environment variables set in `.env.local`
4. ✅ Next.js development server running

## Step 1: Verify Environment Variables

Check that your `.env.local` file exists and has the correct values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key

## Step 2: Test Database Connection

### Option A: Test via Supabase Dashboard

1. Go to **Table Editor** in Supabase Dashboard
2. Verify these tables exist:
   - ✅ `teams`
   - ✅ `participants`
   - ✅ `quiz_sessions`
   - ✅ `quiz_answers`

3. Check `participants` table structure:
   - ✅ Should have `user_id` column (UUID, references auth.users)
   - ✅ Should NOT have `password_hash` column
   - ✅ Should have all other required columns

### Option B: Test via SQL Editor

Run this query in Supabase SQL Editor:

```sql
-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'participants';
```

**Expected Results:**
- `user_id` column should exist (UUID type)
- RLS policies should reference `user_id`, not `id`
- No `password_hash` column

## Step 3: Test Registration Flow

1. **Start development server:**
   ```bash
   cd gyana-spandana
   npm run dev
   ```

2. **Navigate to registration page:**
   - Go to `http://localhost:3000/register`

3. **Fill out registration form:**
   - Team Name: "Test Team"
   - Participant 1: Fill all fields
   - Participant 2: Fill all fields
   - Check consent box
   - Click "Register Team"

4. **Check for errors:**
   - If successful: You should see success message
   - If error: Check browser console and network tab

5. **Verify in Supabase:**
   - Go to **Authentication** → **Users** - Should see 2 new users
   - Go to **Table Editor** → **teams** - Should see "Test Team"
   - Go to **Table Editor** → **participants** - Should see 2 participants
   - **Important:** Check that `user_id` column is populated (not NULL)

## Step 4: Test Login Flow

1. **Navigate to login page:**
   - Go to `http://localhost:3000/login`

2. **Login with Participant 1 credentials:**
   - Use the email and password from registration

3. **Verify:**
   - Should redirect to `/dashboard`
   - Dashboard should show team information
   - No errors in console

## Step 5: Verify RLS Policies

Test that RLS policies are working:

```sql
-- Test as authenticated user (run in SQL Editor after logging in)
-- This should return the user's own participant data
SELECT * FROM participants WHERE user_id = auth.uid();

-- This should return empty (can't see other users' data)
SELECT * FROM participants WHERE user_id != auth.uid();
```

## Common Issues and Solutions

### Issue 1: "relation does not exist"
**Solution:** Run the database schema SQL in Supabase SQL Editor

### Issue 2: "column user_id does not exist"
**Solution:** Run the migration script from `database-migration-guide.md`

### Issue 3: "permission denied for table participants"
**Solution:** 
- Check RLS policies are created correctly
- Verify policies use `user_id`, not `id`
- Check that user is authenticated

### Issue 4: "duplicate key value violates unique constraint"
**Solution:** 
- Email, phone, or Aadhar already exists
- Try with different test data

### Issue 5: Registration succeeds but user_id is NULL
**Solution:**
- Check registration code is updated (should include `user_id: authData.user.id`)
- Verify auth user was created successfully
- Check browser console for errors

## Quick Connection Test Script

Create a test file `test-connection.ts` (temporary):

```typescript
// test-connection.ts (delete after testing)
import { createClient } from './lib/supabase/client'

async function testConnection() {
  const supabase = createClient()
  
  // Test 1: Check connection
  const { data, error } = await supabase.from('teams').select('count')
  console.log('Connection test:', error ? 'FAILED' : 'SUCCESS', error)
  
  // Test 2: Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('Auth test:', authError ? 'FAILED' : 'SUCCESS', authError)
}

testConnection()
```

## Verification Checklist

- [ ] Environment variables set correctly
- [ ] Database tables created
- [ ] `participants` table has `user_id` column
- [ ] RLS policies created and correct
- [ ] Registration creates auth users
- [ ] Registration stores `user_id` in participants table
- [ ] Login works correctly
- [ ] Dashboard loads user data
- [ ] No console errors

## Next Steps After Verification

Once connection is verified:
1. ✅ Test full registration flow
2. ✅ Test login flow
3. ✅ Test dashboard access
4. ✅ Verify data in Supabase dashboard
5. ✅ Test with multiple teams

If everything works, you're ready to continue development!

