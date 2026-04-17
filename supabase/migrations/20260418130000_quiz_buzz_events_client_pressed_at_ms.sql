-- Client-side press time (epoch ms) for fair buzz ordering when network arrival order differs from physical press order.

ALTER TABLE public.quiz_buzz_events
  ADD COLUMN IF NOT EXISTS client_pressed_at_ms bigint;

UPDATE public.quiz_buzz_events
SET client_pressed_at_ms = (EXTRACT(EPOCH FROM buzzed_at) * 1000)::bigint
WHERE client_pressed_at_ms IS NULL;

ALTER TABLE public.quiz_buzz_events
  ALTER COLUMN client_pressed_at_ms SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_buzz_events_question_client_time
  ON public.quiz_buzz_events (question_event_id, client_pressed_at_ms, buzzed_at);
