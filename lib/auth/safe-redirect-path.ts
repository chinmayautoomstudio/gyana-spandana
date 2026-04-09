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
  if (safe) return safe
  return '/dashboard'
}
