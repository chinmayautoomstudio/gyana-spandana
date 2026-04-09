'use client'

import { useAppNavigation } from '@/components/navigation/NavigationTransitionContext'

export function NavigationProgressBar() {
  const { isPending } = useAppNavigation()

  if (!isPending) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[110] h-1 overflow-hidden bg-white/10 pointer-events-none"
      role="progressbar"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-full w-2/5 max-w-[240px] rounded-r-full bg-gradient-to-r from-[#C0392B] via-[#E67E22] to-[#C0392B] shadow-[0_0_14px_rgba(192,57,43,0.45)] animate-nav-progress-bar" />
    </div>
  )
}
