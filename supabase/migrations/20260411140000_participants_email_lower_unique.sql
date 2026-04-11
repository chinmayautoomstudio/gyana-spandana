-- Case-insensitive uniqueness for participant emails.
-- Apply with Supabase CLI (`supabase db push`) or MCP `apply_migration`.
-- Idempotent: safe if already applied via MCP under another migration name.
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_email_lower
ON participants (lower(email));
