/**
 * Simple in-memory sliding-window rate limiter.
 * No external dependencies required.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
 *   const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
 *   if (!limiter.check(ip)) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 */

interface RateLimiterOptions {
  /** Maximum number of requests allowed per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

interface RequestRecord {
  count: number
  windowStart: number
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { limit, windowMs } = options
  // Map of identifier (IP) → request record
  const store = new Map<string, RequestRecord>()

  // Periodically purge stale entries to prevent unbounded memory growth
  const purgeInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
      if (now - record.windowStart > windowMs) {
        store.delete(key)
      }
    }
  }, windowMs)

  // Allow Node.js to exit even if this interval is still running
  if (purgeInterval.unref) purgeInterval.unref()

  return {
    /**
     * Returns true if the request is within the rate limit, false if it should be rejected.
     * @param identifier - Typically the caller's IP address
     */
    check(identifier: string): boolean {
      const now = Date.now()
      const record = store.get(identifier)

      if (!record || now - record.windowStart > windowMs) {
        // Start a new window
        store.set(identifier, { count: 1, windowStart: now })
        return true
      }

      if (record.count >= limit) {
        return false
      }

      record.count += 1
      return true
    },
  }
}

/**
 * Helper: extract the caller's IP from a Next.js Request object.
 * Falls back to 'unknown' if no IP header is present.
 */
export function getCallerIp(request: Request): string {
  // x-forwarded-for may contain a comma-separated list; take the first entry
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
