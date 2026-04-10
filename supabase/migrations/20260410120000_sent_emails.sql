-- Audit log of transactional emails sent via SendGrid (admin-visible; service role only)

CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_type TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_emails_to_email ON sent_emails (to_email);
CREATE INDEX IF NOT EXISTS idx_sent_emails_email_type ON sent_emails (email_type);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE sent_emails IS 'Transactional email audit; accessed only via service role (admin API routes).';
