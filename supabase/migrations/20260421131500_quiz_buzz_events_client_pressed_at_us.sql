-- High-precision client press time (epoch microseconds) for deterministic all-team buzzer ordering.

ALTER TABLE public.quiz_buzz_events
  ADD COLUMN IF NOT EXISTS client_pressed_at_us bigint;

UPDATE public.quiz_buzz_events
SET client_pressed_at_us = client_pressed_at_ms * 1000
WHERE client_pressed_at_us IS NULL
  AND client_pressed_at_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_buzz_events_question_client_time_us
  ON public.quiz_buzz_events (question_event_id, client_pressed_at_us, client_pressed_at_ms, buzzed_at);
