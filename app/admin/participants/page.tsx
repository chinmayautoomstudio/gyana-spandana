'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { FilterBar } from '@/components/admin/FilterBar'
import { ExportButton } from '@/components/admin/ExportButton'
import { BulkDeleteParticipantsModal } from '@/components/admin/BulkDeleteParticipantsModal'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
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

  const hasActiveFilters = Boolean(teamFilter || schoolFilter || roleFilter)

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
      render: (p: Participant) => (
        <Link
          href={`/admin/participants/${p.id}`}
          className="font-medium text-[#C0392B] hover:underline focus:outline-none focus:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {p.name}
        </Link>
      ),
      sortable: true,
    },
    {
      key: 'teams.team_name',
      header: 'Team name',
      allowWrap: true,
      cellMaxWidthClass: 'max-w-[10rem] sm:max-w-[13rem]',
      render: (p: Participant) => p.teams?.team_name || 'N/A',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      allowWrap: true,
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
      allowWrap: true,
      render: (p: Participant) => p.school_name,
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
  ]

  const openBulkDeleteModal = () => {
    if (selectedIds.size === 0 || bulkDeleting) return
    setBulkDeleteModalOpen(true)
  }

  const executeBulkDelete = async () => {
    const selected = participants.filter((p) => selectedIds.has(p.id))
    if (selected.length === 0) {
      setBulkDeleteModalOpen(false)
      return
    }

    setBulkDeleting(true)
    setMessage(null)

    try {
      const results = await Promise.all(
        selected.map(async (p) => {
          const result = await deleteParticipant(p.id)
          return { id: p.id, ...result }
        }),
      )

      const failed = results.filter((r) => !r.success)
      const deletedIds = results.filter((r) => r.success).map((r) => r.id)

      if (deletedIds.length > 0) {
        setParticipants((prev) => prev.filter((p) => !deletedIds.includes(p.id)))
        setSelectedIds(new Set())
      }

      if (failed.length > 0) {
        setMessage({
          type: 'error',
          text:
            failed.length === results.length
              ? 'Failed to delete the selected participants. Please try again.'
              : 'Some participants could not be deleted. The list has been updated with the successfully deleted records.',
        })
      } else if (deletedIds.length > 0) {
        setMessage({
          type: 'success',
          text:
            deletedIds.length === 1
              ? 'Participant deleted successfully.'
              : `${deletedIds.length} participants deleted successfully.`,
        })
      }
    } finally {
      setBulkDeleting(false)
      setBulkDeleteModalOpen(false)
    }
  }

  const exportData = filteredParticipants.map(p => ({
    'Name': p.name,
    'Team name': p.teams?.team_name || 'N/A',
    'Email': p.email,
    'Phone': p.phone,
    'School': p.school_name,
    'Role': p.is_participant1 ? 'Participant 1' : 'Participant 2',
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Participants</h1>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium text-gray-900">{participants.length}</span> registered
            participant{participants.length !== 1 ? 's' : ''}
            {hasActiveFilters && (
              <>
                {' '}
                · <span className="font-medium text-gray-900">{filteredParticipants.length}</span>{' '}
                match current filters
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={openBulkDeleteModal}
                disabled={bulkDeleting}
              >
                Delete selected
              </Button>
            </>
          )}
          <ExportButton
            data={exportData}
            filename="participants"
            exportType="both"
            pdfTitle="Participants List"
            columns={[
              { header: 'Name', dataKey: 'Name' },
              { header: 'Team name', dataKey: 'Team name' },
              { header: 'Email', dataKey: 'Email' },
              { header: 'Phone', dataKey: 'Phone' },
              { header: 'School', dataKey: 'School' },
              { header: 'Role', dataKey: 'Role' },
            ]}
          />
        </div>
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
        belowSearch={
          <p className="text-sm text-gray-600">
            Total registered participants:{' '}
            <span className="font-medium text-gray-900">{participants.length}</span>
          </p>
        }
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(p: Participant) => p.id}
      />

      <BulkDeleteParticipantsModal
        open={bulkDeleteModalOpen}
        participants={participants
          .filter((p) => selectedIds.has(p.id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            team_name: p.teams?.team_name || 'N/A',
          }))}
        isDeleting={bulkDeleting}
        onCancel={() => !bulkDeleting && setBulkDeleteModalOpen(false)}
        onConfirm={() => void executeBulkDelete()}
      />
    </div>
  )
}

