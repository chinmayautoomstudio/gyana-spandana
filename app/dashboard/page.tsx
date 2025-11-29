'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ProfileCompletionModal } from '@/components/ui/ProfileCompletionModal'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [participantData, setParticipantData] = useState<any>(null)
  const [teammateData, setTeammateData] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasSkippedProfile, setHasSkippedProfile] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Check user role - admins should not access participant dashboard
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single()

      const role = profile?.role || currentUser.user_metadata?.role || 'participant'
      
      if (role === 'admin') {
        router.push('/admin')
        return
      }

      // Fetch participant data using user_id
      const { data: participant } = await supabase
        .from('participants')
        .select('*, teams(team_name, team_code, created_at)')
        .eq('user_id', currentUser.id)
        .single()

      if (participant) {
        setParticipantData(participant)

        // Check if profile needs to be completed
        // Only show modal if:
        // 1. Profile is not completed
        // 2. Modal hasn't been shown before (checked via localStorage)
        if (!participant.profile_completed) {
          // Check localStorage only in browser environment
          if (typeof window !== 'undefined') {
            const modalDismissedKey = `profile_modal_dismissed_${currentUser.id}`
            const hasModalBeenShown = localStorage.getItem(modalDismissedKey) === 'true'
            
            if (!hasModalBeenShown) {
              setShowProfileModal(true)
            }
          } else {
            // If localStorage not available, show modal (first time)
            setShowProfileModal(true)
          }
        }

        // Fetch teammate data (the other participant in the same team)
        if (participant.team_id) {
          const { data: teammate } = await supabase
            .from('participants')
            .select('name, email, school_name, is_participant1')
            .eq('team_id', participant.team_id)
            .neq('user_id', currentUser.id)
            .single()

          setTeammateData(teammate)
        }
      }

      setLoading(false)
    }

    fetchUser()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleProfileComplete = async () => {
    // Refresh participant data
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser) {
      const { data: participant } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('user_id', currentUser.id)
        .single()

      if (participant) {
        setParticipantData(participant)
        setShowProfileModal(false)
        setHasSkippedProfile(false)
        
        // Save to localStorage so modal doesn't show again (profile is now completed)
        if (typeof window !== 'undefined') {
          const modalDismissedKey = `profile_modal_dismissed_${currentUser.id}`
          localStorage.setItem(modalDismissedKey, 'true')
        }
      }
    }
  }

  const handleProfileSkip = () => {
    setShowProfileModal(false)
    setHasSkippedProfile(true)
    
    // Save to localStorage so modal doesn't show again on future logins
    if (user && typeof window !== 'undefined') {
      const modalDismissedKey = `profile_modal_dismissed_${user.id}`
      localStorage.setItem(modalDismissedKey, 'true')
    }
  }

  // Format Aadhar for display (show only last 4 digits)
  const formatAadhar = (aadhar: string) => {
    if (!aadhar || aadhar.length !== 12) return aadhar
    return `**** **** ${aadhar.slice(8)}`
  }

  // Format phone number
  const formatPhone = (phone: string) => {
    if (!phone || phone.length !== 10) return phone
    return `${phone.slice(0, 5)} ${phone.slice(5)}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      {/* Profile Completion Modal */}
      {showProfileModal && (
        <ProfileCompletionModal onComplete={handleProfileComplete} onSkip={handleProfileSkip} />
      )}

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-white/70 backdrop-blur-xl border-r border-white/20
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  GS
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent">
                  Gyana Spandana
                </h1>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#C0392B]/10 text-[#C0392B] font-medium transition-all hover:bg-[#C0392B]/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </a>
              <Link
                href="/profile/edit"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 font-medium transition-all hover:bg-white/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 font-medium transition-all hover:bg-white/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team
              </a>
              <Link
                href="/exams"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 font-medium transition-all hover:bg-white/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Available Exams
              </Link>
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/20">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4 min-w-0">
                {/* Left Section */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      Welcome back, <span className="font-medium">{participantData?.name || user?.email}</span> 👋
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Dashboard</h2>
                  </div>
                </div>
                
                {/* Right Section */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Search icon - hidden on very small screens */}
                  <button className="hidden sm:flex p-2 rounded-lg hover:bg-white/50 transition-colors" title="Search">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {/* Notification icon - hidden on very small screens */}
                  <button className="hidden sm:flex p-2 rounded-lg hover:bg-white/50 transition-colors relative" title="Notifications">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  {/* User profile */}
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200">
                    {participantData?.profile_photo_url ? (
                      <img
                        src={participantData.profile_photo_url}
                        alt={participantData?.name || 'Profile'}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-semibold shadow-lg flex-shrink-0 text-xs sm:text-sm">
                        {participantData?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="hidden md:block min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{participantData?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{participantData?.email || user?.email}</p>
                    </div>
                  </div>
                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors font-medium flex-shrink-0"
                    title="Logout"
                  >
                    <span className="hidden sm:inline">Logout</span>
                    <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Participant Profile Card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C0392B]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#C0392B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
                  </div>
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm">
                      Edit Profile
                    </Button>
                  </Link>
                </div>

                {/* Profile Photo Display */}
                {participantData?.profile_photo_url && (
                  <div className="mb-6 flex justify-center">
                    <img
                      src={participantData.profile_photo_url}
                      alt={participantData?.name || 'Profile'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Full Name
                    </span>
                    <p className="text-lg text-gray-900 mt-1">{participantData?.name || 'N/A'}</p>
                  </div>

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Address
                    </span>
                    <p className="text-lg text-gray-900 mt-1 break-all">{participantData?.email || 'N/A'}</p>
                    {participantData?.email_verified && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Phone Number
                    </span>
                    <p className="text-lg text-gray-900 mt-1">{participantData?.phone ? formatPhone(participantData.phone) : 'N/A'}</p>
                    {participantData?.phone_verified && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Gender
                    </span>
                    <p className="text-lg text-gray-900 mt-1">{participantData?.gender || 'N/A'}</p>
                  </div>

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      School / College Name
                    </span>
                    <p className="text-lg text-gray-900 mt-1">{participantData?.school_name || 'N/A'}</p>
                  </div>

                  {participantData?.address && (
                    <div className="pb-4 border-b border-gray-200/50">
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Address
                      </span>
                      <p className="text-lg text-gray-900 mt-1 whitespace-pre-line">{participantData.address}</p>
                    </div>
                  )}

                  {participantData?.school_address && (
                    <div className="pb-4 border-b border-gray-200/50">
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        School / College Address
                      </span>
                      <p className="text-lg text-gray-900 mt-1 whitespace-pre-line">{participantData.school_address}</p>
                    </div>
                  )}

                  {participantData?.class && (
                    <div className="pb-4 border-b border-gray-200/50">
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Class / Grade
                      </span>
                      <p className="text-lg text-gray-900 mt-1">{participantData.class}</p>
                    </div>
                  )}

                  {participantData?.date_of_birth && (
                    <div className="pb-4 border-b border-gray-200/50">
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date of Birth
                      </span>
                      <p className="text-lg text-gray-900 mt-1">
                        {participantData.date_of_birth ? formatDate(participantData.date_of_birth) : 'N/A'}
                      </p>
                    </div>
                  )}

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h4a2 2 0 012 2v1m-4 0a2 2 0 002 2m-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1m4 0h.01" />
                      </svg>
                      Aadhar Number
                    </span>
                    <p className="text-lg text-gray-900 mt-1 font-mono">
                      {participantData?.aadhar ? formatAadhar(participantData.aadhar) : 'N/A'}
                    </p>
                  </div>

                  <div className="pb-4 border-b border-gray-200/50">
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Role
                    </span>
                    <p className="text-lg text-gray-900 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/30">
                        {participantData?.is_participant1 ? 'Participant 1' : 'Participant 2'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Registered On
                    </span>
                    <p className="text-lg text-gray-900 mt-1">
                      {participantData?.created_at ? formatDate(participantData.created_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Information Card */}
              {participantData?.teams && (
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[#E67E22]/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Information</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-[#C0392B]/10 to-[#E67E22]/10 rounded-xl p-4 border border-[#C0392B]/30 backdrop-blur-sm">
                      <span className="text-sm font-medium text-gray-500">Team Name</span>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{participantData.teams.team_name}</p>
                    </div>

                    {participantData.teams.team_code && (
                      <div className="bg-gradient-to-r from-[#E67E22]/10 to-[#F39C12]/10 rounded-xl p-4 border border-[#E67E22]/30 backdrop-blur-sm">
                        <span className="text-sm font-medium text-gray-500">Team ID</span>
                        <p className="text-2xl font-bold text-[#C0392B] font-mono mt-1">{participantData.teams.team_code}</p>
                        <p className="text-xs text-gray-500 mt-2">Save this Team ID for future reference</p>
                      </div>
                    )}

                    {teammateData && (
                      <div className="border border-gray-200/50 rounded-xl p-4 bg-white/30 backdrop-blur-sm">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Your Teammate
                        </span>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-gray-900">{teammateData.name}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {teammateData.school_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {teammateData.is_participant1 ? 'Participant 1' : 'Participant 2'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200/50">
                      <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Team Created
                      </span>
                      <p className="text-lg text-gray-900 mt-1">
                        {participantData.teams.created_at ? formatDate(participantData.teams.created_at) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Status Card */}
            <div className="mt-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Quiz Status</h2>
              </div>
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 bg-gray-100/50 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg mb-2 font-medium">
                  Quiz functionality will be available soon
                </p>
                <p className="text-gray-500 text-sm">
                  Please wait for further instructions from the organizers.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
