'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationAsRead, deleteAllNotifications } from '@/app/actions/notification'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  link?: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (data) {
        setNotifications(data)
        const unread = data.filter((n: Notification) => !n.read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error('Error fetching notifications:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      await fetchNotifications()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void fetchNotifications()
          }
        )
        .subscribe()
    }

    void init()

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setShowClearConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      if (error) throw error

      // Update local state optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Use custom confirm UI so the button always does something visible (avoids browser blocking native confirm()).
  const handleClearAllClick = () => {
    console.log('handleClearAll called')
    setShowClearConfirm(true)
  }

  const confirmClearAll = async () => {
    console.log('User confirmed, calling deleteAllNotifications')
    try {
      const result = await deleteAllNotifications()
      console.log('Result:', result)
      if (result.success) {
        setNotifications([])
        setUnreadCount(0)
        setShowClearConfirm(false)
      } else {
        throw result.error
      }
    } catch (error) {
      console.error('Error in handleClearAll:', error)
      setShowClearConfirm(false)
    }
  }

  const cancelClearAll = () => {
    console.log('User cancelled')
    setShowClearConfirm(false)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
      setShowDropdown(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (showDropdown) setShowClearConfirm(false)
          setShowDropdown(!showDropdown)
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex gap-2">
              {showClearConfirm ? (
                <>
                  <span className="text-xs text-gray-600 self-center">Clear all?</span>
                  <button
                    type="button"
                    onClick={confirmClearAll}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={cancelClearAll}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllClick}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                      }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.read ? 'bg-[#C0392B]' : 'bg-transparent'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 bg-gray-50 text-center">
            {/* <Link href="/notifications" className="text-xs text-gray-600 hover:text-gray-900 font-medium">
              View all notifications
            </Link> */}
          </div>
        </div>
      )}
    </div>
  )
}
