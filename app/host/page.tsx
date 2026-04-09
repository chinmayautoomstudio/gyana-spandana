'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

type HostSession = {
  id: string
  title: string
  status: string
  created_at: string
}

export default function HostDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<HostSession[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      const supabase = createClient()

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

      const { data, error: sessionsError } = await supabase
        .from('quiz_live_sessions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })

      if (sessionsError) {
        setError(sessionsError.message)
      } else {
        setSessions((data ?? []) as HostSession[])
      }
      setLoading(false)
    }

    void load()
  }, [router])

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
        <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          No quiz sessions assigned yet.
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
                <tr key={session.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{session.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{session.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(session.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/host/session/${session.id}`}>
                      <Button size="sm">Open session</Button>
                    </Link>
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
