'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { NavigationTransitionProvider } from '@/components/navigation/NavigationTransitionContext'
import { NavigationProgressBar } from '@/components/navigation/NavigationProgressBar'
import { NavigationLoadingOverlay } from '@/components/navigation/NavigationLoadingOverlay'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const hideNavFooter =
    ['/login', '/signup', '/register'].includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile/edit') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/team/create') ||
    pathname.startsWith('/register/invite')

  return (
    <NavigationTransitionProvider>
      <NavigationProgressBar />
      <NavigationLoadingOverlay />
      {!hideNavFooter && <Navbar />}
      {children}
      {!hideNavFooter && <Footer />}
    </NavigationTransitionProvider>
  )
}
