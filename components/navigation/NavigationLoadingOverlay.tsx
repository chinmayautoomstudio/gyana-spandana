'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { useAppNavigation } from './NavigationTransitionContext'
import { getDashboardLottieData, type DashboardLottieJson } from '@/lib/loading/dashboard-lottie-data'

/**
 * Shows the full-screen Lottie loader immediately when the user initiates
 * navigation toward /dashboard or /admin.  This covers the brief blank/black
 * window that appears between the source page unmounting and the destination
 * page mounting.
 */
export function NavigationLoadingOverlay() {
  const { isPending, pendingHref } = useAppNavigation()
  const [animationData, setAnimationData] = useState<DashboardLottieJson | null>(null)
  const [mounted, setMounted] = useState(false)
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  // Only show when navigating toward dashboard/admin routes
  const isDashboardNav =
    isPending &&
    pendingHref != null &&
    (pendingHref.startsWith('/dashboard') || pendingHref.startsWith('/admin'))

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isDashboardNav) return
    let cancelled = false
    getDashboardLottieData()
      .then((data) => { if (!cancelled) setAnimationData(data) })
      .catch(() => { if (!cancelled) setAnimationData(null) })
    return () => { cancelled = true }
  }, [isDashboardNav])

  if (!mounted || !isDashboardNav) return null

  const overlay = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '28rem',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="sr-only">Loading…</span>
        {animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop
            autoplay
            style={{ width: '100%', maxWidth: '280px', aspectRatio: '1 / 1' }}
            aria-hidden
          />
        ) : (
          <div
            aria-hidden
            style={{
              height: '3rem',
              width: '3rem',
              borderRadius: '9999px',
              borderWidth: '4px',
              borderStyle: 'solid',
              borderColor: 'rgba(192, 57, 43, 0.25)',
              borderTopColor: '#C0392B',
              animation: 'spin 0.75s linear infinite',
            }}
          />
        )}
        <p
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#4b5563',
          }}
        >
          Loading your dashboard…
        </p>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
