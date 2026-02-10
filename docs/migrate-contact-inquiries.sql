-- Contact Inquiries Table
-- This table stores all contact form submissions from the website

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to insert contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Allow admins to view all contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Allow admins to update contact inquiries" ON contact_inquiries;

-- RLS Policy: Allow anyone to submit contact form (INSERT)
CREATE POLICY "Allow public to insert contact inquiries"
  ON contact_inquiries FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Only admins can view contact inquiries
CREATE POLICY "Allow admins to view all contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can update contact inquiries
CREATE POLICY "Allow admins to update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_contact_inquiries_updated_at ON contact_inquiries;
CREATE TRIGGER update_contact_inquiries_updated_at BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
