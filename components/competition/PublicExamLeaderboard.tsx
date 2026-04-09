'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePostgresLeaderboardRealtime } from '@/lib/hooks/usePostgresLeaderboardRealtime'
import { LiveLeaderboardMeta } from '@/components/leaderboard/LiveLeaderboardMeta'

export type PublishedExamOption = { id: string; title: string }

export interface TeamScoreRow {
  id: string
  team_id: string
  exam_id: string
  participant1_score: number
  participant2_score: number
  total_team_score: number
  rank: number | null
  teams: { team_name: string } | null
}

type PublicExamLeaderboardProps = {
  selectedExamId: string | null
  exams: PublishedExamOption[]
  examsLoading: boolean
  onSelectExamId: (id: string) => void
}

export function PublicExamLeaderboard({
  selectedExamId,
  exams,
  examsLoading,
  onSelectExamId,
}: PublicExamLeaderboardProps) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<TeamScoreRow[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const selectedTitle = exams.find((e) => e.id === selectedExamId)?.title ?? 'Competition'

  const fetchScores = useCallback(async () => {
    if (!selectedExamId) {
      setRows([])
      return
    }
    setLoadingScores(true)
    setError(null)
    try {
      const { data, error: qError } = await supabase
        .from('team_scores')
        .select(
          'id, team_id, exam_id, participant1_score, participant2_score, total_team_score, rank, teams(team_name)',
        )
        .eq('exam_id', selectedExamId)
        .order('total_team_score', { ascending: false })

      if (qError) throw qError
      setRows((data || []) as unknown as TeamScoreRow[])
      setLastUpdatedAt(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load scores')
      setRows([])
    } finally {
      setLoadingScores(false)
    }
  }, [selectedExamId, supabase])

  useEffect(() => {
    void fetchScores()
  }, [fetchScores])

  const { status: realtimeStatus, usePollFallback } = usePostgresLeaderboardRealtime({
    supabase,
    enabled: Boolean(selectedExamId),
    channelName: `public-competition-team-scores-${selectedExamId ?? 'none'}`,
    table: 'team_scores',
    filter: selectedExamId
      ? `exam_id=eq.${selectedExamId}`
      : 'exam_id=eq.00000000-0000-0000-0000-000000000000',
    onDataStale: fetchScores,
  })

  const maxScore = Math.max(1, ...rows.map((r) => r.total_team_score || 0))

  if (examsLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
        Loading…
      </div>
    )
  }

  if (!exams.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        <p className="text-lg font-medium text-gray-900">No public leaderboard yet</p>
        <p className="mt-2 text-sm">
          Competition results will appear here when an organizer publishes a leaderboard for an active or
          completed exam.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Competition leaderboard</h1>
            <p className="mt-1 text-sm text-gray-600">Team rankings update live as scores change.</p>
            <div className="mt-4 max-w-xl">
              <label htmlFor="competition-exam-select" className="sr-only">
                Select competition
              </label>
              <select
                id="competition-exam-select"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedExamId ?? ''}
                onChange={(e) => {
                  const id = e.target.value
                  if (id) onSelectExamId(id)
                }}
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
            {selectedExamId ? (
              <p className="mt-2 text-xs text-gray-500">
                <Link
                  href={`/competition/leaderboard/${selectedExamId}`}
                  className="text-[#C0392B] underline-offset-2 hover:underline"
                >
                  Link to this competition
                </Link>
              </p>
            ) : null}
          </div>
          <LiveLeaderboardMeta
            lastUpdatedAt={lastUpdatedAt}
            status={realtimeStatus}
            usePollFallback={usePollFallback}
            showLive={Boolean(selectedExamId)}
          />
        </div>
      </div>

      {!selectedExamId ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          Select a competition to view rankings.
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      ) : loadingScores && rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">Loading scores…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          <p className="font-medium text-gray-900">{selectedTitle}</p>
          <p className="mt-2 text-sm">No scores yet. Rankings will appear after teams submit attempts.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Team</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Participant 1</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Participant 2</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, index) => {
                  const rank = row.rank ?? index + 1
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {medal} {rank}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{row.teams?.team_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {row.participant1_score}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {row.participant2_score}
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold tabular-nums text-[#C0392B]">
                        {row.total_team_score}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row, index) => {
              const rank = row.rank ?? index + 1
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
              const percent = Math.max(4, Math.round(((row.total_team_score || 0) / maxScore) * 100))
              return (
                <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {medal} {row.teams?.team_name ?? 'Team'}
                    </p>
                    <p className="text-2xl font-bold text-[#C0392B]">{row.total_team_score} pts</p>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    Rank {rank} · P1: {row.participant1_score} · P2: {row.participant2_score}
                  </p>
                  <div className="h-3 w-full rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C0392B] to-[#E67E22] transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
