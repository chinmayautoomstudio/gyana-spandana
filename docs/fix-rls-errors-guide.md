# Fix RLS Policy Errors Guide

This guide helps you fix the "new row violates row-level security policy" errors that occur when:
1. Uploading profile photos (Storage bucket RLS error)
2. Updating participant profile data (Database table RLS error)

## Quick Fix Summary

You need to run **two SQL scripts** in your Supabase SQL Editor:

1. **Storage Bucket RLS**: `docs/fix-storage-bucket-rls.sql`
2. **Database Table RLS**: `docs/fix-participants-update-rls.sql`

## Step-by-Step Instructions

### Step 1: Fix Storage Bucket RLS Policies

The storage bucket needs RLS policies to allow authenticated users to upload files.

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file `docs/fix-storage-bucket-rls.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Verify you see 4 policies created in the results

**What this fixes:**
- Allows authenticated users to upload profile photos
- Allows public read access to profile photos
- Allows users to update/delete their own photos

### Step 2: Fix Database Table RLS Policy

The participants table UPDATE policy is missing the `WITH CHECK` clause.

1. In the same **SQL Editor** (or open a new query)
2. Open the file `docs/fix-participants-update-rls.sql`
3. Copy and paste the entire SQL script into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify you see the policy with both `USING` and `WITH CHECK` clauses

**What this fixes:**
- Allows users to update their own participant records
- Ensures both the existing row and new values pass RLS checks

### Step 3: Verify Storage Bucket Exists

Before running the storage RLS script, ensure the bucket exists:

1. Go to **Storage** in Supabase Dashboard
2. Check if `profile-photos` bucket exists
3. If it doesn't exist:
   - Click **New bucket**
   - Name: `profile-photos`
   - **Public bucket**: ✅ Enable (checked)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`
   - Click **Create bucket**

### Step 4: Test the Fix

After running both SQL scripts:

1. **Test Profile Photo Upload:**
   - Log in as a participant
   - Go to profile edit page
   - Try uploading a profile photo
   - Should work without RLS errors

2. **Test Profile Update:**
   - Fill in additional profile information (address, class, etc.)
   - Click Save
   - Should work without RLS errors

## Troubleshooting

### Error: "Bucket not found"
- **Solution**: Create the `profile-photos` bucket in Storage (see Step 3)

### Error: "Policy already exists"
- **Solution**: The script includes `DROP POLICY IF EXISTS`, so this shouldn't happen. If it does, manually drop the policy first.

### Error: "new row violates row-level security policy" (still occurring)
- **Solution**: 
  1. Verify both SQL scripts ran successfully
  2. Check that you're logged in as an authenticated user
  3. Verify the user_id in the participants table matches auth.uid()
  4. Check the Supabase logs for more details

### Storage Upload Still Failing
- **Check file path pattern**: Should be `profile-photos/{userId}-{timestamp}.{ext}`
- **Verify bucket is public**: Go to Storage → profile-photos → Settings → Public bucket should be enabled
- **Check RLS policies**: Go to Storage → profile-photos → Policies → Should see 4 policies

### Database Update Still Failing
- **Verify policy exists**: Run the verification query in `fix-participants-update-rls.sql`
- **Check user authentication**: Ensure the user is properly authenticated
- **Verify participant record exists**: The user should have a record in the participants table

## Understanding the Errors

### Storage Bucket RLS Error
When you upload a file to Supabase Storage, Supabase checks RLS policies on the `storage.objects` table. If no policy allows the INSERT operation, you get "new row violates row-level security policy".

**Fix**: Create policies that allow authenticated users to INSERT files where the filename matches their user ID.

### Database Table RLS Error
When you UPDATE a row in the participants table, Supabase checks:
1. **USING clause**: Can this existing row be updated? (Must match user_id)
2. **WITH CHECK clause**: Are the new values valid? (Must match user_id)

**Fix**: Add the missing `WITH CHECK` clause to the UPDATE policy.

## Files Reference

- `docs/fix-storage-bucket-rls.sql` - Storage bucket RLS policies
- `docs/fix-participants-update-rls.sql` - Database table RLS policy fix
- `docs/storage-setup.md` - Complete storage setup guide

## Need More Help?

If errors persist after running both scripts:
1. Check Supabase logs in Dashboard → Logs
2. Verify authentication is working (check cookies/session)
3. Ensure the user has a participant record in the database
4. Check that user_id in participants table matches the authenticated user's ID

