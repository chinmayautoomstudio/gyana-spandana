import { Suspense, type ReactNode } from 'react'
import { DashboardAuthGate } from '@/components/dashboard/DashboardAuthGate'
import { DashboardLottieLoader } from '@/components/loading/DashboardLottieLoader'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLottieLoader />}>
      <DashboardAuthGate>{children}</DashboardAuthGate>
    </Suspense>
  )
}
