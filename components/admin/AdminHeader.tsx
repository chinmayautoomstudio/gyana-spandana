'use client'

import { NotificationBell } from './NotificationBell'
import { ProfileDropdown } from './ProfileDropdown'

interface AdminHeaderProps {
  userName: string
  userEmail: string
  userRole: string
  onMenuClick?: () => void
}

export function AdminHeader({ userName, userEmail, userRole, onMenuClick }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm max-w-full">
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
            <ProfileDropdown userName={userName} userEmail={userEmail} userRole={userRole} />
          </div>
        </div>
      </div>
    </header>
  )
}

