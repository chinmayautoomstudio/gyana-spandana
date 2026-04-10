'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { KebabMenu } from '@/components/ui/KebabMenu'
import { deleteTeam } from '@/app/actions/admin'
import { format } from 'date-fns'
import { BulkDeleteTeamsModal } from '@/components/admin/BulkDeleteTeamsModal'

interface TeamRow {
  id: string
  team_name: string
  team_code: string
  status: string
  created_at: string
  participants_count: number
  p2_invited_email: string | null
}

export default function AdminTeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [sendingAllReminders, setSendingAllReminders] = useState(false)

  const fetchTeams = async () => {
    const supabase = createClient()
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_name, team_code, status, created_at, p2_invited_email')
      .order('created_at', { ascending: false })

    if (teamsError) {
      setMessage({ type: 'error', text: teamsError.message })
      setLoading(false)
      return
    }

    const teamIds = (teamsData || []).map((t) => t.id)
    const counts: Record<string, number> = {}
    if (teamIds.length > 0) {
      const { data: partData } = await supabase.from('participants').select('team_id')
      ;(partData || []).forEach((p) => {
        counts[p.team_id] = (counts[p.team_id] || 0) + 1
      })
    }

    setTeams(
      (teamsData || []).map((t) => ({
        id: t.id,
        team_name: t.team_name,
        team_code: t.team_code,
        status: t.status || 'complete',
        created_at: t.created_at,
        participants_count: counts[t.id] ?? 0,
        p2_invited_email: (t as any).p2_invited_email ?? null,
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    void fetchTeams()
  }, [])

  useEffect(() => {
    if (message?.type !== 'success') return
    const timer = window.setTimeout(() => setMessage(null), 2000)
    return () => window.clearTimeout(timer)
  }, [message])

  const handleSendReminder = async (team: TeamRow) => {
    if (team.status !== 'pending_p2' || !team.p2_invited_email) {
      return
    }
    setRemindingId(team.id)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/send-p2-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        const errorText = body.error || 'Failed to send reminder.'
        setMessage({ type: 'error', text: errorText })
      } else {
        setMessage({ type: 'success', text: `Reminder email sent to ${team.p2_invited_email}.` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send reminder. Please try again.' })
    } finally {
      setRemindingId(null)
    }
  }

  const handleSendAllReminders = async () => {
    const pendingCount = teams.filter((t) => t.status === 'pending_p2' && t.p2_invited_email).length
    if (pendingCount === 0) {
      setMessage({ type: 'error', text: 'No teams with pending Participant 2 registration.' })
      return
    }
    if (
      !window.confirm(
        `Send reminder emails to ${pendingCount} team(s) with incomplete registration? Each email includes a registration link and a link for Participant 1 to update Participant 2’s email if needed.`,
      )
    ) {
      return
    }
    setSendingAllReminders(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/send-p2-reminders-bulk', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setMessage({ type: 'error', text: body.error || 'Failed to send bulk reminders.' })
        return
      }
      const { sent = 0, failed = 0, total = 0 } = body as {
        sent?: number
        failed?: number
        total?: number
      }
      if (failed > 0) {
        setMessage({
          type: 'error',
          text: `Reminders: ${sent} sent, ${failed} failed (of ${total}). Check server logs for details.`,
        })
      } else {
        setMessage({
          type: 'success',
          text: `Reminder emails sent to ${sent} team(s).`,
        })
      }
      void fetchTeams()
    } catch {
      setMessage({ type: 'error', text: 'Failed to send bulk reminders. Please try again.' })
    } finally {
      setSendingAllReminders(false)
    }
  }

  const handleDelete = async (team: TeamRow) => {
    const confirmMessage =
      team.participants_count > 0
        ? `Delete team "${team.team_name}" (${team.team_code})? This will also remove ${team.participants_count} participant(s) and their exam data. This cannot be undone.`
        : `Delete team "${team.team_name}" (${team.team_code})? This cannot be undone.`
    if (!window.confirm(confirmMessage)) return

    setDeletingId(team.id)
    setMessage(null)
    const result = await deleteTeam(team.id)
    setDeletingId(null)
    if (result.success) {
      setMessage({ type: 'success', text: 'Team deleted successfully.' })
      setTeams((prev) => prev.filter((t) => t.id !== team.id))
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const openBulkDeleteModal = () => {
    if (selectedIds.size === 0 || bulkDeleting) return
    setBulkDeleteModalOpen(true)
  }

  const executeBulkDelete = async () => {
    const selectedTeams = teams.filter((t) => selectedIds.has(t.id))
    if (selectedTeams.length === 0) {
      setBulkDeleteModalOpen(false)
      return
    }

    setBulkDeleting(true)
    setMessage(null)

    try {
      const results = await Promise.all(
        selectedTeams.map(async (team) => {
          const result = await deleteTeam(team.id)
          return { id: team.id, ...result }
        }),
      )

      const failed = results.filter((r) => !r.success)
      const deletedIds = results.filter((r) => r.success).map((r) => r.id)

      if (deletedIds.length > 0) {
        setTeams((prev) => prev.filter((t) => !deletedIds.includes(t.id)))
        setSelectedIds(new Set())
      }

      if (failed.length > 0) {
        setMessage({
          type: 'error',
          text:
            failed.length === results.length
              ? 'Failed to delete the selected teams. Please try again.'
              : 'Some teams could not be deleted. The list has been updated with the successfully deleted teams.',
        })
      } else if (deletedIds.length > 0) {
        setMessage({
          type: 'success',
          text:
            deletedIds.length === 1
              ? 'Team deleted successfully.'
              : `${deletedIds.length} teams deleted successfully.`,
        })
      }
    } finally {
      setBulkDeleting(false)
      setBulkDeleteModalOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]" />
      </div>
    )
  }

  const columns = [
    {
      key: 'team_name',
      header: 'Team name',
      render: (t: TeamRow) => t.team_name,
      sortable: true,
    },
    {
      key: 'team_code',
      header: 'Team code',
      render: (t: TeamRow) => <span className="font-mono text-sm">{t.team_code}</span>,
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      getSearchText: (t: TeamRow) =>
        `${t.status} ${t.status === 'complete' ? 'Complete' : 'Pending P2'}`,
      render: (t: TeamRow) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            t.status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {t.status === 'complete' ? 'Complete' : 'Pending P2'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'participants_count',
      header: 'Participants',
      render: (t: TeamRow) => t.participants_count,
      sortable: true,
    },
    {
      key: 'p2_invited_email',
      header: 'Participant 2 email',
      getSearchText: (t: TeamRow) => t.p2_invited_email || '',
      render: (t: TeamRow) =>
        t.status === 'pending_p2' && t.p2_invited_email ? (
          <span className="text-sm text-gray-800">{t.p2_invited_email}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">—</span>
        ),
      sortable: false,
    },
    {
      key: 'created_at',
      header: 'Created',
      getSearchText: (t: TeamRow) =>
        `${format(new Date(t.created_at), 'MMM d, yyyy')} ${t.created_at}`,
      render: (t: TeamRow) => format(new Date(t.created_at), 'MMM d, yyyy'),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t: TeamRow) => (
        <KebabMenu
          items={[
            {
              label: 'View',
              onClick: () => router.push(`/admin/teams/${t.id}`),
            },
            ...(t.status === 'pending_p2' && t.p2_invited_email
              ? [
                  {
                    label: 'Send reminder',
                    onClick: () => handleSendReminder(t),
                    disabled: remindingId === t.id,
                  } as const,
                ]
              : []),
            {
              label: 'Delete',
              onClick: () => handleDelete(t),
              disabled: deletingId === t.id,
            },
          ]}
        />
      ),
      sortable: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSendAllReminders()}
            isLoading={sendingAllReminders}
            loadingText="Sending..."
          >
            Send reminders to all pending teams
          </Button>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {selectedIds.size} team{selectedIds.size > 1 ? 's' : ''} selected
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
          </div>
        )}
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

      <DataTable
        data={teams}
        columns={columns}
        searchable
        searchPlaceholder="Search by team name, code, status, email, or date..."
        belowSearch={
          <p className="text-sm text-gray-600">
            Total teams registered:{' '}
            <span className="font-medium text-gray-900">{teams.length}</span>
          </p>
        }
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(team: TeamRow) => team.id}
      />

      <BulkDeleteTeamsModal
        open={bulkDeleteModalOpen}
        teams={teams.filter((t) => selectedIds.has(t.id))}
        isDeleting={bulkDeleting}
        onCancel={() => !bulkDeleting && setBulkDeleteModalOpen(false)}
        onConfirm={() => void executeBulkDelete()}
      />
    </div>
  )
}

