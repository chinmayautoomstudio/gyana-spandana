-- Create Admin User SQL Script
-- 
-- This script sets the admin role for an existing user in Supabase Auth.
-- 
-- IMPORTANT: This script assumes the user already exists in Supabase Auth.
-- If the user doesn't exist, you need to create them first using one of these methods:
--
-- Method 1: Supabase Dashboard
--   1. Go to Authentication > Users
--   2. Click "Add User" or "Invite User"
--   3. Enter email: chinmay.nayak@autoomstudio.com
--   4. Set password: Chinmay@2000
--   5. Confirm email (check "Auto Confirm User")
--   6. Then run this SQL script
--
-- Method 2: Use the Node.js script (recommended)
--   Run: npx tsx scripts/create-admin-user.ts
--   This will create the user and set the admin role automatically.
--
-- After running this script, the user will be able to:
--   - Login at /login with email: chinmay.nayak@autoomstudio.com
--   - Access the admin dashboard at /admin
--   - Manage exams, questions, and participants

-- Step 1: Update user metadata to set admin role and name
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"'
    ),
    '{name}',
    '"Chinmay Kumar Nayak"'
  )
WHERE email = 'chinmay.nayak@autoomstudio.com';

-- Step 2: Create or update user_profiles record (primary source for roles)
INSERT INTO user_profiles (user_id, role, name)
SELECT 
  id,
  'admin',
  'Chinmay Kumar Nayak'
FROM auth.users
WHERE email = 'chinmay.nayak@autoomstudio.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  name = 'Chinmay Kumar Nayak',
  updated_at = NOW();

-- Step 3: Verify the update
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'name' as metadata_name,
  u.raw_user_meta_data->>'role' as metadata_role,
  p.role as profile_role,
  p.name as profile_name,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'chinmay.nayak@autoomstudio.com';

-- If the user doesn't exist, you'll see no rows returned.
-- In that case, create the user first using Supabase Dashboard or the Node.js script.

