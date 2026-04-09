'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { useAppNavigation } from '@/components/navigation/NavigationTransitionContext'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { navigate, isPending, pendingHref } = useAppNavigation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const linkPending = (href: string) => isPending && pendingHref === href

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const applyInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setUser(null)
        return
      }
      const res = await fetch('/api/auth/validate', { credentials: 'include' })
      if (res.status === 401) {
        await supabase.auth.signOut()
        setUser(null)
        return
      }
      setUser(session.user)
    }

    applyInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null)
        return
      }
      if (event === 'INITIAL_SESSION') return
      setUser(session.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setMobileMenuOpen(false)
      navigate('/')
    } finally {
      setLogoutLoading(false)
    }
  }

  useEffect(() => {
    router.prefetch('/login')
    router.prefetch('/signup')
    router.prefetch('/dashboard')
  }, [router])

  const useSolidNav = pathname !== '/' || scrolled || mobileMenuOpen

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#faq', label: 'FAQ' },
  ]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    if (href.startsWith('/#')) {
      const hash = href.substring(2)

      if (pathname === '/') {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
        return
      }

      navigate('/')
      setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 120)
      return
    }

    navigate(href)
  }

  const navLinkClass = useSolidNav
    ? 'text-gray-700 hover:text-[#C0392B]'
    : 'text-white hover:text-[#E67E22]'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        mobileMenuOpen
          ? 'bg-white shadow-lg border-b border-gray-200'
          : useSolidNav
            ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-white/20'
            : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              navigate('/')
            }}
            className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B] focus-visible:ring-offset-2"
            aria-label="GYANA SPARDHA home"
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src="/images/logo.webp"
                alt=""
                width={40}
                height={40}
                className="object-contain rounded-lg"
              />
            </div>
            <span
              className={`text-xl font-bold transition-all ${
                useSolidNav
                  ? 'bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent'
                  : 'text-white drop-shadow-lg'
              }`}
            >
              GYANA SPARDHA
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-sm font-medium transition-colors ${navLinkClass}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={useSolidNav ? 'text-gray-700' : 'text-white'}
                  onClick={() => navigate('/dashboard')}
                  isLoading={linkPending('/dashboard')}
                  loadingText="Loading…"
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={logoutLoading}
                  loadingText="Signing out…"
                  className={useSolidNav ? 'text-gray-700 border-gray-300' : 'text-white border-white/60'}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={useSolidNav ? 'text-gray-700' : 'text-white'}
                  onClick={() => navigate('/login')}
                  isLoading={linkPending('/login')}
                  loadingText="Loading…"
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/signup')}
                  isLoading={linkPending('/signup')}
                  loadingText="Loading…"
                >
                  Sign up
                </Button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              useSolidNav ? 'text-gray-700' : 'text-white'
            }`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200/20 mt-4 pt-4 bg-white rounded-b-lg">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-sm font-medium text-gray-700 hover:text-[#C0392B] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                {user ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/dashboard')
                      }}
                      isLoading={linkPending('/dashboard')}
                      loadingText="Loading…"
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={handleLogout}
                      isLoading={logoutLoading}
                      loadingText="Signing out…"
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/login')
                      }}
                      isLoading={linkPending('/login')}
                      loadingText="Loading…"
                    >
                      Login
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/signup')
                      }}
                      isLoading={linkPending('/signup')}
                      loadingText="Loading…"
                    >
                      Sign up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
