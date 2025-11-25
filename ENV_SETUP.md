# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to get your Supabase credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings > API
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Important Notes:

- Never commit `.env.local` to version control (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- Keep your keys secure and never share them publicly

