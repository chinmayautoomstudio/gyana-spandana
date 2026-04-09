-- Question import batches for audit trail and "recent imports" UI
-- Run via Supabase CLI or SQL Editor

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('csv', 'xlsx', 'pdf')),
  row_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_by ON import_batches(created_by);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_import_batch_id ON questions(import_batch_id);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import_batches"
  ON import_batches FOR ALL
  USING (
    COALESCE(
      (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
      (auth.jwt() -> 'user_metadata' ->> 'role')::text,
      'participant'
    ) = 'admin'
  )
  WITH CHECK (
    COALESCE(
      (SELECT role FROM user_profiles WHERE user_id = auth.uid() LIMIT 1),
      (auth.jwt() -> 'user_metadata' ->> 'role')::text,
      'participant'
    ) = 'admin'
  );

COMMENT ON TABLE import_batches IS 'Tracks bulk question imports from CSV/XLSX/PDF';
