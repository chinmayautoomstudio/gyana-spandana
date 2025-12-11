'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from './NotificationBell'
import { SettingsDropdown } from './SettingsDropdown'
import { ProfileDropdown } from './ProfileDropdown'

interface AdminHeaderProps {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname()
  const [userName, setUserName] = useState('Admin')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('admin')

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || '')

        // Try to get name from user_profiles first
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, role')
          .eq('user_id', user.id)
          .single()

        if (profile?.name) {
          setUserName(profile.name)
        } else {
          // Try participants table as fallback
          const { data: participant } = await supabase
            .from('participants')
            .select('name')
            .eq('user_id', user.id)
            .single()

          if (participant?.name) {
            setUserName(participant.name)
          } else {
            // Final fallback to email prefix
            setUserName(user.email?.split('@')[0] || 'Admin')
          }
        }

        if (profile?.role) {
          setUserRole(profile.role)
        } else {
          setUserRole('admin') // Default for admin layout
        }
      }
    }

    fetchUserData()
  }, [])


  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm max-w-full overflow-x-hidden">
      <div className="px-4 sm:px-6 lg:px-8 max-w-full">
        <div className="flex items-center justify-between h-16 min-w-0">
          {/* Left Section - Mobile Menu Button (for sidebar toggle) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center Section - Spacer (navigation is in sidebar) */}
          <div className="flex-1 min-w-0"></div>

          {/* Right Section - Notifications, Settings, Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell />
            <SettingsDropdown />
            <ProfileDropdown userName={userName} userEmail={userEmail} userRole={userRole} />
          </div>
        </div>
      </div>
    </header>
  )
}

