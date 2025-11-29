# Admin User Setup Guide

## Overview
This guide explains how to set up admin users for the Gyana Spandana exam system.

## Setting Up Admin Role

### Method 1: Using Node.js Script (Recommended - Easiest)

This is the easiest way to create a new admin user or update an existing user to admin.

**Prerequisites:**
- Set `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` file
- You can find the service role key in Supabase Dashboard > Settings > API > service_role key

**Steps:**

1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

2. Run the admin creation script:
   ```bash
   npm run create-admin
   ```
   
   Or directly:
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```

3. The script will:
   - Create the user if they don't exist
   - Set the admin role and name in user metadata
   - Auto-confirm the email so they can login immediately
   - Display the login credentials

**Default Admin User Created:**
- Email: `chinmay.nayak@autoomstudio.com`
- Password: `Chinmay@2000`
- Name: `Chinmay Kumar Nayak`
- Role: `admin`

### Method 2: Using SQL Script

If you prefer SQL or need to update an existing user:

1. **If user doesn't exist:** Create the user first in Supabase Dashboard (Authentication > Users > Add User)
2. Run the SQL script in Supabase SQL Editor:
   - See `docs/create-admin-user.sql` for the complete script
   - Or use the SQL from Method 3 below

### Method 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Find the user you want to make an admin (or create a new user)
4. Click on the user to edit
5. In the **User Metadata** section, add:
   ```json
   {
     "name": "Chinmay Kumar Nayak",
     "role": "admin"
   }
   ```
6. Save the changes

### Method 4: Using SQL Directly

Run this SQL in Supabase SQL Editor:

```sql
-- Update existing user to admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
  ),
  '{name}',
  '"Chinmay Kumar Nayak"'
)
WHERE email = 'chinmay.nayak@autoomstudio.com';
```

**Note:** This only works if the user already exists. To create a new user, use Method 1 (script) or create them in the Dashboard first.

## Default Role

- All new users default to `participant` role
- Only users with `role: "admin"` in their user metadata can access admin routes

## Admin Features

Once a user has admin role, they can:
- Create and manage exams
- Add/edit/delete questions
- Schedule exams
- View all participants
- View real-time leaderboard
- Change exam status (draft → scheduled → active → completed)

## Security Notes

- Admin routes are protected by middleware
- RLS policies ensure only admins can manage exams and questions
- Leaderboard is only visible to admins
- Participants can only view scheduled/active exams

## Testing Admin Access

1. Set a user's role to "admin" using one of the methods above
2. Log in with that user's credentials
3. You should be redirected to `/admin` dashboard
4. If you see the admin sidebar, the setup is successful

