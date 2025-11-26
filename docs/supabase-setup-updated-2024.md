# Updated Supabase Setup Guide (2024/2025)

This guide reflects the current Supabase dashboard structure and configuration for email OTP verification.

## Current Supabase Dashboard Structure

Based on the latest Supabase UI, the authentication settings are organized as follows:

1. **Authentication** → **Settings** (Main settings page)
2. **Authentication** → **Providers** (Email, OAuth providers)
3. **Authentication** → **Email Templates** (Email customization)
4. **Project Settings** → **Auth** (Advanced settings, SMTP)

## Step-by-Step Configuration

### Step 1: Configure User Signups Settings

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. You'll see the **"User Signups"** section with these toggles:

#### Required Settings:

✅ **"Allow new users to sign up"**: 
- **Status**: ON (Enabled) ✅
- **Why**: Required for registration to work
- **Action**: Keep it ON

⚠️ **"Confirm email"**: 
- **Status**: OFF (Recommended for OTP flow)
- **Why**: Your registration uses OTP verification, which already verifies emails
- **Action**: Turn this OFF to avoid conflicts
- **Note**: If you keep it ON, users will need both OTP verification AND email confirmation link

❌ **"Allow manual linking"**: 
- **Status**: OFF (OK)
- **Why**: Not needed for your use case
- **Action**: Keep it OFF

❌ **"Allow anonymous sign-ins"**: 
- **Status**: OFF (OK)
- **Why**: Not needed for your use case
- **Action**: Keep it OFF

**After making changes, click "Save changes" button (bottom right)**

### Step 2: Enable Email Provider

1. Navigate to **Authentication** → **Providers**
2. Find the **Email** provider section
3. Ensure **Email** is **Enabled** (toggle should be ON)
4. Click on **Email** to expand settings
5. Look for these options:

#### Email Provider Options:

- **Enable Email OTP**: ✅ Must be ENABLED (This is what sends the 6-digit code)
- **Enable Email Confirmations**: ⚠️ Optional (Only if you want both OTP + email link verification)
- **Secure email change**: ✅ Recommended to enable

**For your OTP-based registration flow:**
- ✅ Enable Email OTP: ON
- ⚠️ Enable Email Confirmations: OFF (recommended, since OTP already verifies)

### Step 3: Configure URL Settings

1. Still in **Authentication** → **Settings**
2. Scroll down to find **URL Configuration** section
3. Configure:

#### Site URL:
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

#### Redirect URLs:
Add these URLs (one per line):
```
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

**Click "Save" after adding URLs**

### Step 4: Configure Email Templates

1. Navigate to **Authentication** → **Email Templates**
2. You'll see several templates. For OTP, customize the **"Magic Link"** template:

#### Magic Link Template (Used for OTP):

**Subject:**
```
Your Gyana Spandana Verification Code
```

**Email Body:**
```html
<h2>Verify Your Email for Gyana Spandana</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb; text-align: center; margin: 20px 0;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this code, please ignore this email.</p>
<hr>
<p style="color: #6b7280; font-size: 12px;">
  This is an automated message from Gyana Spandana Quiz Competition.
</p>
```

**Available Variables:**
- `{{ .Token }}` - The 6-digit OTP code
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL

**Click "Save" after customizing**

### Step 5: Configure SMTP (Production)

For production, you should set up custom SMTP:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings** section
3. Enable **Custom SMTP**
4. Enter your SMTP credentials:

**Common SMTP Providers:**

**Gmail/Google Workspace:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [App Password - not regular password]
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

**SendGrid:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

**Note**: For development, you can use Supabase's default email service (limited to 3 emails/hour per recipient on free tier)

### Step 6: Configure Rate Limits

1. Go to **Project Settings** → **Auth**
2. Find **Rate Limits** section
3. Configure:

**Email OTP Rate Limits:**
- Max requests per hour: `5-10` (recommended)
- Max requests per day: `20-30` (recommended)

**Password Reset Rate Limits:**
- Max requests per hour: `3`
- Max requests per day: `5`

### Step 7: Get Service Role Key

1. Go to **Project Settings** → **API**
2. Find the **service_role** key (under "Project API keys")
3. Copy it and add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Important**: Never expose the service_role key in client-side code!

## Recommended Configuration Summary

Based on your OTP-based registration flow:

| Setting | Location | Recommended Value |
|---------|----------|------------------|
| Allow new users to sign up | Auth → Settings | ✅ ON |
| Confirm email | Auth → Settings | ❌ OFF (to avoid conflicts) |
| Enable Email OTP | Auth → Providers → Email | ✅ ON |
| Enable Email Confirmations | Auth → Providers → Email | ❌ OFF (OTP already verifies) |
| Site URL | Auth → Settings | Your domain |
| Redirect URLs | Auth → Settings | `/auth/callback` |
| Custom SMTP | Project Settings → Auth | Configure for production |

## Testing Your Configuration

1. **Test OTP Sending:**
   - Go to registration page
   - Enter an email
   - Click "Send OTP"
   - Check email inbox (and spam folder)

2. **Test OTP Verification:**
   - Enter the 6-digit code
   - Verify it works

3. **Test Registration:**
   - Complete registration after OTP verification
   - Verify team and participants are created

4. **Test Login:**
   - Try logging in with email/password
   - Should work without "Email not confirmed" errors

## Troubleshooting

### Issue: OTP emails not being sent
- Check **Authentication** → **Providers** → **Email** is enabled
- Verify **Enable Email OTP** is ON
- Check rate limits haven't been exceeded
- Check **Logs** → **Auth Logs** in Supabase dashboard

### Issue: "Email not confirmed" error on login
- Turn OFF "Confirm email" in **Authentication** → **Settings**
- Or ensure users complete email confirmation after OTP verification

### Issue: OTP verification fails
- Check OTP hasn't expired (default: 1 hour)
- Verify code is 6 digits
- Check if user already exists (may need error handling)

## Next Steps

1. ✅ Configure all settings above
2. ✅ Test OTP flow
3. ✅ Add service role key to `.env.local`
4. ✅ Test complete registration flow
5. ✅ Test login flow

For detailed email template customization and SMTP setup, see `docs/supabase-email-verification-setup.md`

