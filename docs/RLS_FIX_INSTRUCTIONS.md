# How to Fix RLS Infinite Recursion Error (42P17)

## Problem

You're seeing these errors:
- `infinite recursion detected in policy for relation "user_profiles"`
- HTTP 500 errors on all Supabase queries
- Error code: `42P17`

This happens because RLS policies are checking `user_profiles` table, but the `user_profiles` RLS policies also check `user_profiles`, creating infinite recursion.

## Solution

Run the SQL script `docs/fix-rls-infinite-recursion-final.sql` in your Supabase SQL Editor. This script:
1. Creates a `check_is_admin()` SECURITY DEFINER function that bypasses RLS
2. Updates all RLS policies to use this function instead of direct queries
3. Removes problematic policies that cause recursion

## Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL query

### Step 2: Copy and Run the SQL Script

1. Open the file `docs/fix-rls-infinite-recursion-final.sql` in your code editor
2. Copy the **ENTIRE** contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 3: Verify the Script Ran Successfully

After running, you should see:

**Expected Output:**
- Several "DROP POLICY" messages (if policies existed)
- "CREATE FUNCTION" message confirming function creation
- Several "CREATE POLICY" messages confirming policies were created
- Four SELECT queries showing:
  - Questions Policies (should show 2 policies)
  - User Profiles Policies (should show 4 policies)
  - Exams Policies (should show 2 policies)
  - Function Check (should show the function exists with `is_security_definer = true`)

**If you see errors:**
- Note the error message
- Check that you have admin access to your Supabase project
- Ensure you're connected to the correct database/project

### Step 4: Test the Fix

1. **Refresh your browser** - Hard refresh with `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Check Browser Console** - Open DevTools (F12) and look at the Console tab
   - You should **NOT** see any more 500 errors
   - You should **NOT** see "infinite recursion detected" errors
3. **Test Admin Access:**
   - Navigate to `/admin/questions` - should load without errors
   - Navigate to `/admin/exams` - should load without errors
   - Navigate to `/admin` dashboard - should show statistics

### Step 5: Verify Function Was Created (Optional)

Run this query in SQL Editor to verify the function exists:

```sql
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  pronargs as arg_count
FROM pg_proc
WHERE proname = 'check_is_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Expected Result:**
```
function_name    | is_security_definer | arg_count
-----------------+---------------------+----------
check_is_admin   | t                   | 0
```

The `is_security_definer` should be `t` (true).

## Troubleshooting

### Still seeing 500 errors?

1. **Verify the function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'check_is_admin';
   ```
   If empty, the function wasn't created. Re-run the script.

2. **Check if policies were created:**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE tablename IN ('questions', 'user_profiles', 'exams')
   ORDER BY tablename, policyname;
   ```
   You should see:
   - `questions`: 2 policies
   - `user_profiles`: 4 policies
   - `exams`: 2 policies

3. **Check for problematic policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'user_profiles' 
   AND policyname = 'Allow role checks for RLS';
   ```
   This query should return **NO ROWS**. If it returns a row, that policy still exists and needs to be dropped.

### Still seeing infinite recursion?

1. **Clear browser cache** and hard refresh
2. **Check Supabase logs:**
   - Go to **Logs** > **Postgres Logs** in Supabase dashboard
   - Look for errors related to RLS policies
3. **Verify your user is admin:**
   ```sql
   SELECT user_id, role FROM user_profiles WHERE user_id = auth.uid();
   ```
   Replace `auth.uid()` with your actual user ID if needed. Should return `role = 'admin'`.

### Need to Rollback?

If something goes wrong, you can check what policies existed before by looking at your Supabase project's migration history. However, the script uses `DROP POLICY IF EXISTS`, so it's safe to run multiple times.

## What This Script Does

1. **Removes problematic policies** that cause recursion
2. **Creates `check_is_admin()` function** with `SECURITY DEFINER` that bypasses RLS
3. **Updates RLS policies** on:
   - `questions` table
   - `user_profiles` table  
   - `exams` table
4. **Grants execute permissions** to authenticated and anonymous users

## Important Notes

- ⚠️ **Backup First**: While this script is safe, consider backing up your database if you're in production
- ✅ **Idempotent**: The script uses `DROP POLICY IF EXISTS` and `CREATE OR REPLACE FUNCTION`, so it's safe to run multiple times
- 🔒 **Security**: The `SECURITY DEFINER` function runs with elevated privileges but only checks admin role - it doesn't expose sensitive data
- 🔄 **No Data Loss**: This script only modifies RLS policies and creates a function - it doesn't modify any table data

## After Running the Script

Once the script runs successfully:
- ✅ All 500 errors should stop
- ✅ Admin pages should load correctly
- ✅ Questions, exams, and user_profiles queries should work
- ✅ No more "infinite recursion" errors in console

## Need Help?

If you continue to see issues after running this script:
1. Check the Supabase Postgres logs for detailed error messages
2. Verify all policies were created successfully (see Step 5)
3. Ensure your user has admin role in the `user_profiles` table
4. Try clearing your browser cache and cookies

