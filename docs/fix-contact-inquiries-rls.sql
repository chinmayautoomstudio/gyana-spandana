-- Alternative Fix: Use anon role for public contact form submissions
-- Run this if the previous fix didn't work

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to insert contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Allow admins to view all contact inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "Allow admins to update contact inquiries" ON contact_inquiries;

-- Create INSERT policy for anonymous (unauthenticated) users
CREATE POLICY "Allow anonymous to insert contact inquiries"
  ON contact_inquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert (just in case)
CREATE POLICY "Allow authenticated to insert contact inquiries"
  ON contact_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create SELECT policy for admins only
CREATE POLICY "Allow admins to view all contact inquiries"
  ON contact_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create UPDATE policy for admins only
CREATE POLICY "Allow admins to update contact inquiries"
  ON contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
