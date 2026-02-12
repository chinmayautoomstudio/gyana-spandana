-- Track when registration confirmation email was sent per participant.
-- Run in Supabase SQL Editor (or via migration) before using the new admin tracking.

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS registration_email_sent_at timestamptz;

COMMENT ON COLUMN participants.registration_email_sent_at IS 'When the registration confirmation email was successfully sent to this participant.';
