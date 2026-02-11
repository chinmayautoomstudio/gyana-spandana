-- Fix Storage Bucket RLS Policies for profile-photos
-- This script sets up proper RLS policies to allow authenticated users to upload profile photos

-- First, ensure the bucket exists (create it manually in Supabase Dashboard if it doesn't)
-- Bucket name: profile-photos
-- Public bucket: Enabled (checked)
-- File size limit: 5 MB
-- Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;

-- Policy 1: Allow Authenticated Users to Upload Their Own Photos
-- This policy allows users to upload files where the path starts with profile-photos/ and filename starts with their user ID
-- File path pattern: profile-photos/{userId}-{timestamp}.{ext}
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  name LIKE 'profile-photos/' || auth.uid()::text || '-%'
);

-- Policy 2: Allow Public Read Access (since bucket is public)
CREATE POLICY "Public can read profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Policy 3: Allow Users to Update Their Own Photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  name LIKE 'profile-photos/' || auth.uid()::text || '-%'
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  name LIKE 'profile-photos/' || auth.uid()::text || '-%'
);

-- Policy 4: Allow Users to Delete Their Own Photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  name LIKE 'profile-photos/' || auth.uid()::text || '-%'
);

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%profile%'
ORDER BY policyname;

-- Note: The file path pattern should be: profile-photos/{userId}-{timestamp}.{ext}
-- Example: profile-photos/123e4567-e89b-12d3-a456-426614174000-1699123456789.jpg

