'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function HostDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [emailFallback, setEmailFallback] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setEmailFallback(user.email ?? '')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, role')
        .eq('user_id', user.id)
        .maybeSingle()
      const name = profile?.name?.trim()
      setDisplayName(name || user.email || '')
      setIsAdmin(profile?.role === 'admin')
    })()
  }, [])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const hostHomeActive = pathname === '/host'
  const navClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      active ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'text-gray-600 hover:bg-white/50'
    }`

  const welcomeName = displayName || emailFallback || 'Host'

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="flex">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-white/70 backdrop-blur-xl border-r border-white/20
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full min-h-screen lg:min-h-0">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image
                    src="/images/logo.webp"
                    alt="GYANA SPARDHA"
                    width={40}
                    height={40}
                    className="object-contain rounded-lg"
                  />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent">
                  GYANA SPARDHA
                </h1>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link
                href="/host"
                className={navClass(hostHomeActive)}
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Host home
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/quiz"
                  className={navClass(false)}
                  onClick={() => setSidebarOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Quiz sessions (admin)
                </Link>
              )}
              <Link
                href="/profile/edit"
                className={navClass(false)}
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </Link>
            </nav>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <div className="flex-1 lg:ml-0 w-full min-w-0">
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/20">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4 min-w-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-white/50 transition-colors"
                    aria-label="Open menu"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      Welcome back, <span className="font-medium">{welcomeName}</span>
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Host console</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors font-medium flex-shrink-0"
                >
                  <span className="hidden sm:inline">Log out</span>
                  <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
