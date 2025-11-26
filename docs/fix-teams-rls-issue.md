# RLS Policy Fix for Team Registration

## Issue
When attempting to register a team, users encounter the following error:
```
new row violates row-level security policy for table "teams"
```

## Root Cause
The `teams` table has Row Level Security (RLS) enabled, but only has a SELECT policy defined. There is **no INSERT policy**, which prevents the registration process from creating new teams.

### Current Schema (Problematic)
```sql
-- RLS Policy: Public can view teams (for leaderboard)
CREATE POLICY "Public can view teams"
  ON teams FOR SELECT
  USING (true);
```

## Solution
Add an INSERT policy to the `teams` table to allow team creation during registration.

### SQL Fix
Run this in your Supabase SQL Editor:

```sql
-- Add INSERT policy for teams table
CREATE POLICY "Allow team creation during registration"
  ON teams FOR INSERT
  WITH CHECK (true);
```

### Alternative (More Restrictive)
If you want to restrict team creation to authenticated users only:

```sql
CREATE POLICY "Allow authenticated users to create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## How to Apply the Fix

### Option 1: Quick Fix (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `docs/fix-teams-rls-policy.sql`
4. Test registration again

### Option 2: Full Schema Update
1. Drop all existing policies and tables (⚠️ **WARNING: This will delete all data**)
2. Run the updated `docs/database-schema.sql` which now includes the INSERT policy

## Verification
After applying the fix, test the registration flow:
1. Navigate to http://localhost:3000/register
2. Fill out the registration form with valid data
3. Submit the form
4. Registration should complete successfully without RLS errors

## Updated Schema
The `database-schema.sql` file has been updated to include this policy for future deployments.

## Related Files
- `docs/fix-teams-rls-policy.sql` - Quick fix SQL script
- `docs/database-schema.sql` - Updated full schema (line 89-92)
- `app/register/page.tsx` - Registration page that creates teams (line 107-111)

## Prevention
When creating tables with RLS enabled, always define policies for all required operations:
- SELECT (read)
- INSERT (create)
- UPDATE (modify)
- DELETE (remove)

Without these policies, operations will be blocked even if the user has the necessary permissions.
