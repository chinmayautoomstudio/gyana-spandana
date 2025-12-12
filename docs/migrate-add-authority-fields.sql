-- Migration: Add School Authority fields to teams table
-- Run this in your Supabase SQL Editor if you already have an existing teams table

-- Add authority columns to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS authority_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS authority_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS authority_phone VARCHAR(10);

-- Make authority_phone required (NOT NULL)
-- Note: If you have existing records, you'll need to update them first
-- ALTER TABLE teams ALTER COLUMN authority_phone SET NOT NULL;

-- Add phone format constraint for authority phone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_authority_phone_format'
  ) THEN
    ALTER TABLE teams 
    ADD CONSTRAINT check_authority_phone_format 
    CHECK (authority_phone ~ '^[6-9]\d{9}$');
  END IF;
END $$;

