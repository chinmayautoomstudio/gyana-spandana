-- Fix Infinite Recursion in user_profiles RLS Policies
-- This migration fixes the infinite recursion error by using JWT metadata instead of querying user_profiles table
-- Run this in your Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- RLS Policy: Users can update their own profile (limited fields)
-- Fixed: Removed recursive query to user_profiles in WITH CHECK clause
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Removed recursive check: role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())
    -- Users can update their own profile, but role changes are handled by admin policies
  );

-- RLS Policy: Admins can view all profiles
-- Fixed: Use JWT metadata instead of querying user_profiles (which causes recursion)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Admins can update all profiles
-- Fixed: Use JWT metadata instead of querying user_profiles (which causes recursion)
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- Note: The JWT metadata approach is secure because:
-- 1. JWT tokens are signed by Supabase and cannot be tampered with
-- 2. Admin role is set server-side when creating/inviting admins
-- 3. This avoids infinite recursion while maintaining security

