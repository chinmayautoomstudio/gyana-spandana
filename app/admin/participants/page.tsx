'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { FilterBar } from '@/components/admin/FilterBar'
import { ExportButton } from '@/components/admin/ExportButton'

interface Participant {
  id: string
  name: string
  email: string
  phone: string
  school_name: string
  is_participant1: boolean
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
  ]

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

