import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
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

  // Helper function to get user role (checks user_profiles first, then user_metadata)
  const getUserRole = async (userId: string): Promise<string> => {
    // Try user_profiles table first (primary source)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profile?.role) {
      return profile.role
    }

    // Fallback to user_metadata (for backward compatibility)
    if (user?.user_metadata?.role) {
      return user.user_metadata.role
    }

    // Default to participant
    return 'participant'
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Check user role FIRST - admins should go to admin dashboard, not participant dashboard
    const role = await getUserRole(user.id)
    if (role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    
    // For non-admin users, check if they have a participant record (completed registration)
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!participant) {
      // User is authenticated but doesn't have participant record
      // Redirect to register to complete registration
      const url = request.nextUrl.clone()
      url.pathname = '/register'
      url.searchParams.set('message', 'Please complete your registration')
      return NextResponse.redirect(url)
    }
  }

  // Protect admin routes - only admins can access
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const role = await getUserRole(user.id)
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

  // Redirect authenticated users away from login/register
  if (
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') &&
    user
  ) {
    const role = await getUserRole(user.id)
    
    // If admin, redirect to admin dashboard
    if (role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    
    // For regular users, check if they have a participant record
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (participant) {
      // User has completed registration, redirect to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // If no participant record, allow them to stay on register page to complete registration
    // Don't redirect - let them complete the registration process
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

