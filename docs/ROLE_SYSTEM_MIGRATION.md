# Role System Migration Guide

## Overview

This migration implements a proper role-based user system using a `user_profiles` table. This replaces the previous system that relied solely on `user_metadata` in Supabase Auth.

## Benefits

1. **Database-backed roles**: Roles are stored in a queryable database table
2. **Extensible**: Easy to add new user types (judges, moderators, etc.)
3. **Reliable**: Single source of truth for user roles
4. **Backward compatible**: Falls back to `user_metadata` if profile doesn't exist

## Migration Steps

### Step 1: Create User Profiles Table

Run the SQL migration script in Supabase SQL Editor:

```sql
-- Run: docs/migrate-add-user-profiles.sql
```

This creates:
- `user_profiles` table with `user_id`, `role`, and `name` fields
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update trigger for `updated_at`

### Step 2: Migrate Existing Users

Run the migration script to backfill existing users:

```sql
-- Run: docs/migrate-existing-users-to-profiles.sql
```

This script:
- Migrates users with `admin` role from `user_metadata`
- Migrates all other users with default `participant` role
- Verifies the migration with counts

### Step 3: Update Admin Users

If you have existing admin users, update the admin creation script:

```sql
-- Run: docs/create-admin-user.sql
```

This now creates/updates both `user_metadata` and `user_profiles` records.

## Code Changes

### Updated Files

1. **`lib/utils/roles.ts`**: Updated to query `user_profiles` table first, with `user_metadata` as fallback
2. **`middleware.ts`**: Checks `user_profiles` for role before participant checks
3. **`app/login/page.tsx`**: Fetches role from `user_profiles` on login
4. **`app/dashboard/page.tsx`**: Redirects admins to `/admin` if they access dashboard
5. **`app/actions/register.ts`**: Creates `user_profiles` records with `participant` role during registration
6. **`app/admin/layout.tsx`**: Uses `user_profiles` for admin verification
7. **`app/admin/exams/**/*.tsx`**: All admin pages updated to use `user_profiles`
8. **`app/actions/admin.ts`**: Server-side admin verification uses `user_profiles`

## Role System Architecture

### Primary Source: `user_profiles` Table

```sql
user_profiles
├── user_id (UUID, references auth.users)
├── role (VARCHAR) - 'admin', 'participant', or custom
├── name (VARCHAR)
└── created_at, updated_at
```

### Fallback: `user_metadata`

If a `user_profiles` record doesn't exist, the system falls back to `user.user_metadata.role`.

### Default Role

Users without an explicit role default to `'participant'`.

## Adding New User Types

To add a new user type (e.g., 'judge', 'moderator'):

1. **No database changes needed** - `role` is VARCHAR, not an enum
2. **Update TypeScript types** in `lib/utils/roles.ts`:
   ```typescript
   export type UserRole = 'admin' | 'participant' | 'judge' | 'moderator' | string
   ```
3. **Add role checks** where needed:
   ```typescript
   const role = await getUserRole(userId, supabase)
   if (role === 'judge') {
     // Handle judge logic
   }
   ```

## Testing Checklist

After migration, verify:

- [ ] Admin users can log in and access `/admin` without redirect to register
- [ ] Participants can log in and access `/dashboard`
- [ ] New registrations create `user_profiles` with `participant` role
- [ ] Existing users are migrated correctly
- [ ] Middleware properly redirects based on role
- [ ] Admin pages check role from `user_profiles`
- [ ] Dashboard redirects admins to `/admin`

## Troubleshooting

### Admin Still Redirected to Register

1. Check if `user_profiles` record exists:
   ```sql
   SELECT * FROM user_profiles WHERE user_id = '<user-id>';
   ```

2. If missing, create it:
   ```sql
   INSERT INTO user_profiles (user_id, role, name)
   VALUES ('<user-id>', 'admin', '<name>');
   ```

3. Verify `user_metadata` has role:
   ```sql
   SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = '<user-id>';
   ```

### Users Not Getting Roles During Registration

Check that `app/actions/register.ts` is creating `user_profiles` records. The code should insert into `user_profiles` after creating participant records.

## Rollback

If you need to rollback:

1. The system will automatically fall back to `user_metadata.role`
2. No data is lost - `user_metadata` is still updated
3. You can drop the `user_profiles` table if needed (not recommended)

## Future Enhancements

- Add role management UI in admin panel
- Add role-based permissions system
- Add audit log for role changes
- Add role validation on registration

