-- ============================================
-- DROP ALL TABLES - Gyana Spandana
-- ============================================
-- This script drops all tables in the correct order
-- Run this in Supabase SQL Editor
-- ⚠️ WARNING: This will delete ALL data!
-- ============================================

-- Drop tables in reverse order of dependencies (CASCADE handles foreign keys)
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Optional: Also drop the function if you want a complete cleanup
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Verify tables are dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'participants', 'quiz_sessions', 'quiz_answers');

-- If the above query returns no rows, all tables were successfully dropped
