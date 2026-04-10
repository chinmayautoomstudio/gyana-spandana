/**
 * Validates redirect targets for post-login / proxy redirects (open-redirect hardening).
 * Accepts only same-origin path + optional query; rejects external URLs and auth pages.
 */
export function parseSafeInternalRedirectPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  let decoded: string
  try {
    decoded = decodeURIComponent(String(raw).trim())
  } catch {
    return null
  }
  if (decoded.includes('://') || decoded.includes('\\')) return null
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  const q = decoded.indexOf('?')
  const pathname = q === -1 ? decoded : decoded.slice(0, q)
  const search = q === -1 ? '' : decoded.slice(q)
  if (pathname === '/login' || pathname === '/signup') return null
  return `${pathname}${search}`
}

export function resolvePostLoginRedirectPath(options: {
  role: string
  redirectedFromParam: string | null
}): string {
  const { role, redirectedFromParam } = options
  const safe = parseSafeInternalRedirectPath(redirectedFromParam)
  const safePath = safe?.split('?')[0] ?? ''

  if (role === 'admin') {
    if (safe && safePath.startsWith('/admin')) return safe
    return '/admin'
  }
  if (role === 'host') {
    if (safe && safePath.startsWith('/host')) return safe
    return '/host'
  }
  if (safe) return safe
  return '/dashboard'
}

/**
 * Validates a post-login redirect path (open-redirect safe). Returns pathname only, or null.
 */
export function getSafeInternalPath(path: string | null | undefined): string | null {
  if (path == null || path === '') return null
  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) return null
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//')) return null
  if (trimmed.includes('\\')) return null
  if (trimmed.includes('@')) return null

  const pathname = trimmed.split('?')[0].split('#')[0]
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return null

  if (/^\/(login|signup)(\/|$)/i.test(pathname)) return null

  return pathname
}

/**
 * Whether the pathname is allowed as OAuth/callback `next` or post-login navigation.
 */
export function isAllowedPostLoginPath(pathname: string): boolean {
  if (pathname === '/auth/reset-password') return true
  if (pathname === '/dashboard') return true
  if (pathname === '/team/create') return true
  if (pathname === '/profile/edit') return true
  if (pathname === '/exams') return true
  if (pathname.startsWith('/exams/')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  if (pathname === '/host' || pathname.startsWith('/host/')) return true
  if (pathname.startsWith('/team/')) return true
  if (pathname.startsWith('/register/invite/')) return true
  return false
}

/**
 * Resolves post-login target: safe `redirectedFrom` / `next` if allowed, else default for role.
 */
export function resolvePostLoginPath(
  candidate: string | null | undefined,
  role: 'admin' | string
): string {
  const safe = getSafeInternalPath(candidate)
  if (safe && isAllowedPostLoginPath(safe)) {
    if (role !== 'admin' && (safe === '/admin' || safe.startsWith('/admin/'))) {
      return '/dashboard'
    }
    if (role !== 'host' && (safe === '/host' || safe.startsWith('/host/'))) {
      return '/dashboard'
    }
    return safe
  }
  if (role === 'admin') return '/admin'
  if (role === 'host') return '/host'
  return '/dashboard'
}
