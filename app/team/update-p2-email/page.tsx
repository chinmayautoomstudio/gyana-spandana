'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { updateP2InvitedEmail } from '@/app/actions/team'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function UpdateP2EmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [currentInviteEmail, setCurrentInviteEmail] = useState('')
  const [email, setEmail] = useState('')
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
        .select('is_participant1, team_id, teams(team_name, status, p2_invited_email)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!participant?.team_id) {
        setNotAllowedReason('You are not on a team yet.')
        setLoading(false)
        return
      }

      if (!participant.is_participant1) {
        setNotAllowedReason('Only Participant 1 can update the invited email for Participant 2.')
        setLoading(false)
        return
      }

      const raw = participant.teams
      const teams = (Array.isArray(raw) ? raw[0] : raw) as {
        team_name: string
        status: string
        p2_invited_email: string | null
      } | null

      if (!teams || teams.status !== 'pending_p2') {
        setNotAllowedReason('Your team registration is already complete. Email cannot be changed here.')
        setLoading(false)
        return
      }

      setTeamName(teams.team_name)
      const invite = teams.p2_invited_email ?? ''
      setCurrentInviteEmail(invite)
      setEmail(invite)
      setLoading(false)
    }

    void run()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await updateP2InvitedEmail(email)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setCurrentInviteEmail(email.trim().toLowerCase())
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Email updated</h1>
          <p className="text-gray-600 text-sm mb-6">
            We sent a new invitation to <strong>{email.trim()}</strong>. The previous invite link no longer works.
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
            <h1 className="text-white text-xl font-bold">Update Participant 2 email</h1>
            <p className="text-white/90 text-sm mt-1">
              {teamName ? `Team: ${teamName}` : 'Pending teammate registration'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <p className="text-sm text-gray-600">
              If you entered the wrong email for Participant 2, update it here. We will send a fresh invitation to the new
              address. You can only do this before your teammate completes registration.
            </p>

            <div>
              <label htmlFor="p2-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Participant 2 email address
              </label>
              <Input
                id="p2-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                required
              />
              {currentInviteEmail && (
                <p className="text-xs text-gray-500 mt-1">Current invite: {currentInviteEmail}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" variant="primary" className="flex-1" isLoading={submitting} loadingText="Saving...">
                Save and send new invite
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
