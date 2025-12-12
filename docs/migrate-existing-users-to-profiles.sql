-- Migrate Existing Users to User Profiles
-- This script migrates existing users from user_metadata.role to user_profiles table
-- Run this AFTER running migrate-add-user-profiles.sql
-- Run this in your Supabase SQL Editor

-- Step 1: Migrate users with explicit admin role from user_metadata
INSERT INTO user_profiles (user_id, role, name, created_at, updated_at)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'role', 'participant') as role,
  raw_user_meta_data->>'name' as name,
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
  AND raw_user_meta_data->>'role' = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Migrate all other users (default to 'participant' role)
INSERT INTO user_profiles (user_id, role, name, created_at, updated_at)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'role', 'participant') as role,
  raw_user_meta_data->>'name' as name,
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify migration
-- Check counts
SELECT 
  'Total users in auth.users' as description,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Total profiles in user_profiles' as description,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'Admin users' as description,
  COUNT(*) as count
FROM user_profiles
WHERE role = 'admin'
UNION ALL
SELECT 
  'Participant users' as description,
  COUNT(*) as count
FROM user_profiles
WHERE role = 'participant';

-- Step 4: Show users without profiles (should be 0 or very few)
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as metadata_role,
  raw_user_meta_data->>'name' as metadata_name,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ORDER BY created_at DESC;

-- If there are users without profiles, they will be created automatically
-- when they log in or when the application checks their role

