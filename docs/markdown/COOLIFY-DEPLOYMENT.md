# Coolify Deployment Guide

This guide explains how to deploy Gyana Spardha on Coolify using Nixpacks.

---

## Prerequisites

- Coolify instance (self-hosted or managed)
- Git repository access (GitHub, GitLab, or other)
- Supabase project with database configured
- Domain name (optional, but recommended)

---

## Deployment Method: Nixpacks

Nixpacks automatically detects and builds the Next.js application. No Dockerfile required.

### What Nixpacks Auto-Detects

| Setting | Value | Source |
|---------|-------|--------|
| Framework | Next.js | package.json |
| Node Version | 20 | Default LTS |
| Build Command | `npm run build` | package.json scripts |
| Start Command | `npm run start` | package.json scripts |
| Port | 3000 | Next.js default |

---

## Step-by-Step Setup

### Step 1: Add New Resource in Coolify

1. Log in to your Coolify dashboard
2. Navigate to your project or create a new one
3. Click **"+ Add New Resource"**
4. Select **"Application"**

### Step 2: Connect Repository

**For Public Repository:**
1. Select "Public Repository"
2. Enter the repository URL
3. Select the branch (usually `main` or `master`)

**For Private Repository:**
1. Select "Private Repository (with GitHub App)" or "Private Repository (with Deploy Key)"
2. Follow the authentication steps
3. Select your repository and branch

### Step 3: Configure Build Settings

| Setting | Value |
|---------|-------|
| Build Pack | **Nixpacks** |
| Port | **3000** |
| Install Command | `npm install` (auto-detected) |
| Build Command | `npm run build` (auto-detected) |
| Start Command | `npm run start` (auto-detected) |

### Step 4: Configure Environment Variables

Add the following environment variables in Coolify's "Environment Variables" section:

#### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=https://gyanaspardha.com
```

#### Optional Variables

```env
# Email Service - SendGrid (for registration, authority, and exam invitation emails)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=Gyana Spardha <noreply@gyanaspardha.com>

# AI Assistant (for admin panel)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

### Step 5: Configure Health Check

1. Go to "Health Checks" settings
2. Set the following:

| Setting | Value |
|---------|-------|
| Health Check Path | `/api/health` |
| Health Check Port | `3000` |
| Health Check Interval | `30` seconds |
| Health Check Timeout | `10` seconds |
| Health Check Retries | `3` |

### Step 6: Configure Domain (Optional)

1. Go to "Domains" settings
2. Add your domain: `gyanaspardha.com`
3. Enable **"Generate SSL Certificate"** (Let's Encrypt)
4. Configure DNS:
   - Add an **A record** pointing to your Coolify server IP
   - Or use **CNAME** if using a subdomain

### Step 7: Deploy

1. Click **"Deploy"** button
2. Wait for the build to complete (usually 2-5 minutes)
3. Check the deployment logs for any errors
4. Once deployed, access your application at the configured domain

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (keep secret) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your production URL (e.g., https://gyanaspardha.com) |
| `SENDGRID_API_KEY` | No | SendGrid API key for email notifications |
| `SENDGRID_FROM_EMAIL` | No | Sender email for notifications (verified in SendGrid) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI assistant feature |

---

## Troubleshooting

### Build Fails with "Module not found"

- Ensure all dependencies are listed in `package.json`
- Check if the module is a dev dependency that's needed at build time

### Application Crashes on Start

1. Check Coolify logs for error messages
2. Verify all required environment variables are set
3. Test the health endpoint: `curl https://your-domain.com/api/health`

### Environment Variables Not Working

- Variables with `NEXT_PUBLIC_` prefix are exposed to the browser
- Variables without the prefix are server-side only
- Restart the application after changing environment variables

### SSL Certificate Issues

1. Ensure DNS is properly configured
2. Wait for DNS propagation (up to 48 hours)
3. Try regenerating the certificate in Coolify

### Database Connection Issues

1. Verify Supabase project is active (not paused)
2. Check if the Supabase URL is correct
3. Ensure the anon key and service role key are valid

---

## Updating the Application

### Automatic Deployments

1. Go to your application settings in Coolify
2. Enable **"Auto Deploy"** on push
3. Every push to the configured branch will trigger a new deployment

### Manual Deployments

1. Navigate to your application in Coolify
2. Click **"Redeploy"** or **"Deploy"**
3. Wait for the build to complete

---

## Monitoring

### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
curl https://gyanaspardha.com/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "service": "gyana-spardha",
  "version": "1.0.0"
}
```

### Coolify Monitoring

- View real-time logs in Coolify dashboard
- Set up alerts for deployment failures
- Monitor resource usage (CPU, Memory)

---

## Recommended Coolify Settings

| Setting | Recommended Value |
|---------|-------------------|
| Memory Limit | 512MB - 1GB |
| CPU Limit | 0.5 - 1 core |
| Replicas | 1 (increase for high traffic) |
| Restart Policy | Always |

---

## Backup Considerations

- Supabase handles database backups automatically
- Application code is versioned in Git
- Environment variables should be documented securely

---

## Support

For issues specific to:
- **Coolify:** Check [Coolify Documentation](https://coolify.io/docs)
- **Next.js:** Check [Next.js Documentation](https://nextjs.org/docs)
- **Supabase:** Check [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated:** January 2026
