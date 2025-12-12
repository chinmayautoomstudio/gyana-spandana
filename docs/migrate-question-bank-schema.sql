-- Migration script to add optional fields to questions table for Question Bank features
-- Run this in your Supabase SQL Editor

-- Add optional fields to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance on category and difficulty
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN questions.category IS 'Optional category for organizing questions';
COMMENT ON COLUMN questions.difficulty_level IS 'Difficulty level: easy, medium, or hard';
COMMENT ON COLUMN questions.tags IS 'JSON array of tags for flexible categorization';

