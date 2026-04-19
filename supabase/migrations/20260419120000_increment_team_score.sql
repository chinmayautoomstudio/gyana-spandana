-- Migration: Fix 4 — atomic score increment RPC
-- Replaces the SELECT→UPDATE→SELECT pattern (3 round-trips) with a single
-- server-side UPDATE that applies delta increments atomically.
-- Called by: judge_direct_answer, mark_correct, check_direct_response, rapid_fire_correct

CREATE OR REPLACE FUNCTION increment_team_score(
  p_session_id  uuid,
  p_team_label  text,
  p_score_delta int,
  p_answered_delta int,
  p_correct_delta  int
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE quiz_session_scores
  SET
    total_score        = total_score        + p_score_delta,
    questions_answered = questions_answered + p_answered_delta,
    questions_correct  = questions_correct  + p_correct_delta,
    updated_at         = now()
  WHERE session_id = p_session_id
    AND team_label = p_team_label;
$$;
