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

  // Avoid redirect loops
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
    return safe
  }
  return role === 'admin' ? '/admin' : '/dashboard'
}
