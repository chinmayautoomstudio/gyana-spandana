# Quick Supabase Setup Guide

**Based on your current Supabase dashboard view**

## 🎯 Immediate Actions Required

### 1. In "User Signups" Section (Authentication → Settings)

You're currently viewing this page. Here's what to do:

✅ **"Allow new users to sign up"**: Keep it **ON** (already correct)

⚠️ **"Confirm email"**: Turn it **OFF**
- **Why**: Your registration uses OTP verification which already verifies emails
- **Action**: Toggle it OFF, then click **"Save changes"** button (bottom right)

❌ **"Allow manual linking"**: Keep it **OFF** (not needed)

❌ **"Allow anonymous sign-ins"**: Keep it **OFF** (not needed)

---

### 2. Enable Email OTP (Authentication → Providers)

1. Click on **"Providers"** in the left sidebar (under Authentication)
2. Find **Email** provider
3. Make sure it's **Enabled** (toggle ON)
4. Click on **Email** to expand settings
5. Enable **"Email OTP"** ✅ (This sends the 6-digit code)
6. Set **"Email Confirmations"** to OFF (optional, since OTP verifies)

---

### 3. Configure URLs (Authentication → Settings)

1. Go back to **Authentication** → **Settings**
2. Scroll down to **URL Configuration**
3. Set **Site URL**: `http://localhost:3000` (for development)
4. Add **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   ```
5. Click **Save**

---

### 4. Get Service Role Key (Project Settings → API)

1. Click **Project Settings** (gear icon) in left sidebar
2. Click **API**
3. Find **service_role** key (under "Project API keys")
4. Copy it
5. Add to your `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=paste_your_key_here
   ```

---

### 5. Test It!

1. Go to your registration page
2. Enter an email
3. Click "Send OTP"
4. Check your email for the 6-digit code
5. Enter the code and verify

---

## ✅ Summary Checklist

- [ ] Turn OFF "Confirm email" in User Signups
- [ ] Enable Email OTP in Providers
- [ ] Set Site URL and Redirect URLs
- [ ] Add Service Role Key to `.env.local`
- [ ] Test OTP sending and verification

---

## 📚 Need More Details?

- **Detailed guide**: See `docs/supabase-setup-updated-2024.md`
- **Checklist**: See `docs/supabase-setup-checklist.md`
- **Email templates**: See `docs/supabase-email-verification-setup.md`

---

## ⚠️ Important Notes

1. **"Confirm email" OFF**: This prevents conflicts with your OTP flow
2. **Service Role Key**: Keep it secret! Never expose in client-side code
3. **Email OTP**: This is what sends the 6-digit verification code
4. **Test First**: Always test in development before production

---

**That's it! Your setup should work now.** 🎉

