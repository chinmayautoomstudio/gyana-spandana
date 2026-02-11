-- Fix for Participants RLS Policy Issue
-- This script fixes the INSERT policy for the participants table
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own participant data" ON participants;

-- Step 2: Create a new policy that allows participant creation during registration
-- During registration, users are created but not yet authenticated,
-- so we need to allow INSERT without requiring auth.uid() = user_id
CREATE POLICY "Allow participant creation during registration"
  ON participants FOR INSERT
  WITH CHECK (true);
