-- Ensure team_scores recomputation is installed in runtime migrations
-- and not only in docs/sql scripts.

CREATE OR REPLACE FUNCTION calculate_team_scores(exam_uuid UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM team_scores WHERE exam_id = exam_uuid;

  INSERT INTO team_scores (exam_id, team_id, participant1_score, participant2_score, total_team_score)
  SELECT
    exam_uuid,
    t.id AS team_id,
    COALESCE(p1_scores.score, 0) AS participant1_score,
    COALESCE(p2_scores.score, 0) AS participant2_score,
    COALESCE(p1_scores.score, 0) + COALESCE(p2_scores.score, 0) AS total_team_score
  FROM teams t
  LEFT JOIN (
    SELECT
      p.team_id,
      ea.score
    FROM participants p
    JOIN exam_attempts ea ON ea.participant_id = p.id
    WHERE p.is_participant1 = true
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  ) p1_scores ON p1_scores.team_id = t.id
  LEFT JOIN (
    SELECT
      p.team_id,
      ea.score
    FROM participants p
    JOIN exam_attempts ea ON ea.participant_id = p.id
    WHERE p.is_participant1 = false
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  ) p2_scores ON p2_scores.team_id = t.id
  WHERE EXISTS (
    SELECT 1
    FROM exam_attempts ea
    JOIN participants p ON p.id = ea.participant_id
    WHERE p.team_id = t.id
      AND ea.exam_id = exam_uuid
      AND ea.status = 'submitted'
  );

  UPDATE team_scores ts
  SET rank = ranked.rank
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY total_team_score DESC, last_updated ASC) AS rank
    FROM team_scores
    WHERE exam_id = exam_uuid
  ) ranked
  WHERE ts.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_team_scores_on_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    PERFORM calculate_team_scores(NEW.exam_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_team_scores ON exam_attempts;
CREATE TRIGGER trigger_update_team_scores
  AFTER UPDATE ON exam_attempts
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' AND OLD.status != 'submitted')
  EXECUTE FUNCTION update_team_scores_on_submit();

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT exam_id
    FROM exam_attempts
    WHERE status = 'submitted'
      AND exam_id IS NOT NULL
  LOOP
    PERFORM calculate_team_scores(rec.exam_id);
  END LOOP;
END;
$$;
