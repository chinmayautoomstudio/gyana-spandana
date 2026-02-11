# Supabase Storage Setup for Profile Photos

This guide explains how to set up Supabase Storage for profile photo uploads.

## Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `profile-photos`
   - **Public bucket**: ✅ Enable (checked) - This allows public read access to profile photos
   - **File size limit**: 5 MB (recommended)
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`
5. Click **Create bucket**

## Step 2: Set Up Row Level Security (RLS) Policies

After creating the bucket, you need to set up RLS policies to control who can upload and read files.

### Policy 1: Allow Authenticated Users to Upload Their Own Photos

Run this SQL in the Supabase SQL Editor:

```sql
-- Policy: Users can upload their own profile photos
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = 'profile-photos' AND
  (storage.foldername(name))[2] = (auth.uid()::text || '-%')
);
```

### Policy 2: Allow Public Read Access

Run this SQL in the Supabase SQL Editor:

```sql
-- Policy: Public can read profile photos
CREATE POLICY "Public can read profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
```

### Policy 3: Allow Users to Update Their Own Photos

Run this SQL in the Supabase SQL Editor:

```sql
-- Policy: Users can update their own profile photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '-%')
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '-%')
);
```

### Policy 4: Allow Users to Delete Their Own Photos

Run this SQL in the Supabase SQL Editor:

```sql
-- Policy: Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '-%')
);
```

## Step 3: Verify Storage Setup

1. Go to **Storage** → **profile-photos** bucket
2. Check that the bucket is marked as **Public**
3. Verify that RLS policies are enabled (you should see the policies listed)

## Step 4: Test Upload (Optional)

You can test the upload functionality by:

1. Logging in as a participant
2. Completing the profile form
3. Uploading a profile photo
4. Verifying the photo appears in the Storage bucket and on the dashboard

## Troubleshooting

### Error: "new row violates row-level security policy"

**Solution**: Make sure all RLS policies are correctly set up. Check that:
- The bucket name matches exactly: `profile-photos`
- The user is authenticated
- The file path follows the pattern: `profile-photos/{userId}-{timestamp}.{ext}`

### Error: "Bucket not found"

**Solution**: 
- Verify the bucket name is exactly `profile-photos`
- Make sure the bucket exists in your Supabase project
- Check that you're using the correct project

### Photos not displaying

**Solution**:
- Verify the bucket is set to **Public**
- Check that the `profile_photo_url` is correctly stored in the database
- Verify the URL is accessible (try opening it in a new tab)
- Check browser console for CORS errors

### Upload fails with "File too large"

**Solution**:
- Verify the file size is under 5MB
- Check the bucket's file size limit setting
- Consider compressing images before upload

## File Naming Convention

Profile photos are stored with the following naming pattern:
```
profile-photos/{userId}-{timestamp}.{extension}
```

Example:
```
profile-photos/123e4567-e89b-12d3-a456-426614174000-1699123456789.jpg
```

This ensures:
- Each user's photos are uniquely identified
- Easy to identify which user owns which photo
- No filename conflicts

## Security Notes

1. **Public Read Access**: Profile photos are publicly readable. If you need private photos, remove the public read policy and implement signed URLs instead.

2. **Upload Restrictions**: Only authenticated users can upload, and they can only upload files that match their user ID in the filename.

3. **File Type Validation**: The application validates file types on the client side, but you should also configure MIME type restrictions in the bucket settings.

4. **File Size Limits**: Configure appropriate file size limits in both the bucket settings and application validation.

## Alternative: Private Bucket with Signed URLs

If you prefer private profile photos, you can:

1. Create the bucket as **Private** (uncheck "Public bucket")
2. Remove the public read policy
3. Generate signed URLs when displaying photos:

```typescript
// In your server action or API route
const { data } = supabase.storage
  .from('profile-photos')
  .createSignedUrl(filePath, 3600) // URL valid for 1 hour

return data?.signedUrl
```

This approach provides better privacy but requires additional implementation for URL generation and expiration handling.

