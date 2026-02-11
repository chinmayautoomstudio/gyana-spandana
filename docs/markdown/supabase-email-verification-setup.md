# Supabase Email Verification Setup Guide

This guide explains how to configure Supabase for email OTP verification used in the registration flow.

## Overview

The registration flow uses Supabase Auth's **OTP (One-Time Password)** feature via `signInWithOtp()`. This sends a 6-digit code to the user's email that they must verify before completing registration.

## Required Supabase Configuration

### 1. Enable Email Authentication Provider

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Ensure **Email** provider is enabled
4. Under Email settings, make sure:
   - ✅ **Enable email confirmations** is checked (optional, but recommended)
   - ✅ **Enable email OTP** is checked (REQUIRED)

### 2. Configure Email Provider Settings

In **Authentication** → **Providers** → **Email**:

#### Email OTP Settings:
- **Enable Email OTP**: ✅ Enabled
- **OTP Length**: 6 (default)
- **OTP Expiry**: 3600 seconds (1 hour) - adjust as needed

#### Email Confirmation Settings (Optional):
- **Enable email confirmations**: Can be enabled for additional security
- **Secure email change**: Recommended to enable

### 3. Configure SMTP Settings (IMPORTANT)

By default, Supabase uses their own email service, but for production, you should configure custom SMTP.

#### Option A: Use Supabase Default Email (Development/Testing)
- No configuration needed
- Emails sent from `noreply@mail.app.supabase.io`
- Limited to 3 emails per hour per recipient (free tier)
- Good for development and testing

#### Option B: Configure Custom SMTP (Production Recommended)

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure your SMTP provider:

**For Gmail/Google Workspace:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: Your App Password (not regular password)
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

**For SendGrid:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: Your SendGrid API Key
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

**For AWS SES:**
```
SMTP Host: email-smtp.region.amazonaws.com
SMTP Port: 587
SMTP User: Your AWS Access Key
SMTP Password: Your AWS Secret Key
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

**For Mailgun:**
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: postmaster@yourdomain.mailgun.org
SMTP Password: Your Mailgun Password
Sender Email: noreply@yourdomain.com
Sender Name: Gyana Spandana
```

### 4. Configure Email Templates

Go to **Authentication** → **Email Templates**

#### Magic Link Template (Used for OTP)
The OTP email uses the "Magic Link" template. Customize it:

**Subject:**
```
Your Gyana Spandana Verification Code
```

**Email Body:**
```html
<h2>Verify Your Email for Gyana Spandana</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb;">{{ .Token }}</h1>
<p>This code will expire in 1 hour.</p>
<p>If you didn't request this code, please ignore this email.</p>
<hr>
<p style="color: #6b7280; font-size: 12px;">
  This is an automated message from Gyana Spandana Quiz Competition.
</p>
```

**Variables Available:**
- `{{ .Token }}` - The 6-digit OTP code
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL

#### Password Reset Template (For Forgot Password)
Also customize the password reset template:

**Subject:**
```
Reset Your Gyana Spandana Password
```

**Email Body:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request a password reset, please ignore this email.</p>
```

### 5. Configure Site URL and Redirect URLs

Go to **Project Settings** → **Auth** → **URL Configuration**

#### Site URL:
- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

#### Redirect URLs (Add both):
- `http://localhost:3000/auth/callback` (Development)
- `https://yourdomain.com/auth/callback` (Production)

### 6. Rate Limiting Configuration

Go to **Project Settings** → **Auth** → **Rate Limits**

Configure to prevent abuse:

**Email OTP Rate Limits:**
- **Max requests per hour**: 5-10 per email (recommended)
- **Max requests per day**: 20-30 per email (recommended)

**Password Reset Rate Limits:**
- **Max requests per hour**: 3 per email
- **Max requests per day**: 5 per email

### 7. Security Settings

Go to **Project Settings** → **Auth** → **Security**

**Recommended Settings:**
- ✅ **Enable email confirmations**: Optional (you're using OTP, so this is extra)
- ✅ **Secure email change**: Enable
- ✅ **Enable reCAPTCHA**: Recommended for production (prevents bot abuse)
- **JWT expiry**: 3600 seconds (1 hour) - adjust as needed

### 8. Environment Variables

Make sure your `.env.local` includes:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for server-side registration (updating passwords)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Where to find Service Role Key:**
1. Go to **Project Settings** → **API**
2. Copy the **service_role** key (keep this secret!)

## Testing Email Verification

### Test in Development:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to the registration page
3. Enter an email address
4. Click "Send OTP"
5. Check your email inbox (and spam folder)
6. Enter the 6-digit code
7. Verify it works

### Common Issues and Solutions

#### Issue: OTP emails not being sent
**Solutions:**
- Check SMTP configuration
- Verify email provider is enabled
- Check rate limits (may have exceeded)
- Check Supabase logs: **Logs** → **Auth Logs**

#### Issue: OTP emails going to spam
**Solutions:**
- Configure SPF/DKIM records for your domain
- Use a custom SMTP with verified domain
- Add sender email to email template
- Use a professional sender name

#### Issue: "Email rate limit exceeded"
**Solutions:**
- Wait for the rate limit window to reset
- Increase rate limits in Supabase settings
- Use custom SMTP (higher limits)

#### Issue: OTP verification fails
**Solutions:**
- Check OTP expiry time (default 1 hour)
- Ensure OTP code is entered correctly (6 digits)
- Check if user was created during OTP send (may need to handle existing users)

## Production Checklist

Before going to production:

- [ ] Configure custom SMTP with verified domain
- [ ] Customize email templates with branding
- [ ] Set appropriate rate limits
- [ ] Enable reCAPTCHA
- [ ] Test email delivery to various providers (Gmail, Outlook, etc.)
- [ ] Set up email monitoring/alerts
- [ ] Configure SPF/DKIM records for your domain
- [ ] Test OTP flow end-to-end
- [ ] Set up error logging for failed email sends
- [ ] Document your SMTP provider limits

## Additional Resources

- [Supabase Auth Email Documentation](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

