-- Ensure rapid-fire session records survive question event deletion.
-- This prevents quiz session deletion failures due to restrictive FK behavior.
ALTER TABLE public.quiz_rapid_fire_sessions
DROP CONSTRAINT IF EXISTS quiz_rapid_fire_sessions_question_event_id_fkey;

ALTER TABLE public.quiz_rapid_fire_sessions
ADD CONSTRAINT quiz_rapid_fire_sessions_question_event_id_fkey
FOREIGN KEY (question_event_id)
REFERENCES public.quiz_question_events(id)
ON DELETE SET NULL;
