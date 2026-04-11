'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { resendInvitation, updateTeamAuthority } from '@/app/actions/team'
import { ProfileCompletionModal } from '@/components/ui/ProfileCompletionModal'
import { updateExamStatuses } from '@/lib/utils/examScheduler'
import { NotificationBell } from '@/components/admin/NotificationBell'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

/** Single browser Supabase client per tab (avoids repeated client construction) */
let browserSupabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!browserSupabase) browserSupabase = createClient()
  return browserSupabase
}

const EXAM_STATUS_SYNC_KEY = 'exam_statuses_synced_session'

const PARTICIPANT_WITH_TEAM_SELECT = [
  'id',
  'user_id',
  'name',
  'email',
  'phone',
  'school_name',
  'is_participant1',
  'profile_completed',
  'profile_photo_url',
  'gender',
  'date_of_birth',
  'address',
  'school_address',
  'class',
  'aadhar',
  'created_at',
  'team_id',
  'email_verified',
  'phone_verified',
  'teams(team_name, team_code, created_at, status, p2_invited_email, team_name_renamed_at, authority_name, authority_email, authority_phone)',
].join(', ')

/** Row shape for participants select (explicit columns); avoids GenericStringError from dynamic select typing */
type DashboardParticipantRow = {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  school_name: string
  is_participant1: boolean
  profile_completed: boolean
  profile_photo_url: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  school_address: string | null
  class: string | null
  aadhar: string | null
  created_at: string
  team_id: string | null
  email_verified?: boolean | null
  phone_verified?: boolean | null
  teams: {
    team_name: string
    team_code: string
    created_at: string
    status: string
    p2_invited_email: string | null
    team_name_renamed_at: string | null
    authority_name: string | null
    authority_email: string | null
    authority_phone: string | null
  } | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [participantData, setParticipantData] = useState<any>(null)
  const [teammateData, setTeammateData] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [hasSkippedProfile, setHasSkippedProfile] = useState(false)
  const [availableExamsCount, setAvailableExamsCount] = useState<number>(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<'success' | 'error' | null>(null)
  const [showAuthorityForm, setShowAuthorityForm] = useState(false)
  const [authorityForm, setAuthorityForm] = useState({ name: '', email: '', phone: '' })
  const [authoritySaving, setAuthoritySaving] = useState(false)
  const [authorityError, setAuthorityError] = useState<string | null>(null)
  const [authorityFieldErrors, setAuthorityFieldErrors] = useState<{ email?: string; phone?: string }>({})
  const [showInvitationBanner, setShowInvitationBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('invitation_sent') === '1') {
      setShowInvitationBanner(true)
    }
  }, [])

  useEffect(() => {
    if (!showInvitationBanner) return
    const timer = setTimeout(() => {
      setShowInvitationBanner(false)
      router.replace('/dashboard')
    }, 5000)
    return () => clearTimeout(timer)
  }, [showInvitationBanner, router])

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabase()

      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (!currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)

        const [{ data: profile }, { data: participantRaw }] = await Promise.all([
          supabase.from('user_profiles').select('role').eq('user_id', currentUser.id).maybeSingle(),
          supabase
            .from('participants')
            .select(PARTICIPANT_WITH_TEAM_SELECT)
            .eq('user_id', currentUser.id)
            .maybeSingle(),
        ])
        const participant = participantRaw as DashboardParticipantRow | null

        const role = profile?.role || currentUser.user_metadata?.role || 'participant'

        if (role === 'admin') {
          router.push('/admin')
          return
        }

        if (!participant) {
          router.replace('/team/create')
          return
        }

        setParticipantData(participant)

        if (!participant.profile_completed && typeof window !== 'undefined') {
          const modalDismissedKey = `profile_modal_dismissed_${currentUser.id}`
          const hasModalBeenShown = localStorage.getItem(modalDismissedKey) === 'true'
          if (!hasModalBeenShown) setShowProfileModal(true)
        }

        const teammatePromise =
          participant.team_id != null
            ? supabase
                .from('participants')
                .select('name, email, school_name, is_participant1')
                .eq('team_id', participant.team_id)
                .neq('user_id', currentUser.id)
                .maybeSingle()
            : Promise.resolve({ data: null as { name: string; email: string; school_name: string; is_participant1: boolean } | null })

        const examSyncPromise = (async () => {
          if (typeof window !== 'undefined' && !sessionStorage.getItem(EXAM_STATUS_SYNC_KEY)) {
            await updateExamStatuses(supabase)
            sessionStorage.setItem(EXAM_STATUS_SYNC_KEY, '1')
          }
        })()

        const examsCountPromise = (async () => {
          try {
            const { getAvailableExams } = await import('@/app/actions/exam')
            const availableExams = await getAvailableExams()
            return availableExams.length
          } catch (e) {
            console.error('Error fetching available exams count:', e)
            return 0
          }
        })()

        const [{ data: teammate }, , count] = await Promise.all([teammatePromise, examSyncPromise, examsCountPromise])

        setTeammateData(teammate ?? null)
        setAvailableExamsCount(count)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => setLoading(false), 5000)

    fetchUser()

    return () => clearTimeout(timeoutId)
  }, [router])

  const handleLogout = async () => {
    const supabase = getSupabase()
    if (typeof window !== 'undefined') sessionStorage.removeItem(EXAM_STATUS_SYNC_KEY)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleProfileComplete = async () => {
    const supabase = getSupabase()
    const uid = user?.id
    if (!uid) return

    const { data: participant } = await supabase
      .from('participants')
      .select(PARTICIPANT_WITH_TEAM_SELECT)
      .eq('user_id', uid)
      .single()

    if (participant) {
      setParticipantData(participant)
      setShowProfileModal(false)
      setHasSkippedProfile(false)

      if (typeof window !== 'undefined') {
        const modalDismissedKey = `profile_modal_dismissed_${uid}`
        localStorage.setItem(modalDismissedKey, 'true')
      }
    }
  }

  const authorityEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const authorityPhoneRegex = /^[6-9]\d{9}$/

  const dismissInvitationBanner = () => {
    setShowInvitationBanner(false)
    router.replace('/dashboard')
  }

  const openAuthorityForm = () => {
    const t = participantData?.teams
    setAuthorityForm({
      name: t?.authority_name ?? '',
      email: t?.authority_email ?? '',
      phone: t?.authority_phone ?? '',
    })
    setAuthorityError(null)
    setAuthorityFieldErrors({})
    setShowAuthorityForm(true)
  }

  const handleSaveAuthority = async () => {
    if (!participantData?.team_id) return
    setAuthorityFieldErrors({})
    setAuthorityError(null)

    const emailTrimmed = authorityForm.email.trim()
    const phoneDigits = authorityForm.phone.replace(/\D/g, '')

    if (emailTrimmed && !authorityEmailRegex.test(emailTrimmed)) {
      setAuthorityFieldErrors((e) => ({ ...e, email: 'Invalid email address' }))
      return
    }
    if (phoneDigits && !authorityPhoneRegex.test(phoneDigits)) {
      setAuthorityFieldErrors((e) => ({ ...e, phone: 'Phone must be a valid 10-digit Indian mobile number' }))
      return
    }

    setAuthoritySaving(true)
    const result = await updateTeamAuthority(participantData.team_id, {
      name: authorityForm.name || null,
      email: emailTrimmed || null,
      phone: phoneDigits || null,
    })
    setAuthoritySaving(false)
    if (!result.success) {
      setAuthorityError(result.error)
      return
    }
    setShowAuthorityForm(false)
    const supabase = getSupabase()
    const uid = user?.id
    if (!uid) return
    const { data: participant } = await supabase
      .from('participants')
      .select(PARTICIPANT_WITH_TEAM_SELECT)
      .eq('user_id', uid)
      .single()
    if (participant) setParticipantData(participant)
  }

  const handleResendInvitation = async () => {
    if (!participantData?.team_id) return
    setResendLoading(true)
    setResendMessage(null)
    const result = await resendInvitation(participantData.team_id)
    if (result.success) {
      setResendMessage('success')
    } else {
      setResendMessage('error')
    }
    setResendLoading(false)
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
    return <DashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      {/* Profile Completion Modal */}
      {showProfileModal && (
        <ProfileCompletionModal
          onComplete={handleProfileComplete}
          onSkip={handleProfileSkip}
          initialDateOfBirth={participantData?.date_of_birth}
        />
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
                  <div className="hidden sm:flex relative" title="Notifications">
                    <NotificationBell />
                  </div>
                  {/* User profile */}
                  <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200">
                    {participantData?.profile_photo_url ? (
                      <Image
                        src={participantData.profile_photo_url}
                        alt={participantData?.name || 'Profile'}
                        width={40}
                        height={40}
                        unoptimized
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
            {showInvitationBanner && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 relative pr-10">
                <p className="text-green-800 text-sm">Invitation sent to your teammate. They will receive an email to complete registration.</p>
                <button
                  type="button"
                  onClick={dismissInvitationBanner}
                  className="absolute top-3 right-3 p-1 rounded text-green-700 hover:bg-green-100 transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {participantData?.teams?.status === 'pending_p2' && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-amber-800 text-sm">
                    Waiting for <strong>{participantData.teams.p2_invited_email || 'your teammate'}</strong> to complete registration.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/team/update-p2-email">
                      <Button variant="outline" size="sm" type="button">
                        Update P2 email
                      </Button>
                    </Link>
                    {participantData?.is_participant1 &&
                      !participantData?.teams?.team_name_renamed_at && (
                        <Link href="/team/rename-once">
                          <Button variant="outline" size="sm" type="button">
                            Rename team (one-time)
                          </Button>
                        </Link>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendInvitation}
                      isLoading={resendLoading}
                      loadingText="Sending..."
                    >
                      Resend invitation
                    </Button>
                  </div>
                </div>
                {resendMessage === 'success' && <span className="text-green-600 text-sm">Invitation resent.</span>}
                {resendMessage === 'error' && <span className="text-red-600 text-sm">Failed to resend.</span>}
              </div>
            )}
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
                    <Image
                      src={participantData.profile_photo_url}
                      alt={participantData?.name || 'Profile'}
                      width={128}
                      height={128}
                      unoptimized
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
                <div id="team" className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Team Name</span>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{participantData.teams.team_name}</p>
                        </div>
                        {participantData.is_participant1 &&
                          !participantData.teams.team_name_renamed_at &&
                          participantData.teams.status === 'complete' && (
                            <Link href="/team/rename-once">
                              <Button variant="outline" size="sm" type="button">
                                Rename team (one-time)
                              </Button>
                            </Link>
                          )}
                      </div>
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

                    <div className="pt-4 border-t border-gray-200/50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          School / College Authority
                        </span>
                        {!showAuthorityForm && (
                          <Button variant="outline" size="sm" onClick={openAuthorityForm}>
                            Update authority details
                          </Button>
                        )}
                      </div>
                      {showAuthorityForm ? (
                        <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <Input
                            label="Authority name"
                            value={authorityForm.name}
                            onChange={(e) => setAuthorityForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Name of authority"
                          />
                          <Input
                            label="Authority email"
                            type="email"
                            value={authorityForm.email}
                            onChange={(e) => setAuthorityForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="Email"
                            error={authorityFieldErrors.email}
                          />
                          <Input
                            label="Authority phone"
                            type="tel"
                            value={authorityForm.phone}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                              setAuthorityForm((f) => ({ ...f, phone: digits }))
                            }}
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            error={authorityFieldErrors.phone}
                          />
                          {authorityError && <p className="text-sm text-red-600">{authorityError}</p>}
                          <div className="flex gap-2">
                            <Button onClick={handleSaveAuthority} isLoading={authoritySaving} loadingText="Saving...">
                              Save
                            </Button>
                            <Button variant="outline" onClick={() => { setShowAuthorityForm(false); setAuthorityError(null); setAuthorityFieldErrors({}); }} disabled={authoritySaving}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-900 mt-1">
                          {participantData.teams.authority_name || participantData.teams.authority_email || participantData.teams.authority_phone ? (
                            <div className="space-y-1 text-sm">
                              {participantData.teams.authority_name && <p><span className="text-gray-500">Name:</span> {participantData.teams.authority_name}</p>}
                              {participantData.teams.authority_email && <p><span className="text-gray-500">Email:</span> {participantData.teams.authority_email}</p>}
                              {participantData.teams.authority_phone && <p><span className="text-gray-500">Phone:</span> {participantData.teams.authority_phone}</p>}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Not provided. You can add authority details above.</p>
                          )}
                        </div>
                      )}
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
                {availableExamsCount > 0 ? (
                  <>
                    <p className="text-gray-600 text-lg mb-2 font-medium">
                      You have {availableExamsCount} exam{availableExamsCount !== 1 ? 's' : ''} available
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      Take your assigned exams before the deadline.
                    </p>
                    <Link href="/exams">
                      <Button variant="primary" className="bg-[#C0392B] hover:bg-[#A93226]">
                        View & Take Exams
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gray-100/50 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-lg mb-2 font-medium">
                      No exams available right now
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      Check back later for scheduled exams.
                    </p>
                    <Link href="/exams" className="text-[#C0392B] hover:text-[#A93226] font-medium text-sm">
                      View exam schedule
                    </Link>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
