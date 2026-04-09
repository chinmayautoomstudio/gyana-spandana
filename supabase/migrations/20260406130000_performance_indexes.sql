-- Performance indexes for frequently filtered/joined columns (dashboard + admin queries)
-- Use IF NOT EXISTS for idempotent applies

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_team_id ON participants(team_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_start ON exams(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_exams_scheduled_end ON exams(scheduled_end);
-- Composite for updateExamStatuses-style filters
CREATE INDEX IF NOT EXISTS idx_exams_status_scheduled_start ON exams(status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_exams_status_scheduled_end ON exams(status, scheduled_end);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_participant_id ON exam_attempts(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_status ON exam_attempts(exam_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_level ON questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_set_questions_question_set_id ON question_set_questions(question_set_id);
