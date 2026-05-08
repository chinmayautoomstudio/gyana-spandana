'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { TopAnnouncementBar } from './TopAnnouncementBar'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Pages that should NOT have Navbar and Footer
  const hideNavFooter = 
    ['/login', '/signup', '/register'].includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/host') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/profile/edit') ||
    pathname.startsWith('/exams') ||  // Hide navbar/footer for all exam pages (including /exams list)
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/team/create') ||
    pathname.startsWith('/register/invite')  // P2 registration via invitation link

  return (
    <>
      {!hideNavFooter && <Navbar />}
      {!hideNavFooter && <TopAnnouncementBar />}
      {children}
      {!hideNavFooter && <Footer />}
    </>
  )
}

