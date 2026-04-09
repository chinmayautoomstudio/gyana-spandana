import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getInvitationByToken, checkPendingInvitationForEmail } from '@/app/actions/team'
import { getUserRoleFromAuthUser } from '@/lib/auth/user-role'

const ALLOWED_NEXT_PATHS = ['/auth/reset-password', '/dashboard', '/team/create', '/admin', '/host'] as const

function isAllowedNext(next: string | null): next is (typeof ALLOWED_NEXT_PATHS)[number] {
  return next !== null && ALLOWED_NEXT_PATHS.includes(next as (typeof ALLOWED_NEXT_PATHS)[number])
}

/** Base URL for redirects. Prefer NEXT_PUBLIC_SITE_URL or forwarded headers so we don't redirect to localhost behind a proxy. */
function getRedirectBaseUrl(request: Request): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (siteUrl && (siteUrl.startsWith('http://') || siteUrl.startsWith('https://'))) {
    try {
      return new URL(siteUrl).origin
    } catch {
      // fall through
    }
  }
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host')
  if (proto && host) {
    return `${proto}://${host}`
  }
  return new URL(request.url).origin
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = requestUrl.searchParams.get('next')
  const baseUrl = getRedirectBaseUrl(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // If code exchange fails, redirect to login
      const url = new URL(`${baseUrl}/login`)
      url.searchParams.set('error', 'auth_failed')
      return NextResponse.redirect(url)
    }

    // After successful code exchange, check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // User not authenticated, redirect to login
      const url = new URL(`${baseUrl}/login`)
      url.searchParams.set('error', 'not_authenticated')
      return NextResponse.redirect(url)
    }

    // If next is /auth/reset-password, redirect there so user can set new password
    if (nextPath === '/auth/reset-password' && isAllowedNext(nextPath)) {
      return NextResponse.redirect(`${baseUrl}/auth/reset-password`)
    }

    // P2 invite flow: user clicked "Continue with Google" from invite page
    const inviteToken = request.cookies.get('invite_token')?.value
    const clearInviteCookie = (response: NextResponse) => {
      response.cookies.set('invite_token', '', { path: '/', maxAge: 0 })
      return response
    }
    if (inviteToken) {
      const invitation = await getInvitationByToken(inviteToken)
      const invitePageUrl = `${baseUrl}/register/invite/${inviteToken}`
      if (!invitation.valid) {
        const res = NextResponse.redirect(`${invitePageUrl}?error=invalid_invite`)
        return clearInviteCookie(res)
      }
      const userEmail = (user.email ?? '').toLowerCase()
      const invitedEmail = invitation.p2Email.toLowerCase()
      if (userEmail !== invitedEmail) {
        const res = NextResponse.redirect(`${invitePageUrl}?error=email_mismatch`)
        return clearInviteCookie(res)
      }
      const res = NextResponse.redirect(`${invitePageUrl}?google=1`)
      return clearInviteCookie(res)
    }

    const role = await getUserRoleFromAuthUser(supabase, user)
    if (role === 'admin') {
      if (nextPath === '/admin' && isAllowedNext(nextPath)) {
        return NextResponse.redirect(`${baseUrl}/admin`)
      }
      return NextResponse.redirect(`${baseUrl}/admin`)
    }
    if (role === 'host') {
      if (nextPath === '/host' && isAllowedNext(nextPath)) {
        return NextResponse.redirect(`${baseUrl}/host`)
      }
      return NextResponse.redirect(`${baseUrl}/host`)
    }

    // Check if user has a participant record (completed registration)
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      // User is authenticated but doesn't have a participant record.
      // Check if their email has a pending P2 invitation - if so, redirect to accept it.
      const userEmail = (user.email ?? (user.user_metadata?.email as string | undefined))?.trim().toLowerCase()
      if (userEmail) {
        const pending = await checkPendingInvitationForEmail(userEmail)
        if (pending.hasPending) {
          return NextResponse.redirect(`${baseUrl}/register/invite/${pending.token}`)
        }
      }
      // Redirect to team creation (two-step registration)
      const url = new URL(`${baseUrl}/team/create`)
      return NextResponse.redirect(url)
    }

    // Redirect to allowed next path or default to dashboard
    if (isAllowedNext(nextPath)) {
      return NextResponse.redirect(`${baseUrl}${nextPath}`)
    }

    // User is authenticated and has participant record, redirect to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard`)
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${baseUrl}/login`)
}

