'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface QuizSessionRow {
  id: string
  title: string
  status: string
  assigned_host_id: string | null
  team_slots: Record<string, string>
  is_test_session?: boolean
  created_at: string
  rounds?: Array<{ id: string }>
}

type SessionFilter = 'all' | 'live' | 'test'

function getSessionStatusBadge(status: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') {
    return { label: 'Completed', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' }
  }
  if (normalized === 'active') {
    return { label: 'Active', className: 'bg-blue-100 text-blue-900 border-blue-200' }
  }
  if (normalized === 'lobby' || normalized === 'setup') {
    return { label: normalized === 'lobby' ? 'Lobby' : 'Setup', className: 'bg-amber-100 text-amber-900 border-amber-200' }
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  }
}

export default function AdminQuizSessionsPage() {
  const [sessions, setSessions] = useState<QuizSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<SessionFilter>('all')

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'test') return Boolean(s.is_test_session)
    if (filter === 'live') return !s.is_test_session
    return true
  })

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/quiz/sessions')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load sessions')
      setSessions(data.sessions || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSessions()
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this quiz session?')) return
    const res = await fetch(`/api/admin/quiz/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchSessions()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data?.error || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Quiz Sessions</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
            {(['all', 'live', 'test'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize ${
                  filter === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {key === 'all' ? 'All' : key === 'live' ? 'Live' : 'Test'}
              </button>
            ))}
          </div>
          <Link href="/admin/quiz/new">
            <Button>Create new session</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading sessions...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">No quiz sessions yet.</div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          No sessions match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Host</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slots</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Rounds</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                (() => {
                  const isCompleted = String(session.status || '').toLowerCase() === 'completed'
                  return (
                <tr key={session.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {session.title}
                      {session.is_test_session ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Test
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {(() => {
                      const badge = getSessionStatusBadge(session.status)
                      return (
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.assigned_host_id?.slice(0, 8) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {Object.values(session.team_slots || {}).filter(Boolean).length}/4
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.rounds?.length || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {isCompleted ? (
                        <Button size="sm" disabled aria-disabled="true">
                          Host
                        </Button>
                      ) : (
                        <Link href={`/host/session/${session.id}`}>
                          <Button size="sm">Host</Button>
                        </Link>
                      )}
                      {isCompleted ? (
                        <Button size="sm" variant="outline" disabled aria-disabled="true">
                          Leaderboard
                        </Button>
                      ) : (
                        <Link href={`/leaderboard/${session.id}`}>
                          <Button size="sm" variant="outline">
                            Leaderboard
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(session.id)}>
                        Delete
                      </Button>
                    </div>
                    {isCompleted ? <p className="mt-1 text-xs text-gray-500">Session completed - rejoin disabled.</p> : null}
                  </td>
                </tr>
                  )
                })()
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

