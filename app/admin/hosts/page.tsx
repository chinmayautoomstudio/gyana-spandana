'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { HostList } from '@/components/admin/HostList'
import { AddHostModal } from '@/components/admin/AddHostModal'
import { Button } from '@/components/ui/Button'
import { getAllHosts } from '@/app/actions/admin'
import type { HostUser } from '@/types/admin'

export default function HostManagementPage() {
  const router = useRouter()
  const [hosts, setHosts] = useState<HostUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchHosts = async () => {
    setLoading(true)
    setError(null)

    const result = await getAllHosts()

    if (result.error) {
      setError(result.error)
    } else {
      setHosts(result.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single()

      const role = profile?.role || user.user_metadata?.role || 'participant'

      if (role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await fetchHosts()
    }

    void checkAdminAndFetch()
  }, [router])

  const handleRemoveSuccess = () => {
    void fetchHosts()
  }

  const handleAddSuccess = () => {
    void fetchHosts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto" />
          <p className="mt-4 text-gray-600">Loading hosts…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Host management</h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
            Promote users to host for quiz session assignment and host-only routes.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add host
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <HostList hosts={hosts} onRemove={handleRemoveSuccess} />

      {showAddModal && (
        <AddHostModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          excludeUserIds={hosts.map((h) => h.id)}
        />
      )}
    </div>
  )
}
