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
  created_at: string
  rounds?: Array<{ id: string }>
}

export default function AdminQuizSessionsPage() {
  const [sessions, setSessions] = useState<QuizSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quiz Sessions</h1>
        <Link href="/admin/quiz/new">
          <Button>Create new session</Button>
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading sessions...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">No quiz sessions yet.</div>
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
              {sessions.map((session) => (
                <tr key={session.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.assigned_host_id?.slice(0, 8) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {Object.values(session.team_slots || {}).filter(Boolean).length}/4
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.rounds?.length || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/host/session/${session.id}`}>
                        <Button size="sm">Host</Button>
                      </Link>
                      <Link href={`/leaderboard/${session.id}`}>
                        <Button size="sm" variant="outline">
                          Leaderboard
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(session.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

