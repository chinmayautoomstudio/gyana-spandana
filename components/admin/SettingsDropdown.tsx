'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export function SettingsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownMenuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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
    const dropdownHeight = 140 // Approximate height (3 menu items)
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

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          <div className="py-1">
            <Link
              href="/admin/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              General Settings
            </Link>
            <Link
              href="/admin/settings/appearance"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              Appearance
            </Link>
            <Link
              href="/admin/settings/account"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              Account Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

