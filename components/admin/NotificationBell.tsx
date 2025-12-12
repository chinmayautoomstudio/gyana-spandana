'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient()
      // For now, we'll use a placeholder. In a real app, you'd have a notifications table
      // const { data } = await supabase.from('notifications').select('*').eq('read', false)
      setUnreadCount(0) // Placeholder
      setNotifications([]) // Placeholder
    }

    fetchNotifications()

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
    const dropdownWidth = 320 // w-80 = 20rem = 320px
    const dropdownMaxHeight = 384 // max-h-96 = 24rem = 384px
    const dropdownMinHeight = 120 // Minimum height (header + empty state)
    const spacing = 8 // mt-2 = 0.5rem = 8px
    const viewportPadding = 16 // Padding from viewport edges
    
    // Calculate initial position: below button, aligned to right
    let top = buttonRect.bottom + spacing
    let right = window.innerWidth - buttonRect.right

    // Ensure dropdown doesn't overflow viewport bottom
    // If dropdown would go off bottom, position it above the button
    if (top + dropdownMaxHeight > window.innerHeight - viewportPadding) {
      // Try positioning above
      const topAbove = buttonRect.top - dropdownMaxHeight - spacing
      if (topAbove >= viewportPadding) {
        top = topAbove
      } else {
        // If it doesn't fit above either, position at top of viewport and limit height
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

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          ref={dropdownMenuRef}
          className="fixed w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-[60] max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.created_at}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

