'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'

type AppNavigationContextValue = {
  isPending: boolean
  pendingHref: string | null
  navigate: (href: string) => void
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null)

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return
      setPendingHref(href)
      startTransition(() => {
        router.push(href)
      })
    },
    [pathname, router, startTransition]
  )

  const value = useMemo(
    () => ({
      isPending,
      pendingHref: isPending ? pendingHref : null,
      navigate,
    }),
    [isPending, pendingHref, navigate]
  )

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>
}

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext)
  if (!ctx) {
    throw new Error('useAppNavigation must be used within NavigationTransitionProvider')
  }
  return ctx
}
