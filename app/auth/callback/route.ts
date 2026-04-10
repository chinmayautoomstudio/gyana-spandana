import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getInvitationByToken, checkPendingInvitationForEmail } from '@/app/actions/team'
import { getSafeInternalPath, isAllowedPostLoginPath } from '@/lib/auth/safe-redirect-path'

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

type ResponseCookieOptions = NonNullable<Parameters<NextResponse['cookies']['set']>[2]>

function withNoStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}

function redirectWithAuthCookies(
  dest: string | URL,
  mergedCookies: Map<string, { value: string; options?: ResponseCookieOptions }>
): NextResponse {
  const url = typeof dest === 'string' ? dest : dest.toString()
  const redirect = NextResponse.redirect(url)
  withNoStore(redirect)
  mergedCookies.forEach(({ value, options }, name) => {
    if (options) {
      redirect.cookies.set(name, value, options)
    } else {
      redirect.cookies.set(name, value)
    }
  })
  return redirect
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextRaw = requestUrl.searchParams.get('next')
  const nextPath = getSafeInternalPath(nextRaw)
  const nextAllowed =
    nextPath && isAllowedPostLoginPath(nextPath) ? nextPath : null
  const baseUrl = getRedirectBaseUrl(request)

  if (!code) {
    return withNoStore(NextResponse.redirect(`${baseUrl}/login`))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let supabaseResponse = NextResponse.next({ request })
  const mergedCookies = new Map<string, { value: string; options?: ResponseCookieOptions }>()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          mergedCookies.set(name, { value, options })
        })
        supabaseResponse = NextResponse.next({ request })
        mergedCookies.forEach(({ value, options }, name) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const url = new URL(`${baseUrl}/login`)
    url.searchParams.set('error', 'auth_failed')
    return withNoStore(NextResponse.redirect(url))
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    const url = new URL(`${baseUrl}/login`)
    url.searchParams.set('error', 'not_authenticated')
    return withNoStore(NextResponse.redirect(url))
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  const role = profile?.role || (user.user_metadata?.role as string | undefined) || 'participant'

  const resolveNextForUser = (): string | null => {
    if (!nextAllowed) return null
    if (nextAllowed === '/auth/reset-password') return '/auth/reset-password'
    if (role !== 'admin' && (nextAllowed === '/admin' || nextAllowed.startsWith('/admin/'))) {
      return null
    }
    return nextAllowed
  }

  const effectiveNext = resolveNextForUser()

  if (nextAllowed === '/auth/reset-password') {
    return redirectWithAuthCookies(`${baseUrl}/auth/reset-password`, mergedCookies)
  }

  const inviteToken = request.cookies.get('invite_token')?.value
  const clearInviteCookie = (response: NextResponse) => {
    response.cookies.set('invite_token', '', { path: '/', maxAge: 0 })
    return response
  }
  if (inviteToken) {
    const invitation = await getInvitationByToken(inviteToken)
    const invitePageUrl = `${baseUrl}/register/invite/${inviteToken}`
    if (!invitation.valid) {
      const res = redirectWithAuthCookies(`${invitePageUrl}?error=invalid_invite`, mergedCookies)
      return clearInviteCookie(res)
    }
    const userEmail = (user.email ?? '').toLowerCase()
    const invitedEmail = invitation.p2Email.toLowerCase()
    if (userEmail !== invitedEmail) {
      const res = redirectWithAuthCookies(`${invitePageUrl}?error=email_mismatch`, mergedCookies)
      return clearInviteCookie(res)
    }
    const res = redirectWithAuthCookies(`${invitePageUrl}?google=1`, mergedCookies)
    return clearInviteCookie(res)
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant) {
    const userEmail = (user.email ?? (user.user_metadata?.email as string | undefined))?.trim().toLowerCase()
    if (userEmail) {
      const pending = await checkPendingInvitationForEmail(userEmail)
      if (pending.hasPending) {
        return redirectWithAuthCookies(`${baseUrl}/register/invite/${pending.token}`, mergedCookies)
      }
    }
    return redirectWithAuthCookies(`${baseUrl}/team/create`, mergedCookies)
  }

  if (effectiveNext) {
    return redirectWithAuthCookies(`${baseUrl}${effectiveNext}`, mergedCookies)
  }

  const fallback = role === 'admin' ? '/admin' : '/dashboard'
  return redirectWithAuthCookies(`${baseUrl}${fallback}`, mergedCookies)
}
