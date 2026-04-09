-- Add question type/media support for quiz live rounds

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'mcq'
    CHECK (question_type IN ('mcq', 'true_false', 'visual_image', 'visual_video')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS correct_answer_tf VARCHAR(10)
    CHECK (correct_answer_tf IN ('TRUE', 'FALSE'));

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

