-- Buzzer round: 30s answer deadline per question event; session hint for next directed team after timeout
ALTER TABLE public.quiz_question_events
  ADD COLUMN IF NOT EXISTS buzzer_answer_deadline_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quiz_question_events.buzzer_answer_deadline_at IS
  'When set and status is buzzer_open, active buzzer team must answer before this instant (server time).';

ALTER TABLE public.quiz_live_sessions
  ADD COLUMN IF NOT EXISTS buzzer_next_directed_team VARCHAR(1)
    CHECK (buzzer_next_directed_team IS NULL OR buzzer_next_directed_team IN ('A', 'B', 'C', 'D'));

COMMENT ON COLUMN public.quiz_live_sessions.buzzer_next_directed_team IS
  'After a buzzer answer timeout, next reveal_question in a buzzer round defaults directed_team here until consumed.';
