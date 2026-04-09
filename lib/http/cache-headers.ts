/** Cache-Control for authenticated, read-only JSON APIs (CDN may cache with s-maxage) */
export const READONLY_PRIVATE_CACHE =
  'private, s-maxage=30, stale-while-revalidate=60' as const
