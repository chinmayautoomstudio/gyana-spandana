-- Migration: Add invitation tracking to teams table for two-step registration
-- Run this in your Supabase SQL Editor
-- P1 creates team and invites P2; P2 registers via unique link.

-- 1. Add invitation and status columns to teams
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS p2_invited_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invitation_used_at TIMESTAMP WITH TIME ZONE;

-- Add status column with default for existing rows; new rows get pending_p2
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'status'
  ) THEN
    ALTER TABLE teams ADD COLUMN status VARCHAR(20) DEFAULT 'complete';
    UPDATE teams SET status = 'complete' WHERE status IS NULL;
    ALTER TABLE teams ALTER COLUMN status SET DEFAULT 'pending_p2';
    ALTER TABLE teams ADD CONSTRAINT teams_status_check CHECK (status IN ('pending_p2', 'complete'));
  END IF;
END $$;

-- Make authority_phone nullable (optional authority)
ALTER TABLE teams ALTER COLUMN authority_phone DROP NOT NULL;

-- Drop check constraint on authority_phone if it exists (allow NULL)
ALTER TABLE teams DROP CONSTRAINT IF EXISTS check_authority_phone_format;
ALTER TABLE teams ADD CONSTRAINT check_authority_phone_format
  CHECK (authority_phone IS NULL OR authority_phone ~ '^[6-9]\d{9}$');

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_teams_invitation_token ON teams(invitation_token) WHERE invitation_token IS NOT NULL;

-- 2. Allow P1 participant to have minimal data initially (phone, aadhar, class, gender nullable)
ALTER TABLE participants ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE participants ALTER COLUMN aadhar DROP NOT NULL;
ALTER TABLE participants ALTER COLUMN class DROP NOT NULL;
ALTER TABLE participants ALTER COLUMN gender DROP NOT NULL;

-- Relax unique constraints: allow multiple NULLs (PostgreSQL allows this by default)
-- If your schema has UNIQUE on phone/aadhar, NULLs are already allowed; no change needed.

COMMENT ON COLUMN teams.invitation_token IS 'Unique token for P2 invitation link';
COMMENT ON COLUMN teams.p2_invited_email IS 'Email address invitation was sent to';
COMMENT ON COLUMN teams.status IS 'pending_p2 = waiting for P2 to register, complete = both participants registered';
