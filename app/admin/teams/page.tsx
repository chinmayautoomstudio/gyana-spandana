'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { KebabMenu } from '@/components/ui/KebabMenu'
import { deleteTeam, eliminateTeam, restoreTeam } from '@/app/actions/admin'
import { format } from 'date-fns'
import { BulkDeleteTeamsModal } from '@/components/admin/BulkDeleteTeamsModal'

interface TeamRow {
  id: string
  team_name: string
  team_code: string
  status: string
  is_eliminated: boolean
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
  const [notifyingP1Id, setNotifyingP1Id] = useState<string | null>(null)
  const [sendingBulkP1Notifications, setSendingBulkP1Notifications] = useState(false)
  const [eliminatingId, setEliminatingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'eliminated'>('all')

  const fetchTeams = async () => {
    const supabase = createClient()
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_name, team_code, status, is_eliminated, created_at, p2_invited_email')
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
        is_eliminated: Boolean((t as any).is_eliminated),
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
    } catch {
      setMessage({ type: 'error', text: 'Failed to send reminder. Please try again.' })
    } finally {
      setRemindingId(null)
    }
  }

  const handleNotifyP1 = async (team: TeamRow) => {
    if (team.status !== 'pending_p2' || !team.p2_invited_email) {
      return
    }
    setNotifyingP1Id(team.id)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/notify-p1-pending-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        const errorText = body.error || 'Failed to notify Participant 1.'
        setMessage({ type: 'error', text: errorText })
      } else {
        const to = typeof body.sentTo === 'string' ? body.sentTo : 'Participant 1'
        setMessage({ type: 'success', text: `Notification sent to P1 at ${to}.` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to notify Participant 1. Please try again.' })
    } finally {
      setNotifyingP1Id(null)
    }
  }

  const handleNotifyAllP1Pending = async () => {
    const pendingCount = teams.filter((t) => !t.is_eliminated && t.status === 'pending_p2' && t.p2_invited_email).length
    if (pendingCount === 0) {
      setMessage({ type: 'error', text: 'No pending teams with a Participant 2 invite email.' })
      return
    }
    if (
      !window.confirm(
        `Send “pending partner” emails to Participant 1 for all ${pendingCount} team(s) waiting on P2? Each team’s registration link will be refreshed.`,
      )
    ) {
      return
    }
    setSendingBulkP1Notifications(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/notify-p1-pending-partners-bulk', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setMessage({ type: 'error', text: body.error || 'Bulk notify failed.' })
      } else {
        const { sent = 0, failed = 0, total = 0, errors = [] } = body as {
          sent?: number
          failed?: number
          total?: number
          errors?: string[]
        }
        const errSample =
          Array.isArray(errors) && errors.length > 0 ? ` Errors: ${errors.slice(0, 3).join(' ')}` : ''
        setMessage({
          type: failed > 0 && sent === 0 ? 'error' : 'success',
          text: `P1 notifications: ${sent} sent, ${failed} failed (of ${total} teams).${errSample}`,
        })
      }
    } catch {
      setMessage({ type: 'error', text: 'Bulk notify failed. Please try again.' })
    } finally {
      setSendingBulkP1Notifications(false)
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

  const handleEliminate = async (team: TeamRow) => {
    if (team.is_eliminated) return
    if (
      !window.confirm(
        `Eliminate team "${team.team_name}" (${team.team_code})? The team will remain in the database but will be excluded from leaderboards and cannot be assigned to exams/quizzes.`,
      )
    ) {
      return
    }

    setEliminatingId(team.id)
    setMessage(null)
    const result = await eliminateTeam(team.id)
    setEliminatingId(null)
    if (result.success) {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, is_eliminated: true } : t)))
      setMessage({ type: 'success', text: 'Team eliminated successfully.' })
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const handleRestore = async (team: TeamRow) => {
    if (!team.is_eliminated) return
    if (!window.confirm(`Restore team "${team.team_name}" (${team.team_code}) to active competition status?`)) {
      return
    }

    setRestoringId(team.id)
    setMessage(null)
    const result = await restoreTeam(team.id)
    setRestoringId(null)
    if (result.success) {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, is_eliminated: false } : t)))
      setMessage({ type: 'success', text: 'Team restored successfully.' })
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

  const filteredTeams = teams.filter((team) => {
    if (teamFilter === 'active') return !team.is_eliminated
    if (teamFilter === 'eliminated') return team.is_eliminated
    return true
  })

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
        `${t.status} ${t.is_eliminated ? 'Eliminated' : ''} ${t.status === 'complete' ? 'Complete' : 'Pending P2'}`,
      render: (t: TeamRow) => (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              t.status === 'complete' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {t.status === 'complete' ? 'Complete' : 'Pending P2'}
          </span>
          {t.is_eliminated && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
              Eliminated
            </span>
          )}
        </div>
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
        !t.is_eliminated && t.status === 'pending_p2' && t.p2_invited_email ? (
          <span className="text-sm text-gray-800">{t.p2_invited_email}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">—</span>
        ),
      sortable: false,
    },
    {
      key: 'p2_reminder',
      header: 'P2 reminder',
      getSearchText: () => '',
      render: (t: TeamRow) =>
        !t.is_eliminated && t.status === 'pending_p2' && t.p2_invited_email ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[#C0392B] border-[#F2C94C] hover:bg-amber-50 whitespace-nowrap"
            onClick={() => void handleSendReminder(t)}
            isLoading={remindingId === t.id}
            loadingText="Sending..."
          >
            Send reminder
          </Button>
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
            ...(t.is_eliminated
              ? [
                  {
                    label: 'Restore',
                    onClick: () => void handleRestore(t),
                    disabled: restoringId === t.id,
                  },
                ]
              : [
                  {
                    label: 'Eliminate',
                    onClick: () => void handleEliminate(t),
                    disabled: eliminatingId === t.id,
                  },
                ]),
            ...(t.status === 'pending_p2' && t.p2_invited_email
              ? [
                  {
                    label: 'Notify Participant 1',
                    onClick: () => void handleNotifyP1(t),
                    disabled: notifyingP1Id === t.id || t.is_eliminated,
                  },
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
        <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTeamFilter('all')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                teamFilter === 'all' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTeamFilter('active')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                teamFilter === 'active' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setTeamFilter('eliminated')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                teamFilter === 'eliminated' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Eliminated
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[#C0392B] border-[#F2C94C] hover:bg-amber-50 whitespace-nowrap"
            onClick={() => void handleNotifyAllP1Pending()}
            isLoading={sendingBulkP1Notifications}
            loadingText="Sending…"
          >
            Notify all Participant 1s (pending teams)
          </Button>
          {selectedIds.size > 0 && (
            <>
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
            </>
          )}
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

      <DataTable
        data={filteredTeams}
        columns={columns}
        searchable
        searchPlaceholder="Search by team name, code, status, email, or date..."
        belowSearch={
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium text-gray-900">{filteredTeams.length}</span> of{' '}
            <span className="font-medium text-gray-900">{teams.length}</span> teams
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

