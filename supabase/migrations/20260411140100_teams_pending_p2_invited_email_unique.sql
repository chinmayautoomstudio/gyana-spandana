-- One active pending P2 invitation per normalized email.
-- Fails if multiple pending teams invite the same address (e.g. reciprocal invites).
-- Before applying (CLI or MCP apply_migration), find conflicts:
--   SELECT lower(trim(both from p2_invited_email)) AS e, COUNT(*)
--   FROM teams
--   WHERE status = 'pending_p2'
--     AND p2_invited_email IS NOT NULL
--     AND trim(both from p2_invited_email) <> ''
--     AND invitation_used_at IS NULL
--   GROUP BY 1 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_pending_p2_invited_email_lower
ON teams (lower(trim(both from p2_invited_email)))
WHERE status = 'pending_p2'
  AND p2_invited_email IS NOT NULL
  AND trim(both from p2_invited_email) <> ''
  AND invitation_used_at IS NULL;
