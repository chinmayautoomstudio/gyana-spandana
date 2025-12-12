-- ============================================================================
-- Migration Script: Create exam_participants Table for Bulk Exam Creation
-- ============================================================================
-- 
-- PURPOSE: This script creates the exam_participants junction table to manage
--          participant assignments to exams, enabling bulk exam creation with
--          restricted access control.
--
-- WHEN TO RUN: Run this in your Supabase SQL Editor AFTER running the base
--              database-schema.sql and database-exam-schema.sql
--
-- IMPORTANT: This migration enables the bulk exam creation feature where
--            admins can assign specific participants to exams.
--
-- ============================================================================

-- Create exam_participants junction table
CREATE TABLE IF NOT EXISTS exam_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(exam_id, participant_id) -- Prevent duplicate assignments
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam_id ON exam_participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_participant_id ON exam_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_assigned_by ON exam_participants(assigned_by);

-- Enable Row Level Security
ALTER TABLE exam_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- RLS Policy: Admins can manage all participant assignments
CREATE POLICY "Admins can manage exam participants"
  ON exam_participants FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
  );

-- RLS Policy: Participants can view their own assignments
CREATE POLICY "Participants can view own exam assignments"
  ON exam_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = exam_participants.participant_id
      AND participants.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE exam_participants IS 'Junction table managing participant assignments to exams for bulk exam creation feature';
COMMENT ON COLUMN exam_participants.exam_id IS 'Reference to the exam';
COMMENT ON COLUMN exam_participants.participant_id IS 'Reference to the participant';
COMMENT ON COLUMN exam_participants.assigned_at IS 'Timestamp when participant was assigned to exam';
COMMENT ON COLUMN exam_participants.assigned_by IS 'Admin user who made the assignment';

