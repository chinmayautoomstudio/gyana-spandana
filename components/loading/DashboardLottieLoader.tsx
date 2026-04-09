'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { getDashboardLottieData, type DashboardLottieJson } from '@/lib/loading/dashboard-lottie-data'

/**
 * Full-viewport dashboard loading UI: white canvas, centered Lottie, portaled to document.body after mount.
 */
export function DashboardLottieLoader() {
  const [animationData, setAnimationData] = useState<DashboardLottieJson | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)

  const handleDOMLoaded = () => {
    const api = lottieRef.current
    const item = api?.animationItem
    if (item) {
      item.loop = true
    }
    api?.play()
  }

  const handleComplete = () => {
    lottieRef.current?.goToAndPlay(0, true)
  }

  useLayoutEffect(() => {
    // One-shot: move overlay to document.body so `position:fixed` is viewport-relative (not clipped by transformed ancestors).
    setPortalReady(true) // eslint-disable-line react-hooks/set-state-in-effect -- intentional one-shot portal attach
  }, [])

  useEffect(() => {
    let cancelled = false
    getDashboardLottieData()
      .then((data) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const overlay = (
    <div
      className="fixed inset-0 z-[90] flex min-h-[100dvh] w-full flex-col items-center justify-center bg-white px-4"
      style={{ 
        backgroundColor: '#ffffff',
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        minHeight: '100dvh',
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="flex w-full max-w-md flex-col items-center justify-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '28rem',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="sr-only">Loading dashboard</span>
        {animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={true}
            autoplay={true}
            onDOMLoaded={handleDOMLoaded}
            onComplete={handleComplete}
            className="aspect-square w-full max-w-[280px] sm:max-w-[320px]"
            aria-hidden
          />
        ) : (
          <div
            className="flex aspect-square w-full max-w-[280px] items-center justify-center sm:max-w-[320px]"
            aria-hidden
            style={{
              display: 'flex',
              aspectRatio: '1 / 1',
              width: '100%',
              maxWidth: '280px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div 
              className="h-12 w-12 animate-spin rounded-full border-4 border-[#C0392B]/25 border-t-[#C0392B]" 
              style={{
                height: '3rem',
                width: '3rem',
                borderRadius: '9999px',
                borderWidth: '4px',
                borderColor: 'rgba(192, 57, 43, 0.25)',
                borderTopColor: '#C0392B',
              }}
            />
          </div>
        )}
        <p className="mt-4 text-center text-sm font-medium text-gray-600">Loading your dashboard…</p>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return overlay
  }

  if (portalReady) {
    return createPortal(overlay, document.body)
  }

  return overlay
}
