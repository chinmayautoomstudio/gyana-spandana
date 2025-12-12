'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  
  // Pages that should NOT have Navbar and Footer
  const hideNavFooter = 
    ['/login', '/register'].includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile/edit')
  
  // Pages that should have transparent navbar (homepage)
  const isHomePage = pathname === '/'

  return (
    <>
      {!hideNavFooter && <Navbar />}
      {children}
      {!hideNavFooter && <Footer />}
    </>
  )
}

