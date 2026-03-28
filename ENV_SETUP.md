# Environment Variables Setup

Create a `.env` or `.env.local` file in the **project root** (the folder that contains `package.json`, `next.config.ts`, and `proxy.ts`) with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side Admin Client (Required for registration flow)
# ⚠️ KEEP THIS SECRET - Never expose in client-side code
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service Configuration (Optional - SendGrid for registration/authority/exam emails)
# Get your API key from https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=GYANA SPARDHA <noreply@yourdomain.com>
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: protect GET /api/cron/update-exam-statuses (Vercel Cron or external scheduler)
# Production requires this if you call the cron route; use Authorization: Bearer <CRON_SECRET>
# CRON_SECRET=your-long-random-secret

# AI Assistant Configuration (Required for admin AI assistant)
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_api_key_here
```

## How to get your Supabase credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings > API
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Email Service Setup (Optional - SendGrid)

To enable transactional emails (registration confirmation, authority notification, exam invitations):

1. Sign up at [SendGrid](https://sendgrid.com) and verify a sender or domain (Sender Authentication).
2. In SendGrid Dashboard go to **Settings → API Keys** and create an API key with "Mail Send" permission.
3. Set `SENDGRID_API_KEY` in `.env.local` (key starts with `SG.`).
4. Set `SENDGRID_FROM_EMAIL` to your verified sender (e.g., `GYANA SPARDHA <noreply@yourdomain.com>`).
5. Set `NEXT_PUBLIC_SITE_URL` to your production URL (or `http://localhost:3000` for development).

**OTP emails (login/register verification):** Sent by Supabase Auth. To use SendGrid for those in production, in **Supabase Dashboard → Authentication → SMTP Settings** enable Custom SMTP and set: Host `smtp.sendgrid.net`, Port `587`, Username `apikey`, Password = your SendGrid API key, Sender = same verified address.

**Note:** If SendGrid is not configured, registration and exam flows still work; email notifications are skipped.

### Google OAuth (Sign up / Sign in with Google)

To enable "Sign up with Google" and "Sign in with Google":

1. In [Google Cloud Console](https://console.cloud.google.com) create a project (or use an existing one), then go to **APIs & Services → Credentials** and create **OAuth 2.0 Client ID** (Application type: Web application).
2. Add **Authorized redirect URIs**: `https://<your-project-ref>.supabase.co/auth/v1/callback` (find your project ref in Supabase Dashboard → Settings → API).
3. Copy the **Client ID** and **Client Secret**.
4. In **Supabase Dashboard → Authentication → Providers**, enable **Google** and paste the Client ID and Client Secret. Save.

No extra environment variables are needed in the app; Supabase stores the Google credentials.

## Important Notes:

- **File location**: Put `.env` or `.env.local` in the **project root** (same folder as `package.json` and `proxy.ts`). Next.js loads env from there.
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
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=GYANA SPARDHA <noreply@yourdomain.com>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
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
   - File must be named `.env` or `.env.local`
   - File must be in the **project root** (the folder that contains `package.json` and `proxy.ts`)
   - Verify the file exists: `ls .env` or `ls .env.local` (or `dir .env` / `dir .env.local` on Windows)

2. **Verify file format:**
   - Open `.env` or `.env.local` and check:
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

**Solution:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env` or `.env.local` in the project root.

### Still having issues?

1. Check the browser console for detailed error messages
2. Verify your `.env` or `.env.local` file format matches the example above exactly
3. Try creating a fresh `.env` or `.env.local` file in the project root and copying values again
4. Make sure you're using the correct Supabase project credentials

