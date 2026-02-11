-- Fix for Team Registration RLS Policy Issue
-- This script adds the missing INSERT policy for the teams table
-- Run this in your Supabase SQL Editor

-- Add INSERT policy for teams table
-- Allow anyone to insert teams (during registration)
CREATE POLICY "Allow team creation during registration"
  ON teams FOR INSERT
  WITH CHECK (true);

-- Optional: If you want to restrict team creation to authenticated users only, use this instead:
-- CREATE POLICY "Allow authenticated users to create teams"
--   ON teams FOR INSERT
--   TO authenticated
--   WITH CHECK (true);
