-- Make score increments fail loudly when the target score row is missing.
-- This prevents silent no-op updates that look like successful scoring.

CREATE OR REPLACE FUNCTION increment_team_score(
  p_session_id uuid,
  p_team_label text,
  p_score_delta int,
  p_answered_delta int,
  p_correct_delta int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE quiz_session_scores
  SET
    total_score        = total_score + p_score_delta,
    questions_answered = questions_answered + p_answered_delta,
    questions_correct  = questions_correct + p_correct_delta,
    updated_at         = now()
  WHERE session_id = p_session_id
    AND team_label = p_team_label;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count = 0 THEN
    RAISE EXCEPTION
      'increment_team_score target row missing for session_id=% and team_label=%',
      p_session_id, p_team_label;
  END IF;
END;
$$;
