# Question Bank Fix Guide

## Problem
Questions were not showing in the question bank page for admin users.

## Root Cause
The RLS (Row Level Security) policy for the questions table was checking `user_metadata.role` from the JWT token, but the application uses `user_profiles.role` as the primary source for user roles.

## Solution Implemented

### 1. Fixed RLS Policy
Created a migration script (`docs/fix-questions-rls-policy.sql`) that updates the RLS policy to:
- Check `user_profiles.role` first (primary source)
- Fallback to `user_metadata.role` for backward compatibility

### 2. Enhanced Error Handling
Updated `app/admin/questions/page.tsx` to:
- Display clear error messages when questions fail to load
- Provide troubleshooting steps in the error message
- Log detailed errors to the console for debugging

### 3. Created Verification Script
Added `docs/verify-questions-database.sql` to help diagnose database issues.

## Steps to Fix

### Step 1: Run the RLS Policy Fix
1. Open your Supabase SQL Editor
2. Run the migration script: `docs/fix-questions-rls-policy.sql`
3. This will update the RLS policies to check `user_profiles.role`

### Step 2: Verify Admin User Role
Make sure your admin user has the role set in the `user_profiles` table:

```sql
-- Check if your user has admin role
SELECT up.user_id, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
WHERE au.email = 'your-admin-email@example.com';

-- If role is not 'admin', update it:
UPDATE user_profiles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com');
```

### Step 3: Verify Questions Exist
Run the verification script to check if questions exist:

```sql
-- Run: docs/verify-questions-database.sql
```

Or manually check:

```sql
SELECT COUNT(*) FROM questions;
```

### Step 4: Load Sample Questions (if needed)
If no questions exist, run the sample questions file:

1. Open Supabase SQL Editor
2. Run: `docs/sample-odisha-culture-questions-comprehensive.sql`
3. This will insert 60 sample questions about Odisha culture

### Step 5: Test the Fix
1. Log out and log back in as an admin user
2. Navigate to the question bank page (`/admin/questions`)
3. Questions should now be visible
4. If errors appear, check the error message for specific guidance

## Troubleshooting

### If questions still don't show:

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Check the Console tab for error messages
   - Look for RLS policy errors or authentication errors

2. **Verify RLS is Enabled**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'questions';
   ```
   Should show `rowsecurity = true`

3. **Check RLS Policies**
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'questions';
   ```

4. **Verify User Role**
   ```sql
   -- Check your current user's role
   SELECT role FROM user_profiles WHERE user_id = auth.uid();
   ```

5. **Test Query Manually**
   ```sql
   -- Try to select questions as your user
   SELECT COUNT(*) FROM questions;
   ```
   If this fails, the RLS policy is blocking access.

## Files Modified

1. **docs/fix-questions-rls-policy.sql** (NEW)
   - Migration script to fix RLS policies

2. **app/admin/questions/page.tsx** (MODIFIED)
   - Added error state and error display
   - Enhanced error handling in fetchData function
   - Added helpful error messages with troubleshooting steps

3. **docs/verify-questions-database.sql** (NEW)
   - Verification queries to diagnose database issues

## Additional Notes

- The fix maintains backward compatibility by checking both `user_profiles.role` and `user_metadata.role`
- Error messages now provide clear guidance on what to check
- All changes are non-breaking and safe to run in production

## Support

If issues persist after following these steps:
1. Check the browser console for detailed error messages
2. Run the verification script to check database state
3. Verify your admin user has the correct role in `user_profiles` table
4. Ensure the questions table exists and has data

