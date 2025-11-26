# Supabase Setup Checklist

Quick checklist for configuring Supabase for the Gyana Spandana registration flow with email verification.

**Updated for current Supabase Dashboard (2024/2025)**

## ✅ Required Configuration Steps

### 1. User Signups Settings
- [ ] Go to **Authentication** → **Settings**
- [ ] Verify **"Allow new users to sign up"** is ON ✅
- [ ] Set **"Confirm email"** to OFF ⚠️ (Recommended - OTP already verifies emails)
- [ ] Keep **"Allow manual linking"** OFF (not needed)
- [ ] Keep **"Allow anonymous sign-ins"** OFF (not needed)
- [ ] Click **"Save changes"** button

### 2. Email Provider Configuration
- [ ] Go to **Authentication** → **Providers**
- [ ] Enable **Email** provider (toggle ON)
- [ ] Click on **Email** to expand settings
- [ ] Enable **Email OTP** ✅ (REQUIRED - sends 6-digit code)
- [ ] Set **Email Confirmations** to OFF ⚠️ (OTP already verifies)
- [ ] Enable **Secure email change** (recommended)

### 3. URL Configuration
- [ ] Go to **Authentication** → **Settings**
- [ ] Scroll to **URL Configuration** section
- [ ] Set **Site URL**:
  - Development: `http://localhost:3000`
  - Production: `https://yourdomain.com`
- [ ] Add **Redirect URLs** (one per line):
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback`
- [ ] Click **Save**

### 4. Email Templates
- [ ] Go to **Authentication** → **Email Templates**
- [ ] Customize **Magic Link** template (used for OTP):
  - Update subject line: "Your Gyana Spandana Verification Code"
  - Update email body with branding
  - Ensure `{{ .Token }}` variable is included for OTP code
- [ ] Customize **Password Reset** template (for forgot password)
- [ ] Click **Save** after each template

### 5. SMTP Configuration
Choose one:

**Option A: Use Supabase Default (Development)**
- [ ] No action needed (already enabled)
- ⚠️ Limited to 3 emails/hour per recipient on free tier

**Option B: Custom SMTP (Production Recommended)**
- [ ] Go to **Project Settings** → **Auth**
- [ ] Scroll to **SMTP Settings** section
- [ ] Enable **Custom SMTP**
- [ ] Configure SMTP provider (Gmail, SendGrid, AWS SES, Mailgun, etc.)
- [ ] Test email delivery

### 6. Rate Limiting
- [ ] Go to **Project Settings** → **Auth**
- [ ] Find **Rate Limits** section
- [ ] Set Email OTP limits:
  - Max requests per hour: 5-10
  - Max requests per day: 20-30
- [ ] Set Password Reset limits:
  - Max requests per hour: 3
  - Max requests per day: 5

### 7. Get Service Role Key
- [ ] Go to **Project Settings** → **API**
- [ ] Find **service_role** key (under "Project API keys")
- [ ] Copy it (keep it secret!)

### 8. Environment Variables
- [ ] Add to `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```
- [ ] ⚠️ Never commit `.env.local` to git (already in `.gitignore`)

### 8. Database Schema
- [ ] Run database schema from `docs/database-schema.sql`
- [ ] Verify RLS policies are active
- [ ] Test that registration can create teams and participants

## 🧪 Testing Checklist

- [ ] Test OTP email sending in development
- [ ] Verify OTP code is received in email
- [ ] Test OTP verification flow
- [ ] Test registration with both participants
- [ ] Test password reset flow
- [ ] Check email delivery to different providers (Gmail, Outlook, etc.)
- [ ] Verify emails are not going to spam
- [ ] Test rate limiting (try sending multiple OTPs)

## 📋 Production Readiness

Before deploying to production:

- [ ] Custom SMTP configured with verified domain
- [ ] Email templates customized with branding
- [ ] SPF/DKIM records configured for email domain
- [ ] Rate limits set appropriately
- [ ] Error logging configured
- [ ] Email monitoring/alerts set up
- [ ] All environment variables set in hosting platform
- [ ] Production redirect URLs added to Supabase
- [ ] "Confirm email" setting reviewed (OFF recommended for OTP flow)

## 📚 Documentation

- See `docs/supabase-email-verification-setup.md` for detailed instructions
- See `ENV_SETUP.md` for environment variable setup

## 🆘 Troubleshooting

If emails aren't being sent:
1. Check **Logs** → **Auth Logs** in Supabase dashboard
2. Verify SMTP configuration
3. Check rate limits haven't been exceeded
4. Verify email provider is enabled
5. Check spam folder

If OTP verification fails:
1. Check OTP hasn't expired (default: 1 hour)
2. Verify code is entered correctly (6 digits)
3. Check if user already exists (may need error handling)

