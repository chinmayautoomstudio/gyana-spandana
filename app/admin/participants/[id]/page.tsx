'use client'

import { useEffect, useState, use } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'

interface Teammate {
  name: string
  email: string
  school_name: string
  is_participant1: boolean
}

interface ParticipantProfile {
  id: string
  name: string
  email: string
  phone: string
  school_name: string
  aadhar: string
  gender: string | null
  class: string | null
  address: string | null
  school_address: string | null
  date_of_birth: string | null
  profile_photo_url: string | null
  profile_completed: boolean | null
  is_participant1: boolean
  email_verified: boolean | null
  phone_verified: boolean | null
  registration_email_sent_at: string | null
  created_at: string
  updated_at: string
  teams: {
    team_name: string
    team_code: string
  } | null
}

export default function AdminParticipantProfilePage() {
  const params = useParams()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const participantId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null)
  const [teammate, setTeammate] = useState<Teammate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!participantId) return

    const fetchData = async () => {
      const supabase = createClient()

      const { data: participantData } = await supabase
        .from('participants')
        .select('id, name, email, phone, school_name, aadhar, gender, class, address, school_address, date_of_birth, profile_photo_url, profile_completed, is_participant1, email_verified, phone_verified, registration_email_sent_at, created_at, updated_at, team_id, user_id')
        .eq('id', participantId)
        .single()

      if (participantData) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('team_name, team_code')
          .eq('id', participantData.team_id)
          .single()

        setParticipant({
          ...participantData,
          teams: teamData || null,
        })

        if (participantData.team_id) {
          const { data: teammateData } = await supabase
            .from('participants')
            .select('name, email, school_name, is_participant1')
            .eq('team_id', participantData.team_id)
            .neq('id', participantId)
            .single()
          setTeammate(teammateData || null)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [participantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (!participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Participant not found</p>
        <Link href="/admin/participants" className="text-[#C0392B] hover:underline mt-4 inline-block">
          Back to Participants
        </Link>
      </div>
    )
  }

  const maskAadhar = (aadhar: string) => {
    if (!aadhar || aadhar.length < 4) return '****'
    return `**** **** **** ${aadhar.slice(-4)}`
  }

  const formatDateSafe = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/participants"
            className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Participants
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Participant Profile</h1>
          <p className="text-gray-600 mt-1">View and manage participant details</p>
        </div>
        <Link href={`/admin/reports/participant/${participantId}`}>
          <Button variant="outline" size="md">
            View performance report
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity, Status, Team Context */}
        <div className="lg:col-span-1 space-y-6">
          {/* Identity Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <div className="flex flex-col items-center text-center">
              {participant.profile_photo_url ? (
                <img
                  src={participant.profile_photo_url}
                  alt={participant.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#C0392B] to-[#E67E22] flex items-center justify-center text-white text-4xl font-bold shadow-md">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 mt-4">{participant.name}</h2>
              <p className="text-sm text-gray-500">{participant.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${participant.is_participant1
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  }`}>
                  {participant.is_participant1 ? 'Participant 1' : 'Participant 2'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verification
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50">
                <span className="text-sm text-gray-600">Email</span>
                {participant.email_verified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50">
                <span className="text-sm text-gray-600">Phone</span>
                {participant.phone_verified ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50">
                <span className="text-sm text-gray-600">Registration confirmation email</span>
                {participant.registration_email_sent_at ? (
                  <span className="text-xs text-gray-700">
                    Sent on {formatDateTime(participant.registration_email_sent_at)}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    Not sent
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50">
                <span className="text-sm text-gray-600">Profile</span>
                {participant.profile_completed ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    Incomplete
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Team Information */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Details
            </h3>
            {participant.teams ? (
              <div className="space-y-4">
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Team Name</span>
                  <p className="text-gray-900 font-medium mt-1">{participant.teams.team_name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Team ID</span>
                  <p className="font-mono text-lg text-gray-900 tracking-wide mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                    {participant.teams.team_code}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No team assigned
              </div>
            )}
          </div>

          {/* Teammate Information */}
          {teammate && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Teammate
              </h3>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {teammate.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {teammate.email}
                  </p>
                  <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {teammate.is_participant1 ? 'Participant 1' : 'Participant 2'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <span className="text-sm text-gray-500 block mb-1">Phone Number</span>
                <p className="text-gray-900 font-medium">{participant.phone}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 block mb-1">Date of Birth</span>
                <p className="text-gray-900 font-medium">{formatDateSafe(participant.date_of_birth)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 block mb-1">Gender</span>
                <p className="text-gray-900 font-medium">{participant.gender || '—'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 block mb-1">Class</span>
                <p className="text-gray-900 font-medium">{participant.class || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm text-gray-500 block mb-1">Aadhar Number</span>
                <p className="text-gray-900 font-mono bg-gray-50 inline-block px-3 py-1 rounded border border-gray-200">
                  {maskAadhar(participant.aadhar)}
                </p>
              </div>
              {participant.address && (
                <div className="md:col-span-2">
                  <span className="text-sm text-gray-500 block mb-1">Home Address</span>
                  <p className="text-gray-900">{participant.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* School Information */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-2">Academic Details</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <span className="text-sm text-gray-500 block mb-1">School / College Name</span>
                <p className="text-gray-900 font-medium text-lg">{participant.school_name}</p>
              </div>
              {participant.school_address && (
                <div>
                  <span className="text-sm text-gray-500 block mb-1">School Address</span>
                  <p className="text-gray-900">{participant.school_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Meta Data */}
          <div className="bg-gray-50/50 rounded-xl border border-gray-200/60 p-4">
            <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Created: {formatDateTime(participant.created_at)}</span>
              </div>
              <div className="hidden sm:block text-gray-300">|</div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Last Updated: {formatDateTime(participant.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
