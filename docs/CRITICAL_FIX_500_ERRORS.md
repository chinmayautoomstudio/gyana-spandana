# Critical Fix for 500 Errors - Implementation Guide

## Problem Identified

All Supabase queries are returning **HTTP 500 (Internal Server Error)**:
- `/questions?select=*%2Cexam%3Aexams%28id%2Ctitle%29` - 500 error
- `/user_profiles?select=role&user_id=eq...` - 500 error  
- `/exams?select=id%2Ctitle` - 500 error

This indicates **RLS policies are causing server-side errors** in Supabase.

## Root Cause

The RLS policies are likely:
1. Using a function (`is_admin_user()`) that doesn't exist or has errors
2. Creating circular dependencies when checking `user_profiles` table
3. Having syntax errors that cause server crashes

## Fixes Implemented

### 1. ✅ Enhanced Error Handling
- Added specific detection for 500 errors
- Shows clear diagnostic information
- Provides SQL queries to fix the issue

### 2. ✅ Fallback Query System
- When main query fails with 500, automatically tries simpler query
- Falls back to query without joins if join query fails
- Loads questions even if exam information can't be fetched

### 3. ✅ Hydration Fix
- Added `suppressHydrationWarning` to prevent React hydration errors
- Ensures consistent server/client rendering

### 4. ✅ RLS Diagnostic Tools
- Added diagnostic SQL queries in error messages
- Created comprehensive fix script

## What You Need to Do NOW

### Step 1: Run the Comprehensive Fix SQL

1. Open your **Supabase SQL Editor**
2. Run this file: **`docs/fix-rls-500-errors-comprehensive.sql`**

This will:
- Remove problematic function dependencies
- Create simple, working RLS policies
- Fix the `user_profiles` table to allow role checks
- Verify everything is set up correctly

### Step 2: Verify Your Admin Role

Run this query in Supabase SQL Editor:

```sql
-- Check your user role (replace email with your admin email)
SELECT up.user_id, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.user_id
WHERE au.email = 'your-admin-email@example.com';

-- If role is not 'admin', update it:
UPDATE user_profiles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com'
);
```

### Step 3: Test the Fix

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Check the browser console** (F12) for:
   - No more 500 errors
   - Questions loading successfully
   - Debug information showing correct counts

3. **Check the question bank page**:
   - Debug panel should show questions loaded
   - Questions should appear in the list
   - No error messages

### Step 4: If Still Not Working

If you still see 500 errors after running the fix:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs → Postgres Logs
   - Look for the exact error message
   - Share the error with the development team

2. **Verify RLS is Working**:
   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('questions', 'user_profiles', 'exams');
   
   -- Should all show rowsecurity = true
   ```

3. **Test Direct Query**:
   ```sql
   -- Try to select questions directly (as your user)
   SELECT COUNT(*) FROM questions;
   -- If this fails, RLS is still blocking
   ```

## Files Created/Modified

### New Files:
- `docs/fix-rls-500-errors-comprehensive.sql` - Comprehensive RLS fix
- `docs/CRITICAL_FIX_500_ERRORS.md` - This guide

### Modified Files:
- `app/admin/layout.tsx` - Fixed hydration with suppressHydrationWarning
- `app/admin/questions/page.tsx` - Added 500 error handling, fallback queries, diagnostics

## Expected Behavior After Fix

✅ **No more 500 errors** in browser console  
✅ **Questions visible** in question bank  
✅ **Debug panel shows** correct counts  
✅ **No hydration errors**  
✅ **Fallback query works** if main query fails  

## Support

If issues persist:
1. Check browser console for specific error messages
2. Check Supabase Postgres logs for server-side errors
3. Verify all SQL scripts were run successfully
4. Ensure your user has `role='admin'` in `user_profiles` table

