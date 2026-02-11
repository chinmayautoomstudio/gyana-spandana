-- Migration: Add Profile Completion Fields and Gender to Participants Table
-- Run this in your Supabase SQL Editor to add profile completion fields and gender
-- This migration adds fields for profile photo, address, school address, class, date of birth, profile completion flag, and gender

-- Add new columns to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS school_address TEXT,
ADD COLUMN IF NOT EXISTS class VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add gender constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participants_gender_check'
  ) THEN
    ALTER TABLE participants
    ADD CONSTRAINT participants_gender_check 
    CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'));
  END IF;
END $$;

-- Update existing rows to have a default gender (if needed)
UPDATE participants 
SET gender = 'Prefer not to say' 
WHERE gender IS NULL;

-- Add team_code column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS team_code VARCHAR(50);

-- Make team_code unique if not already
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_code_key'
  ) THEN
    ALTER TABLE teams
    ADD CONSTRAINT teams_team_code_key UNIQUE (team_code);
  END IF;
END $$;

-- Add comment to columns for documentation
COMMENT ON COLUMN participants.profile_photo_url IS 'URL to uploaded profile photo in Supabase Storage';
COMMENT ON COLUMN participants.address IS 'Full residential address of the participant';
COMMENT ON COLUMN participants.school_address IS 'Address of the school/college';
COMMENT ON COLUMN participants.class IS 'Current class/grade (e.g., "10th", "12th", "B.Tech 2nd Year")';
COMMENT ON COLUMN participants.date_of_birth IS 'Date of birth of the participant';
COMMENT ON COLUMN participants.profile_completed IS 'Flag to track if profile completion form has been submitted';
COMMENT ON COLUMN participants.gender IS 'Gender of the participant';
COMMENT ON COLUMN teams.team_code IS 'Custom Team ID in format: GS-P1INIT-P2INIT-XXXX';

-- Note: RLS policies for UPDATE already exist and will apply to these new fields
-- The existing policy "Users can update own participant data" will allow users to update their profile

