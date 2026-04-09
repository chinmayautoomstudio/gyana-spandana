-- Ensure leaderboard tables work with Supabase Realtime (postgres_changes).
-- RLS still applies: quiz_session_scores readable by all for public boards;
-- team_scores SELECT only for admins via check_is_admin().

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN coalesce(user_role, '') = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN coalesce((auth.jwt() -> 'user_metadata' ->> 'role')::text, '') = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

ALTER TABLE public.quiz_session_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_session_scores_read" ON public.quiz_session_scores;
CREATE POLICY "quiz_session_scores_read"
  ON public.quiz_session_scores
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_session_scores_admin_host_write" ON public.quiz_session_scores;
CREATE POLICY "quiz_session_scores_admin_host_write"
  ON public.quiz_session_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM quiz_live_sessions s
      LEFT JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE s.id = quiz_session_scores.session_id
        AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quiz_live_sessions s
      LEFT JOIN user_profiles up ON up.user_id = auth.uid()
      WHERE s.id = quiz_session_scores.session_id
        AND (up.role = 'admin' OR s.assigned_host_id = auth.uid())
    )
  );

ALTER TABLE public.team_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view team scores" ON public.team_scores;
CREATE POLICY "Only admins can view team scores"
  ON public.team_scores
  FOR SELECT
  USING (public.check_is_admin());
