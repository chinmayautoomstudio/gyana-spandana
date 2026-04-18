'use client'

import { useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

/**
 * Next.js 15/16 may instrument dynamic `params` as a Proxy in dev mode.
 * Accessing properties on the proxy directly (e.g. via React DevTools' Object.keys())
 * can trigger the "params is a Promise" warning.
 *
 * Fix: shallow-copy `useParams()` into a plain object so the instrumented proxy never escapes.
 * Do not use React's `use()` here — it requires a Suspense boundary and a stable Promise identity;
 * `Promise.resolve(raw)` on every render breaks that contract (React error #482).
 */
export function useResolvedParams<
  T extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>,
>(): T {
  const raw = useParams() as T
  return useMemo(() => ({ ...raw }) as T, [raw])
}

/**
 * Plain URLSearchParams snapshot so serializers never hit Next's instrumented searchParams object.
 * The `toString()` + re-parse pattern breaks the proxy chain entirely.
 */
export function useStableSearchParams(): URLSearchParams {
  const sp = useSearchParams()
  return useMemo(() => new URLSearchParams(sp.toString()), [sp])
}
