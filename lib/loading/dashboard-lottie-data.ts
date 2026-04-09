export type DashboardLottieJson = Record<string, unknown>

let cached: Promise<DashboardLottieJson> | null = null

/**
 * Single shared fetch for dashboard Lottie JSON (avoids refetch/restart when Suspense remounts fallbacks).
 */
export function getDashboardLottieData(): Promise<DashboardLottieJson> {
  if (!cached) {
    cached = fetch('/animations/dashboard-loading.json').then((res) => {
      if (!res.ok) throw new Error(`Failed to load animation: ${res.status}`)
      return res.json() as Promise<DashboardLottieJson>
    })
  }
  return cached
}
