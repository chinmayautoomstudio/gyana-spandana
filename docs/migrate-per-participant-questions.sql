-- Migration: Add per-participant question randomization support
-- This migration adds support for randomizing questions per participant
-- Run this in your Supabase SQL Editor

-- Step 1: Add questions_per_participant column to exams table
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS questions_per_participant INTEGER NULL;

-- Add comment for documentation
COMMENT ON COLUMN exams.questions_per_participant IS 
  'Number of questions each participant should get. NULL means all questions from pool (just shuffled)';

-- Step 2: Add question_ids column to exam_attempts table
ALTER TABLE exam_attempts 
ADD COLUMN IF NOT EXISTS question_ids JSONB NULL;

-- Add comment for documentation
COMMENT ON COLUMN exam_attempts.question_ids IS 
  'Array of question IDs assigned to this participant''s attempt. Stored as JSONB array of UUIDs. Ensures consistency on refresh/resume';

-- Step 3: Add index on question_ids for performance (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_exam_attempts_question_ids 
ON exam_attempts USING GIN (question_ids);

-- Step 4: Add check constraint to ensure questions_per_participant is positive if not NULL
ALTER TABLE exams 
ADD CONSTRAINT check_questions_per_participant_positive 
CHECK (questions_per_participant IS NULL OR questions_per_participant > 0);

-- Verification queries (optional - run to verify migration)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'exams' AND column_name = 'questions_per_participant';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'exam_attempts' AND column_name = 'question_ids';
