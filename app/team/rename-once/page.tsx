'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { renameTeamNameOnce } from '@/app/actions/team'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TEAM_NAME_MAX_LENGTH } from '@/lib/validations'

export default function RenameTeamOncePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentName, setCurrentName] = useState('')
  const [newName, setNewName] = useState('')
  const [notAllowedReason, setNotAllowedReason] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
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
      if (role === 'admin') {
        router.replace('/admin')
        return
      }

      const { data: participant } = await supabase
        .from('participants')
        .select('is_participant1, team_id, teams(team_name, status, team_name_renamed_at)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!participant?.team_id) {
        setNotAllowedReason('You are not on a team yet.')
        setLoading(false)
        return
      }

      if (!participant.is_participant1) {
        setNotAllowedReason('Only Participant 1 can change the team name.')
        setLoading(false)
        return
      }

      const raw = participant.teams
      const teams = (Array.isArray(raw) ? raw[0] : raw) as {
        team_name: string
        status: string
        team_name_renamed_at: string | null
      } | null

      if (!teams || (teams.status !== 'pending_p2' && teams.status !== 'complete')) {
        setNotAllowedReason('Your team cannot be renamed from this page.')
        setLoading(false)
        return
      }

      if (teams.team_name_renamed_at) {
        setNotAllowedReason(
          'You have already used your one-time team rename. Contact support if you need further help.',
        )
        setLoading(false)
        return
      }

      setCurrentName(teams.team_name)
      setNewName(teams.team_name)
      setLoading(false)
    }

    void run()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await renameTeamNameOnce(newName)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccess(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C0392B] border-t-transparent" />
      </div>
    )
  }

  if (notAllowedReason) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-700 mb-6">{notAllowedReason}</p>
          <Link href="/dashboard">
            <Button variant="primary">Go to dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Team name updated</h1>
          <p className="text-gray-600 text-sm mb-6">
            Your team is now <strong>{newName.trim()}</strong>. If your teammate had not finished registering, they
            received a fresh invitation with the new name. If your team was already complete, your partner was notified by
            email.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#C0392B] to-[#E67E22] px-6 py-8 text-center">
            <div className="flex justify-center mb-3">
              <Image
                src="/images/logo.webp"
                alt="GYANA SPARDHA"
                width={56}
                height={56}
                className="object-contain rounded-lg"
              />
            </div>
            <h1 className="text-white text-xl font-bold">Rename your team (one-time)</h1>
            <p className="text-white/90 text-sm mt-1">Current name: {currentName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 space-y-2">
              <p className="font-medium">You can only change your team name once.</p>
              <p>Pick a name you are happy to use for the competition. In exceptional cases, organisers can reset this if you contact support.</p>
            </div>

            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                New team name
              </label>
              <Input
                id="team-name"
                type="text"
                autoComplete="off"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new team name"
                required
                maxLength={TEAM_NAME_MAX_LENGTH}
              />
              <p className="text-xs text-gray-500 mt-1">
                {TEAM_NAME_MAX_LENGTH} characters max. Must be unique.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" variant="primary" className="flex-1" isLoading={submitting} loadingText="Saving...">
                Save new team name
              </Button>
              <Link href="/dashboard" className="flex-1 sm:flex-none">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
