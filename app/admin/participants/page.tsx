'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { FilterBar } from '@/components/admin/FilterBar'
import { ExportButton } from '@/components/admin/ExportButton'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { deleteParticipant } from '@/app/actions/admin'

interface Participant {
  id: string
  name: string
  email: string
  phone: string
  school_name: string
  is_participant1: boolean
  registration_email_sent_at: string | null
  teams: {
    team_name: string
  }
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const fetchParticipants = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('participants')
        .select('*, teams(team_name, team_code)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching participants:', error)
      } else {
        setParticipants(data || [])
      }
      setLoading(false)
    }

    fetchParticipants()
  }, [])

  const uniqueTeams = Array.from(new Set(participants.map(p => p.teams?.team_name).filter(Boolean)))
  const uniqueSchools = Array.from(new Set(participants.map(p => p.school_name).filter(Boolean)))

  const filteredParticipants = participants.filter(p => {
    if (teamFilter && p.teams?.team_name !== teamFilter) return false
    if (schoolFilter && p.school_name !== schoolFilter) return false
    if (roleFilter) {
      if (roleFilter === 'participant1' && !p.is_participant1) return false
      if (roleFilter === 'participant2' && p.is_participant1) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (p: Participant) => p.name,
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      render: (p: Participant) => p.email,
      sortable: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (p: Participant) => p.phone,
      sortable: true,
    },
    {
      key: 'school_name',
      header: 'School',
      render: (p: Participant) => p.school_name,
      sortable: true,
    },
    {
      key: 'teams.team_name',
      header: 'Team',
      render: (p: Participant) => p.teams?.team_name || 'N/A',
      sortable: true,
    },
    {
      key: 'is_participant1',
      header: 'Role',
      render: (p: Participant) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          p.is_participant1
            ? 'bg-[#C0392B]/10 text-[#C0392B]'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {p.is_participant1 ? 'Participant 1' : 'Participant 2'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'registration_email_sent_at',
      header: 'Reg. email',
      render: (p: Participant) =>
        p.registration_email_sent_at
          ? `Yes, ${format(new Date(p.registration_email_sent_at), 'MMM d, yyyy')}`
          : 'No',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: Participant) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/participants/${p.id}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleDeleteParticipant(p)}
            disabled={deletingId === p.id}
            isLoading={deletingId === p.id}
          >
            Delete
          </Button>
        </div>
      ),
      sortable: false,
    },
  ]

  const handleDeleteParticipant = async (p: Participant) => {
    if (!window.confirm(`Delete participant "${p.name}" (${p.email})? This will remove their exam attempts and assignments. This cannot be undone.`)) return
    setDeletingId(p.id)
    setMessage(null)
    const result = await deleteParticipant(p.id)
    setDeletingId(null)
    if (result.success) {
      setMessage({ type: 'success', text: 'Participant deleted.' })
      setParticipants((prev) => prev.filter((x) => x.id !== p.id))
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const exportData = filteredParticipants.map(p => ({
    'Name': p.name,
    'Email': p.email,
    'Phone': p.phone,
    'School': p.school_name,
    'Team': p.teams?.team_name || 'N/A',
    'Role': p.is_participant1 ? 'Participant 1' : 'Participant 2',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Participants</h1>
        <ExportButton
          data={exportData}
          filename="participants"
          exportType="both"
          pdfTitle="Participants List"
          columns={[
            { header: 'Name', dataKey: 'Name' },
            { header: 'Email', dataKey: 'Email' },
            { header: 'Phone', dataKey: 'Phone' },
            { header: 'School', dataKey: 'School' },
            { header: 'Team', dataKey: 'Team' },
            { header: 'Role', dataKey: 'Role' },
          ]}
        />
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <FilterBar
        filters={{
          team: {
            label: 'Team',
            options: uniqueTeams.map(t => ({ value: t, label: t })),
            value: teamFilter,
            onChange: setTeamFilter,
          },
          school: {
            label: 'School',
            options: uniqueSchools.map(s => ({ value: s, label: s })),
            value: schoolFilter,
            onChange: setSchoolFilter,
          },
          role: {
            label: 'Role',
            options: [
              { value: 'participant1', label: 'Participant 1' },
              { value: 'participant2', label: 'Participant 2' },
            ],
            value: roleFilter,
            onChange: setRoleFilter,
          },
        }}
        onReset={() => {
          setTeamFilter('')
          setSchoolFilter('')
          setRoleFilter('')
        }}
      />

      <DataTable
        data={filteredParticipants}
        columns={columns}
        searchable
        searchPlaceholder="Search by name, email, school, or team..."
      />
    </div>
  )
}

