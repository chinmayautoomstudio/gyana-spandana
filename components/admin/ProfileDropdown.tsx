'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ProfileDropdownProps {
  userName: string
  userEmail: string
  userRole: string
}

export function ProfileDropdown({ userName, userEmail, userRole }: ProfileDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isClickInside =
        (containerRef.current && containerRef.current.contains(target)) ||
        (dropdownMenuRef.current && dropdownMenuRef.current.contains(target))
      
      if (!isClickInside) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const calculatePosition = () => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const dropdownWidth = 224 // w-56 = 14rem = 224px
    const dropdownHeight = 187 // Approximate height (will be adjusted if needed)
    const spacing = 8 // mt-2 = 0.5rem = 8px
    const viewportPadding = 16 // Padding from viewport edges
    
    // Calculate initial position: below button, aligned to right
    let top = buttonRect.bottom + spacing
    let right = window.innerWidth - buttonRect.right

    // Ensure dropdown doesn't overflow viewport bottom
    // If dropdown would go off bottom, position it above the button
    if (top + dropdownHeight > window.innerHeight - viewportPadding) {
      top = buttonRect.top - dropdownHeight - spacing
      // If it still doesn't fit above, position at top of viewport
      if (top < viewportPadding) {
        top = viewportPadding
      }
    }

    // Ensure dropdown doesn't overflow viewport right edge
    if (right < viewportPadding) {
      right = viewportPadding
    }

    // Ensure dropdown doesn't overflow viewport left edge
    if (right + dropdownWidth > window.innerWidth - viewportPadding) {
      right = window.innerWidth - dropdownWidth - viewportPadding
    }

    setDropdownPosition({ top, right })
  }

  useEffect(() => {
    // Calculate dropdown position when it opens or window resizes
    if (showDropdown) {
      calculatePosition()

      // Recalculate on window resize
      const handleResize = () => {
        calculatePosition()
      }

      // Recalculate on scroll (in case header scrolls)
      const handleScroll = () => {
        calculatePosition()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true) // Use capture to catch all scroll events

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [showDropdown])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-[#E67E22]">
            {getInitials(userName)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-[#C0392B] capitalize">{userRole}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div
          ref={dropdownMenuRef}
          className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[60]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <div className="py-1">
            <Link
              href="/admin/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              View Profile
            </Link>
            <Link
              href="/admin/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

