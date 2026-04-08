import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes that need a validated session (getUser hits Auth server).
 * Dashboard, login, and signup rely on server layouts instead — avoids duplicate DB/auth work.
 */
function needsFullUserValidation(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/team/create')
  )
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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
          cookiesToSet.forEach(({ name, value }) =>
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

  if (needsFullUserValidation(pathname)) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (pathname.startsWith('/admin') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/exams') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/team/create') && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Cookie refresh without validating every JWT against Auth (faster for marketing + dashboard entry).
  await supabase.auth.getSession()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
