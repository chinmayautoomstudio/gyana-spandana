-- Submit flow: AFTER UPDATE trigger calls calculate_team_scores, which DELETE/INSERTs team_scores.
-- Without SECURITY DEFINER, those statements run as the participant (invoker) and hit RLS on team_scores.

CREATE OR REPLACE FUNCTION update_team_scores_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    PERFORM calculate_team_scores(NEW.exam_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_team_scores_on_submit() IS
  'Runs team score recompute as definer so team_scores RLS does not block participant submits.';
