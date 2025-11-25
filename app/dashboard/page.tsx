'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [participantData, setParticipantData] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Fetch participant data
      const { data: participant } = await supabase
        .from('participants')
        .select('*, teams(*)')
        .eq('email', currentUser.email)
        .single()

      setParticipantData(participant)
      setLoading(false)
    }

    fetchUser()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Welcome to Gyana Spandana
              </h1>
              <p className="text-gray-600 mt-2">
                {participantData?.name || user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Team Info Card */}
        {participantData?.teams && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Team Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Team Name:</span>
                <p className="text-lg text-gray-900">{participantData.teams.team_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Your Role:</span>
                <p className="text-lg text-gray-900">
                  {participantData.is_participant1 ? 'Participant 1' : 'Participant 2'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">School:</span>
                <p className="text-lg text-gray-900">{participantData.school_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Status Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quiz Status</h2>
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              Quiz functionality will be available soon.
            </p>
            <p className="text-gray-500">
              Please wait for further instructions from the organizers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

