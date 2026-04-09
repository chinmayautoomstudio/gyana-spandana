-- Public competition leaderboard: exam visibility flag + RLS for anon/authenticated reads.
-- Complements existing admin-only policy on team_scores (policies are OR'd for SELECT).

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS public_leaderboard_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exams.public_leaderboard_visible IS
  'When true, team scores for this exam are readable by anonymous users on /competition/leaderboard';

-- Catalog: list exams that are published to the public leaderboard
DROP POLICY IF EXISTS "public_read_exams_leaderboard_catalog" ON public.exams;
CREATE POLICY "public_read_exams_leaderboard_catalog"
  ON public.exams
  FOR SELECT
  TO anon, authenticated
  USING (
    public_leaderboard_visible = true
    AND status IN ('active', 'completed')
  );

-- Scores: only for exams published to the public leaderboard
DROP POLICY IF EXISTS "public_read_team_scores_visible_exam" ON public.team_scores;
CREATE POLICY "public_read_team_scores_visible_exam"
  ON public.team_scores
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = team_scores.exam_id
        AND e.public_leaderboard_visible = true
        AND e.status IN ('active', 'completed')
    )
  );

-- Enable postgres_changes for Realtime (no-op if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'team_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_scores;
  END IF;
END $$;
