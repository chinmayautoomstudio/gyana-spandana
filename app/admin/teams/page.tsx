'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/Button'
import { deleteTeam } from '@/app/actions/admin'
import { format } from 'date-fns'

interface TeamRow {
  id: string
  team_name: string
  team_code: string
  status: string
  created_at: string
  participants_count: number
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchTeams = async () => {
    const supabase = createClient()
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_name, team_code, status, created_at')
      .order('created_at', { ascending: false })

    if (teamsError) {
      setMessage({ type: 'error', text: teamsError.message })
      setLoading(false)
      return
    }

    const teamIds = (teamsData || []).map((t) => t.id)
    const counts: Record<string, number> = {}
    if (teamIds.length > 0) {
      const { data: partData } = await supabase
        .from('participants')
        .select('team_id')
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
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
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
      render: (t: TeamRow) => (
        <span className="font-mono text-sm">{t.team_code}</span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: TeamRow) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            t.status === 'complete'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
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
      key: 'created_at',
      header: 'Created',
      render: (t: TeamRow) => format(new Date(t.created_at), 'MMM d, yyyy'),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t: TeamRow) => (
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => handleDelete(t)}
          disabled={deletingId === t.id}
          isLoading={deletingId === t.id}
        >
          Delete
        </Button>
      ),
      sortable: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
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
        searchPlaceholder="Search by team name or code..."
      />
    </div>
  )
}
