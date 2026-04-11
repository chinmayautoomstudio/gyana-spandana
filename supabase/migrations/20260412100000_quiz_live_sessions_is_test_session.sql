-- Flag quiz sessions created for smoke testing (partial team slots, adjusted pass rotation)
ALTER TABLE quiz_live_sessions
  ADD COLUMN IF NOT EXISTS is_test_session BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN quiz_live_sessions.is_test_session IS 'When true, session may use fewer than four team_slots; mark_wrong_pass rotates only occupied labels.';
