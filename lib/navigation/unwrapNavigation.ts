'use client'

import { use, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

/**
 * Next.js 15/16 instruments dynamic `params` as an async Promise-like proxy in dev mode.
 * Accessing properties on the proxy directly (e.g. via React DevTools' Object.keys())
 * triggers the "params is a Promise" warning.
 *
 * Fix: unwrap via `use(Promise.resolve(...))` AND then shallow-copy the result into a
 * brand-new plain object so the instrumented proxy never escapes this hook.
 */
export function useResolvedParams<
  T extends Record<string, string | string[] | undefined> = Record<string, string | string[] | undefined>,
>(): T {
  const raw = useParams() as T | Promise<T>
  const resolved = use(Promise.resolve(raw)) as T
  // Shallow-copy into a plain object to strip the Proxy trap.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useMemo(() => ({ ...resolved }) as T, [resolved])
}

/**
 * Plain URLSearchParams snapshot so serializers never hit Next's instrumented searchParams object.
 * The `toString()` + re-parse pattern breaks the proxy chain entirely.
 */
export function useStableSearchParams(): URLSearchParams {
  const sp = useSearchParams()
  return useMemo(() => new URLSearchParams(sp.toString()), [sp])
}
