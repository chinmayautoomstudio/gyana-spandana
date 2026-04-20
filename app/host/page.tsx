'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { usePostgresLeaderboardRealtime } from '@/lib/hooks/usePostgresLeaderboardRealtime'

type HostSession = {
  id: string
  title: string
  status: string
  created_at: string
}

type HostViewer = {
  id: string
  role: 'admin' | 'host'
}

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

async function fetchSessionsForViewer(
  client: ReturnType<typeof createClient>,
  viewer: HostViewer,
): Promise<{ rows: HostSession[]; errorMessage: string | null }> {
  let query = client
    .from('quiz_live_sessions')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })

  if (viewer.role === 'host') {
    query = query.eq('assigned_host_id', viewer.id)
  }

  const { data, error } = await query
  if (error) {
    return { rows: [], errorMessage: error.message }
  }
  return { rows: (data ?? []) as HostSession[], errorMessage: null }
}

export default function HostDashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<HostSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'host' | null>(null)
  const [viewer, setViewer] = useState<HostViewer | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!viewer) return
    const result = await fetchSessionsForViewer(supabase, viewer)
    if (result.errorMessage) {
      setError(result.errorMessage)
      setSessions([])
    } else {
      setError(null)
      setSessions(result.rows)
    }
  }, [supabase, viewer])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      const role = profile?.role || user.user_metadata?.role || 'participant'
      if (role !== 'admin' && role !== 'host') {
        router.replace('/dashboard')
        return
      }

      const nextRole = role === 'admin' ? 'admin' : 'host'
      const v: HostViewer = { id: user.id, role: nextRole }

      const result = await fetchSessionsForViewer(supabase, v)
      if (cancelled) return

      setViewer(v)
      setUserRole(nextRole)
      if (result.errorMessage) {
        setError(result.errorMessage)
        setSessions([])
      } else {
        setError(null)
        setSessions(result.rows)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const realtimeEnabled =
    !!viewer && (viewer.role === 'admin' || viewer.role === 'host')

  usePostgresLeaderboardRealtime({
    supabase,
    enabled: realtimeEnabled,
    channelName: viewer ? `host-quiz-sessions-${viewer.id}` : 'host-quiz-sessions-none',
    table: 'quiz_live_sessions',
    filter:
      viewer?.role === 'host' && viewer.id
        ? `assigned_host_id=eq.${viewer.id}`
        : undefined,
    onDataStale: fetchSessions,
  })

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
        Loading host dashboard...
      </div>
    )
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Live quiz sessions</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-lg space-y-4 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900">No sessions assigned to you yet</h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Live quiz sessions are created and managed under <strong>Quiz Sessions</strong> in the admin area.
            You will only see sessions where you are selected as the <strong>assigned host</strong>.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>An administrator creates a session and picks a host.</li>
            <li>Once you are assigned, the session will appear in this list.</li>
            <li>Open a session to run rounds from the host control panel.</li>
          </ul>
          {userRole === 'admin' ? (
            <div className="pt-2">
              <Link href="/admin/quiz">
                <Button variant="primary">Open Quiz Sessions</Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-500 pt-1">
              Ask an administrator to create a quiz session and assign you as the host.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                (() => {
                  const isCompleted = String(session.status || '').toLowerCase() === 'completed'
                  return (
                <tr key={session.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.title}</td>
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
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(session.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isCompleted ? (
                      <>
                        <Button size="sm" disabled aria-disabled="true">
                          Open session
                        </Button>
                        <p className="mt-1 text-xs text-gray-500">Session completed - rejoin disabled.</p>
                      </>
                    ) : (
                      <Link href={`/host/session/${session.id}`}>
                        <Button size="sm">Open session</Button>
                      </Link>
                    )}
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
