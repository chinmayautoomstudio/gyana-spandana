import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { parseSafeInternalRedirectPath } from '@/lib/auth/safe-redirect-path'
import { getUserRoleFromAuthUser } from '@/lib/auth/user-role'

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((cookie) => request.cookies.set(cookie.name, cookie.value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Check user role FIRST - admins should go to admin dashboard, not participant dashboard
    const role = await getUserRoleFromAuthUser(supabase, user)
    if (role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    // Participant-record check removed from middleware.
    // The dashboard page handles the "no participant yet" state itself,
    // so newly registered users are not bounced back to /team/create.
  }

  // Protect admin routes - only admins can access
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const role = await getUserRoleFromAuthUser(supabase, user)
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect unauthenticated users from admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Protect exam routes - require authentication
  if (request.nextUrl.pathname.startsWith('/exams') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Protect host routes - admin or host only
  if (request.nextUrl.pathname.startsWith('/host')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    const role = await getUserRoleFromAuthUser(supabase, user)
    if (role !== 'admin' && role !== 'host') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Protect participant quiz play routes; allow public display route
  if (
    request.nextUrl.pathname.startsWith('/quiz') &&
    !request.nextUrl.pathname.endsWith('/display') &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup
  if (
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') &&
    user
  ) {
    const role = await getUserRoleFromAuthUser(supabase, user)

    // If admin, redirect to admin dashboard (or safe redirectedFrom under /admin)
    if (role === 'admin') {
      const from = parseSafeInternalRedirectPath(
        request.nextUrl.searchParams.get('redirectedFrom')
      )
      const fromPath = from?.split('?')[0] ?? ''
      if (from && fromPath.startsWith('/admin')) {
        return NextResponse.redirect(new URL(from, request.nextUrl.origin))
      }
      return NextResponse.redirect(new URL('/admin', request.nextUrl.origin))
    }

    if (role === 'host') {
      const from = parseSafeInternalRedirectPath(
        request.nextUrl.searchParams.get('redirectedFrom')
      )
      const fromPath = from?.split('?')[0] ?? ''
      if (from && fromPath.startsWith('/host')) {
        return NextResponse.redirect(new URL(from, request.nextUrl.origin))
      }
      return NextResponse.redirect(new URL('/host', request.nextUrl.origin))
    }

    // For regular users, check if they have a participant record
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (participant) {
      const from = parseSafeInternalRedirectPath(
        request.nextUrl.searchParams.get('redirectedFrom')
      )
      if (from) {
        return NextResponse.redirect(new URL(from, request.nextUrl.origin))
      }
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
    }
    // No participant record: redirect to team creation to complete registration
    const url = request.nextUrl.clone()
    url.pathname = '/team/create'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
