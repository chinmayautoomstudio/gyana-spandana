# Environment Variables Setup

Create a `.env.local` file in the root directory (`gyana-spandana/`) with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side Admin Client (Required for registration flow)
# ⚠️ KEEP THIS SECRET - Never expose in client-side code
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## How to get your Supabase credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings > API
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Important Notes:

- **File Name**: Use `.env.local` (not `.env`) - Next.js prefers `.env.local` for local development
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- `SUPABASE_SERVICE_ROLE_KEY` is **server-side only** - never use it in client components
- Keep your keys secure and never share them publicly
- The service role key bypasses Row Level Security (RLS) - use with caution

## File Format Requirements

**Correct format:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important formatting rules:**
- ✅ No quotes around values
- ✅ No spaces around the `=` sign
- ✅ No trailing spaces or newlines after values
- ✅ One variable per line
- ❌ Don't use: `NEXT_PUBLIC_SUPABASE_URL="https://..."` (quotes)
- ❌ Don't use: `NEXT_PUBLIC_SUPABASE_URL = https://...` (spaces around =)

## Troubleshooting

### Error: "supabaseKey is required" or "Failed to fetch"

This error occurs when environment variables are not being read correctly. Follow these steps:

1. **Check file name and location:**
   - File must be named `.env.local` (not `.env`)
   - File must be in the project root: `gyana-spandana/.env.local`
   - Verify the file exists: `ls .env.local` (or `dir .env.local` on Windows)

2. **Verify file format:**
   - Open `.env.local` and check:
     - No quotes around values
     - No spaces around `=`
     - All three variables are present and filled in
     - No empty lines with just variable names

3. **Restart the development server:**
   - Stop the server (Ctrl+C)
   - Start it again: `npm run dev`
   - Environment variables are only loaded when the server starts

4. **Check variable names:**
   - Must be exactly: `NEXT_PUBLIC_SUPABASE_URL`
   - Must be exactly: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Must be exactly: `SUPABASE_SERVICE_ROLE_KEY`
   - Case-sensitive, no typos

5. **Verify values are not empty:**
   - Make sure values are actually filled in (not just `NEXT_PUBLIC_SUPABASE_URL=`)
   - Copy the full key from Supabase dashboard (they're very long)

6. **Check for hidden characters:**
   - Sometimes copying from a browser can add hidden characters
   - Try typing the values manually or use a plain text editor

### Error: "ERR_CONNECTION_CLOSED" or "Failed to fetch" during login

This indicates the client-side Supabase client cannot connect:

1. **Verify `NEXT_PUBLIC_` variables are set:**
   - Client-side code needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - These must have the `NEXT_PUBLIC_` prefix to be available in the browser

2. **Check your Supabase project:**
   - Verify your project is active (not paused)
   - Check if the URL is correct: `https://your-project-id.supabase.co`
   - Test the URL in a browser (should show Supabase API info)

3. **Restart dev server:**
   - Environment variable changes require a server restart
   - Stop and restart: `npm run dev`

### Registration works but login fails

This happens when:
- Server-side variables work (registration uses server actions)
- Client-side variables are missing (login uses browser client)

**Solution:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`

### Still having issues?

1. Check the browser console for detailed error messages
2. Verify your `.env.local` file format matches the example above exactly
3. Try creating a fresh `.env.local` file and copying values again
4. Make sure you're using the correct Supabase project credentials

