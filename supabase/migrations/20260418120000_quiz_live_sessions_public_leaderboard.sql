-- Public competition leaderboard: allow anon/authenticated to list quiz sessions
-- explicitly published for the public board (mirrors exams.public_leaderboard_visible).

ALTER TABLE public.quiz_live_sessions
  ADD COLUMN IF NOT EXISTS public_leaderboard_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.quiz_live_sessions.public_leaderboard_visible IS
  'When true, this session may appear on the public competition leaderboard (anon/authenticated catalog read).';

DROP POLICY IF EXISTS "public_read_quiz_live_sessions_leaderboard_catalog" ON public.quiz_live_sessions;
CREATE POLICY "public_read_quiz_live_sessions_leaderboard_catalog"
  ON public.quiz_live_sessions
  FOR SELECT
  TO anon, authenticated
  USING (
    public_leaderboard_visible = true
    AND status IN ('active', 'completed')
  );
