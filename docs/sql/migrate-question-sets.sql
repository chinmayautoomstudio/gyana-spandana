-- ============================================================================
-- Migration Script: Create Question Paper Sets Tables
-- ============================================================================
-- 
-- PURPOSE: This script creates the question_sets and question_set_questions
--          tables to enable reusable question paper sets for exam creation.
--
-- WHEN TO RUN: Run this in your Supabase SQL Editor AFTER running the base
--              database-schema.sql and database-exam-schema.sql
--
-- IMPORTANT: This migration enables question paper sets feature where admins
--            can create reusable collections of questions.
--
-- ============================================================================

-- Create question_sets table
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_questions INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_set_questions junction table
CREATE TABLE IF NOT EXISTS question_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_set_id, question_id) -- Prevent duplicate questions in same set
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_question_sets_created_by ON question_sets(created_by);
CREATE INDEX IF NOT EXISTS idx_question_set_questions_set_id ON question_set_questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_question_set_questions_question_id ON question_set_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_question_set_questions_order ON question_set_questions(question_set_id, order_index);

-- Enable Row Level Security
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_set_questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- RLS Policy: Admins can manage all question sets
CREATE POLICY "Admins can manage question sets"
  ON question_sets FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Admins can manage question set questions
CREATE POLICY "Admins can manage question set questions"
  ON question_set_questions FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update total_questions count in question_sets table
CREATE OR REPLACE FUNCTION update_question_set_question_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE question_sets
  SET total_questions = (
    SELECT COUNT(*) FROM question_set_questions WHERE question_set_id = COALESCE(NEW.question_set_id, OLD.question_set_id)
  )
  WHERE id = COALESCE(NEW.question_set_id, OLD.question_set_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update total_questions count when questions are added/removed
CREATE TRIGGER trigger_update_question_set_question_count
  AFTER INSERT OR DELETE ON question_set_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_set_question_count();

-- Function to update updated_at timestamp
CREATE TRIGGER update_question_sets_updated_at BEFORE UPDATE ON question_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE question_sets IS 'Reusable question paper sets that can be used for exam creation';
COMMENT ON COLUMN question_sets.name IS 'Name of the question set';
COMMENT ON COLUMN question_sets.description IS 'Optional description of the question set';
COMMENT ON COLUMN question_sets.total_questions IS 'Total number of questions in the set (auto-updated)';
COMMENT ON COLUMN question_sets.created_by IS 'Admin user who created the question set';

COMMENT ON TABLE question_set_questions IS 'Junction table linking questions to question sets';
COMMENT ON COLUMN question_set_questions.order_index IS 'Order of question within the set';

