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

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 18h18l-1-9-5 4-3-6-3 6-5-4-1 9z" />
      <path d="M3 21h18" />
    </svg>
  )
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
  const topScore = rows.length ? rows[0].total_team_score : 0

  if (examsLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-8 w-56 animate-pulse rounded-md bg-gray-100" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-gray-100" />
          <div className="mt-5 h-11 w-full max-w-xl animate-pulse rounded-xl bg-gray-50" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-50" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!exams.length) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-[#C0392B]">
          <CrownIcon className="h-6 w-6" />
        </div>
        <p className="text-lg font-semibold text-gray-900">No public leaderboard yet</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Competition results will appear here when an organizer publishes a leaderboard for an active or
          completed exam.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#C0392B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
              Public rankings
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">Competition Leaderboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Follow live team standings as scores update. Choose a competition below to view rank, participant
              scores, and total points.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Competitions</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{exams.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Teams ranked</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{rows.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Top score</p>
                <p className="mt-1 text-lg font-semibold text-[#C0392B]">{topScore}</p>
              </div>
            </div>

            <div className="mt-5 max-w-xl">
              <label htmlFor="competition-exam-select" className="mb-2 block text-sm font-medium text-gray-700">
                Select competition
              </label>
              <select
                id="competition-exam-select"
                className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/20"
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
              <p className="mt-3 text-xs text-gray-600">
                Sharing link:{' '}
                <Link
                  href={`/competition/leaderboard/${selectedExamId}`}
                  className="font-medium text-[#C0392B] underline underline-offset-2"
                >
                  /competition/leaderboard/{selectedExamId}
                </Link>
              </p>
            ) : null}
          </div>

            <div className="xl:pt-1">
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 shadow-sm">
              <LiveLeaderboardMeta
                lastUpdatedAt={lastUpdatedAt}
                status={realtimeStatus}
                usePollFallback={usePollFallback}
                showLive={Boolean(selectedExamId)}
              />
            </div>
          </div>
        </div>
      </section>

      {!selectedExamId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Select a competition to view rankings.
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Unable to load leaderboard</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            onClick={() => void fetchScores()}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : loadingScores && rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 h-5 w-36 animate-pulse rounded bg-gray-100" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-gray-900">{selectedTitle}</p>
          <p className="mt-2 text-sm text-gray-600">
            No scores are available yet. Rankings will appear here after teams submit their attempts.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Team</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Participant 1</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Participant 2</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, index) => {
                  const rank = row.rank ?? index + 1
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                  const isTop3 = rank <= 3
                  return (
                    <tr key={row.id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex min-w-[3.5rem] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isTop3 ? 'bg-orange-100 text-[#C0392B]' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {medal} #{rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.teams?.team_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.participant1_score}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.participant2_score}</td>
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
                <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-[#C0392B]">
                        {medal} Rank #{rank}
                      </span>
                      <p className="mt-2 text-base font-semibold text-gray-900">{row.teams?.team_name ?? 'Team'}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#C0392B]">{row.total_team_score}</p>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    P1: {row.participant1_score} · P2: {row.participant2_score}
                  </p>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
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
