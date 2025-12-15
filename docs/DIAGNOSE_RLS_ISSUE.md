# Diagnosing RLS Issue - Questions Not Showing

## Problem
After applying the RLS policy fix, questions still aren't showing. This suggests the RLS policy might be blocked by RLS on the `user_profiles` table itself.

## Root Cause
When the RLS policy on `questions` tries to check `user_profiles.role`, the RLS policy on `user_profiles` might be blocking that check, creating a circular dependency.

## Solutions (Try in Order)

### Solution 1: Use Security Definer Function (Recommended)
Run `docs/fix-questions-rls-policy-v2.sql` which creates a function that can bypass RLS to check roles.

**Steps:**
1. Open Supabase SQL Editor
2. Run `docs/fix-questions-rls-policy-v2.sql`
3. Test if questions appear
4. If it works, you're done!

### Solution 2: Use Simple COALESCE Approach
If Solution 1 doesn't work, try `docs/fix-questions-rls-policy-simple.sql`.

**Steps:**
1. Run `docs/fix-questions-rls-policy-simple.sql`
2. Test if questions appear

### Solution 3: Allow Role Checks in user_profiles RLS
If both above don't work, you need to allow the RLS policy check to read user_profiles:

```sql
-- Add this policy to user_profiles
CREATE POLICY "Allow role checks for RLS policies"
  ON user_profiles FOR SELECT
  USING (true);
```

**Warning:** This allows anyone to read roles, but only for RLS policy evaluation. The actual data is still protected by other policies.

### Solution 4: Temporarily Disable RLS (Testing Only)
**ONLY FOR TESTING - NOT FOR PRODUCTION:**

```sql
-- Temporarily disable RLS on user_profiles to test
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Test if questions appear now
-- If they do, the issue is confirmed to be RLS blocking

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Then apply one of the solutions above
```

## Debugging Steps

### 1. Check if Function Works
```sql
-- Replace with your actual user ID
SELECT is_admin_user('your-user-id-here');
-- Should return TRUE if you're an admin
```

### 2. Check Your Role
```sql
-- Check your role in user_profiles
SELECT user_id, role 
FROM user_profiles 
WHERE user_id = auth.uid();
```

### 3. Test Direct Query
```sql
-- Try to select questions directly (should work if RLS is fixed)
SELECT COUNT(*) FROM questions;
```

### 4. Check RLS Policies
```sql
-- See all policies on questions table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'questions';
```

### 5. Check Browser Console
Open browser DevTools (F12) and check the console for:
- User role detection
- Direct query count
- Error messages
- RLS error codes

## Expected Console Output (When Working)

```
=== DEBUG: User Authentication ===
User: { id: '...', email: '...' }
Detected Role: admin
=== DEBUG: Direct Query Test ===
Direct Query Count: 60
=== DEBUG: Fetching Questions with Join ===
Questions Query Response: { dataLength: 60, ... }
✅ Successfully loaded 60 questions
```

## If Still Not Working

1. **Check the debug panel** on the question bank page - it shows:
   - Your user role
   - Direct query count
   - Questions loaded count

2. **If Direct Query Count > 0 but Questions Loaded = 0:**
   - RLS is definitely blocking
   - Try Solution 3 (allow role checks)

3. **If Direct Query Count = 0:**
   - Questions don't exist in database
   - Run the sample questions SQL file

4. **If Role is not 'admin':**
   - Update your user in user_profiles:
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE user_id = 'your-user-id';
   ```

## Contact
If none of these solutions work, check the browser console output and share:
- The debug information from the page
- The console logs
- The error messages (if any)

