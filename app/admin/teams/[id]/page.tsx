'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { deleteTeam } from '@/app/actions/admin'

interface TeamDetail {
  id: string
  team_name: string
  team_code: string
  status: string
  created_at: string
  authority_name: string | null
  authority_email: string | null
  authority_phone: string | null
  p2_invited_email: string | null
  invitation_expires_at: string | null
  team_name_renamed_at: string | null
}

interface ParticipantSummary {
  id: string
  name: string
  email: string
  phone: string | null
  school_name: string
  gender: string | null
  class: string | null
  address: string | null
  school_address: string | null
  date_of_birth: string | null
  aadhar: string | null
  profile_completed: boolean | null
  is_participant1: boolean
  created_at: string
}

export default function AdminTeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const teamId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined

  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [participant1, setParticipant1] = useState<ParticipantSummary | null>(null)
  const [participant2, setParticipant2] = useState<ParticipantSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [resettingRename, setResettingRename] = useState(false)

  useEffect(() => {
    if (!teamId) return

    const fetchData = async () => {
      const supabase = createClient()

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(
          'id, team_name, team_code, status, created_at, authority_name, authority_email, authority_phone, p2_invited_email, invitation_expires_at, team_name_renamed_at',
        )
        .eq('id', teamId)
        .single()

      if (teamError || !teamData) {
        setError(teamError?.message || 'Team not found')
        setLoading(false)
        return
      }

      const { data: participantsData } = await supabase
        .from('participants')
        .select(
          'id, name, email, phone, school_name, gender, class, address, school_address, date_of_birth, aadhar, profile_completed, is_participant1, created_at',
        )
        .eq('team_id', teamId)
        .order('is_participant1', { ascending: false })

      setTeam(teamData as TeamDetail)

      if (participantsData && participantsData.length > 0) {
        const p1 = participantsData.find((p) => p.is_participant1) || null
        const p2 = participantsData.find((p) => !p.is_participant1) || null
        setParticipant1((p1 || null) as ParticipantSummary | null)
        setParticipant2((p2 || null) as ParticipantSummary | null)
      }

      setLoading(false)
    }

    void fetchData()
  }, [teamId])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm')
    } catch {
      return dateStr
    }
  }

  const maskAadhar = (aadhar: string | null) => {
    if (!aadhar || aadhar.length < 4) return '****'
    return `**** **** **** ${aadhar.slice(-4)}`
  }

  const handleDeleteTeam = async () => {
    if (!teamId || !team) return
    if (
      !window.confirm(
        `Delete team "${team.team_name}" (${team.team_code})? This will also remove all associated participants and their exam data. This cannot be undone.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setError(null)
    const result = await deleteTeam(teamId)
    setDeleting(false)
    if (result.success) {
      router.push('/admin/teams')
    } else {
      setError(result.error)
    }
  }

  const handleResetTeamRenameFlag = async () => {
    if (!teamId || !team) return
    if (
      !window.confirm(
        'Allow Participant 1 to use their one-time team rename again? This only clears the rename lock; it does not change the current team name.',
      )
    ) {
      return
    }
    setResettingRename(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/teams/reset-team-name-rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setError((body as { error?: string }).error || 'Failed to reset rename flag.')
      } else {
        setTeam((t) => (t ? { ...t, team_name_renamed_at: null } : t))
      }
    } catch {
      setError('Failed to reset rename flag. Please try again.')
    } finally {
      setResettingRename(false)
    }
  }

  const handleSendReminder = async () => {
    if (!teamId || !team || team.status !== 'pending_p2' || !team.p2_invited_email) {
      return
    }
    setReminding(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/send-p2-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        const errMsg = body.error || 'Failed to send reminder.'
        setError(errMsg)
      }
    } catch {
      setError('Failed to send reminder. Please try again.')
    } finally {
      setReminding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Team not found</p>
        <Link href="/admin/teams" className="text-[#C0392B] hover:underline mt-4 inline-block">
          Back to Teams
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin/teams" className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Teams
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Team Details</h1>
          <p className="text-gray-600 mt-1">
            {team.team_name} &mdash; <span className="font-mono text-sm">{team.team_code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              team.status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {team.status === 'complete' ? 'Complete' : 'Pending P2'}
          </span>
          <Button
            variant="outline"
            size="md"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDeleteTeam}
            disabled={deleting}
            isLoading={deleting}
          >
            Delete team
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-4 bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: team meta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team overview</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Team code</dt>
                <dd className="font-mono text-gray-900">{team.team_code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Created</dt>
                <dd className="text-gray-900">{formatDate(team.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Authority name</dt>
                <dd className="text-gray-900">{team.authority_name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Authority email</dt>
                <dd className="text-gray-900">{team.authority_email || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Authority phone</dt>
                <dd className="text-gray-900">{team.authority_phone || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-600 shrink-0">One-time rename used</dt>
                <dd className="text-gray-900 text-right">
                  {team.team_name_renamed_at ? formatDateTime(team.team_name_renamed_at) : 'No'}
                </dd>
              </div>
            </dl>
            {team.team_name_renamed_at && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={handleResetTeamRenameFlag}
                disabled={resettingRename}
                isLoading={resettingRename}
              >
                Allow team name change again
              </Button>
            )}
          </div>

          {team.status === 'pending_p2' && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Participant 2 invitation</h2>
              <p className="text-sm text-gray-700">
                Email: <span className="font-medium">{team.p2_invited_email || '—'}</span>
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Expires:{' '}
                <span className="font-medium">{team.invitation_expires_at ? formatDateTime(team.invitation_expires_at) : '—'}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-[#C0392B] border-[#F2C94C] hover:bg-amber-50"
                onClick={handleSendReminder}
                disabled={reminding || !team.p2_invited_email}
                isLoading={reminding}
              >
                Send reminder
              </Button>
            </div>
          )}
        </div>

        {/* Right column: participants */}
        <div className="lg:col-span-2 space-y-6">
          {participant1 && (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Participant 1</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-900">{participant1.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900">{participant1.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-900">{participant1.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">School / College</dt>
                  <dd className="text-gray-900">{participant1.school_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Class</dt>
                  <dd className="text-gray-900">{participant1.class || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gender</dt>
                  <dd className="text-gray-900">{participant1.gender || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date of birth</dt>
                  <dd className="text-gray-900">{formatDate(participant1.date_of_birth)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Aadhar</dt>
                  <dd className="text-gray-900">{maskAadhar(participant1.aadhar)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="text-gray-900">{participant1.address || '—'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">School address</dt>
                  <dd className="text-gray-900">{participant1.school_address || '—'}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participant 2</h2>
            {participant2 ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-900">{participant2.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="text-gray-900">{participant2.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="text-gray-900">{participant2.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">School / College</dt>
                  <dd className="text-gray-900">{participant2.school_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Class</dt>
                  <dd className="text-gray-900">{participant2.class || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Gender</dt>
                  <dd className="text-gray-900">{participant2.gender || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date of birth</dt>
                  <dd className="text-gray-900">{formatDate(participant2.date_of_birth)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Aadhar</dt>
                  <dd className="text-gray-900">{maskAadhar(participant2.aadhar)}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="text-gray-900">{participant2.address || '—'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">School address</dt>
                  <dd className="text-gray-900">{participant2.school_address || '—'}</dd>
                </div>
              </dl>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <p className="mb-2">
                  This team is currently <span className="font-semibold">incomplete</span>. Participant 2 has not yet completed
                  registration.
                </p>
                <p>
                  Invited email:{' '}
                  <span className="font-medium">{team.p2_invited_email || 'Not set'}</span>
                </p>
                <p>
                  Invitation expires:{' '}
                  <span className="font-medium">
                    {team.invitation_expires_at ? formatDateTime(team.invitation_expires_at) : '—'}
                  </span>
                </p>
                {team.status === 'pending_p2' && team.p2_invited_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-[#C0392B] border-[#F2C94C] hover:bg-amber-50"
                    onClick={handleSendReminder}
                    disabled={reminding}
                    isLoading={reminding}
                  >
                    Send reminder
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

