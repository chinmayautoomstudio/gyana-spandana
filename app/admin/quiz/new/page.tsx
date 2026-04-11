'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'

type TeamLabel = 'A' | 'B' | 'C' | 'D'

interface TeamOption {
  id: string
  team_name: string
}

interface HostOption {
  user_id: string
  name: string | null
}

interface QuestionSet {
  id: string
  name: string
  total_questions: number
}

interface RoundConfig {
  round_type: 'direct_question' | 'true_or_false'
  title: string
  question_set_id: string
  true_false_mode?: 'directed' | 'buzzer'
  /** Omit or leave unset to snapshot every question in the set (set order). */
  question_count?: number
}

export default function NewQuizSessionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teams, setTeams] = useState<TeamOption[]>([])
  const [hosts, setHosts] = useState<HostOption[]>([])
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])

  const [title, setTitle] = useState('')
  const [hostId, setHostId] = useState('')
  const [pointsFull, setPointsFull] = useState(10)
  const [pointsHalf, setPointsHalf] = useState(5)
  const [teamSlots, setTeamSlots] = useState<Record<TeamLabel, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
  })
  const [rounds, setRounds] = useState<RoundConfig[]>([
    { round_type: 'direct_question', title: 'Direct Question Round', question_set_id: '' },
  ])
  const [isTestSession, setIsTestSession] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: teamRows, error: teamsErr }, { data: hostRows, error: hostsErr }, qRes] =
          await Promise.all([
            supabase.from('teams').select('id,team_name').order('team_name', { ascending: true }),
            supabase
              .from('user_profiles')
              .select('user_id,name,role')
              .eq('role', 'host')
              .order('name', { ascending: true }),
            fetch('/api/admin/question-sets'),
          ])

        if (teamsErr) throw teamsErr
        if (hostsErr) throw hostsErr
        if (!qRes.ok) {
          const qData = await qRes.json().catch(() => ({}))
          throw new Error(qData?.error || 'Failed to load question sets')
        }

        const qData = await qRes.json()
        setTeams((teamRows || []) as TeamOption[])
        setHosts((hostRows || []).map((h: any) => ({ user_id: h.user_id, name: h.name })))
        setQuestionSets((qData.questionSets || []) as QuestionSet[])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [supabase])

  const addRound = () => {
    setRounds((prev) => [
      ...prev,
      { round_type: 'direct_question', title: `Direct Question Round ${prev.length + 1}`, question_set_id: '' },
    ])
  }

  const updateRound = (index: number, patch: Partial<RoundConfig>) => {
    setRounds((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const removeRound = (index: number) => {
    setRounds((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const selectedTeams = Object.values(teamSlots).filter(Boolean)
      if (isTestSession) {
        if (selectedTeams.length < 1) throw new Error('Testing session: assign at least one team')
        if (new Set(selectedTeams).size !== selectedTeams.length) throw new Error('Each team slot must be unique')
      } else {
        if (selectedTeams.length !== 4) throw new Error('All 4 team slots are required')
        if (new Set(selectedTeams).size !== 4) throw new Error('Each team slot must be unique')
      }
      if (!title.trim()) throw new Error('Session title is required')
      if (!hostId) throw new Error('Please select a host')
      if (rounds.length === 0) throw new Error('At least one round is required')
      if (rounds.some((r) => !r.question_set_id)) throw new Error('Each round needs a question set')

      const roundsPayload = rounds.map((r) => {
        const { question_count, ...rest } = r
        if (question_count !== undefined && question_count !== null && question_count > 0) {
          return { ...rest, question_count }
        }
        return rest
      })

      const res = await fetch('/api/admin/quiz/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          assigned_host_id: hostId,
          team_slots: teamSlots,
          points_full: pointsFull,
          points_half: pointsHalf,
          rounds: roundsPayload,
          is_test_session: isTestSession,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create session')
      router.push('/admin/quiz')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const disabledTeamIds = new Set(Object.values(teamSlots).filter(Boolean))

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Create Quiz Session</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <Input label="Session title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Assign host</label>
            <select
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
              required
            >
              <option value="">Select host</option>
              {hosts.map((host) => (
                <option key={host.user_id} value={host.user_id}>
                  {host.name || host.user_id}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <input
              type="checkbox"
              checked={isTestSession}
              onChange={(e) => setIsTestSession(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <span>
              <span className="font-medium text-gray-900">Testing session</span>
              <span className="mt-1 block text-sm text-gray-600">
                Assign one or more teams without filling all four slots. Scores still save to the database; use this to verify host and play flows before a live event.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Points (full)"
              type="number"
              min={1}
              value={String(pointsFull)}
              onChange={(e) => setPointsFull(Number(e.target.value || 10))}
              required
            />
            <Input
              label="Points (half)"
              type="number"
              min={0}
              value={String(pointsHalf)}
              onChange={(e) => setPointsHalf(Number(e.target.value || 5))}
              required
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Team slots{isTestSession ? ' (at least one)' : ' (all four required)'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(['A', 'B', 'C', 'D'] as TeamLabel[]).map((label) => (
              <div key={label}>
                <label className="mb-2 block text-sm font-medium text-gray-700">Team {label}</label>
                <select
                  value={teamSlots[label]}
                  onChange={(e) => setTeamSlots((prev) => ({ ...prev, [label]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  required={!isTestSession}
                >
                  <option value="">Select team</option>
                  {teams.map((team) => {
                    const currentlySelected = teamSlots[label] === team.id
                    return (
                      <option
                        key={team.id}
                        value={team.id}
                        disabled={disabledTeamIds.has(team.id) && !currentlySelected}
                      >
                        {team.team_name}
                      </option>
                    )
                  })}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Rounds</h2>
            <Button type="button" variant="outline" onClick={addRound}>
              Add round
            </Button>
          </div>

          {rounds.map((round, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Round {index + 1}</p>
                {rounds.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRound(index)}>
                    Remove
                  </Button>
                )}
              </div>
              <Input
                label="Round title"
                value={round.title}
                onChange={(e) => updateRound(index, { title: e.target.value })}
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Round type</label>
                <select
                  value={round.round_type}
                  onChange={(e) => {
                    const nextType = e.target.value as RoundConfig['round_type']
                    updateRound(index, {
                      round_type: nextType,
                      title:
                        nextType === 'true_or_false'
                          ? round.title || `True/False Round ${index + 1}`
                          : round.title || `Direct Question Round ${index + 1}`,
                      true_false_mode: nextType === 'true_or_false' ? 'directed' : undefined,
                    })
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                >
                  <option value="direct_question">Direct Question</option>
                  <option value="true_or_false">True/False (Directed)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Question set</label>
                <select
                  value={round.question_set_id}
                  onChange={(e) => updateRound(index, { question_set_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  required
                >
                  <option value="">Select question set</option>
                  {questionSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.total_questions})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Questions to include (optional)"
                type="number"
                min={1}
                value={
                  round.question_count !== undefined && round.question_count !== null
                    ? String(round.question_count)
                    : ''
                }
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    updateRound(index, { question_count: undefined })
                    return
                  }
                  const n = parseInt(v, 10)
                  if (!Number.isNaN(n)) {
                    updateRound(index, { question_count: n })
                  }
                }}
                helperText={
                  round.question_set_id
                    ? (() => {
                        const s = questionSets.find((x) => x.id === round.question_set_id)
                        return s
                          ? `Set has ${s.total_questions} question(s). Leave blank to include all, in set order.`
                          : 'Leave blank to include every question from the set (in set order).'
                      })()
                    : 'Select a question set first. Leave blank to include all questions.'
                }
              />
            </div>
          ))}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3">
          <Button type="submit" isLoading={saving}>
            Create session
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/quiz')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

