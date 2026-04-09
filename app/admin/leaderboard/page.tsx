/*
 * Supabase: enable Realtime on `team_scores` and `quiz_session_scores`; ensure
 * admin-authenticated users can SELECT via RLS for postgres_changes. See
 * `lib/hooks/usePostgresLeaderboardRealtime.ts` for dashboard checklist.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ExportButton } from '@/components/admin/ExportButton'
import { usePostgresLeaderboardRealtime } from '@/lib/hooks/usePostgresLeaderboardRealtime'
import { LiveLeaderboardMeta } from '@/components/leaderboard/LiveLeaderboardMeta'

interface TeamScore {
  id: string
  team_id: string
  exam_id: string
  participant1_score: number
  participant2_score: number
  total_team_score: number
  rank: number | null
  teams: {
    team_name: string
  }
  exams: {
    title: string
  }
}

interface Exam {
  id: string
  title: string
}

interface QuizLiveSession {
  id: string
  title: string
}

interface LiveScoreRow {
  id: string
  team_label: 'A' | 'B' | 'C' | 'D'
  total_score: number
  questions_correct: number
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<'exam' | 'live'>('exam')
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [teamScores, setTeamScores] = useState<TeamScore[]>([])

  const [liveSessions, setLiveSessions] = useState<QuizLiveSession[]>([])
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<
    string | null
  >(null)
  const [liveScores, setLiveScores] = useState<LiveScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  const [lastExamUpdatedAt, setLastExamUpdatedAt] = useState<Date | null>(null)
  const [lastLiveUpdatedAt, setLastLiveUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      const [{ data: examRows }, { data: liveRows }] = await Promise.all([
        supabase
          .from('exams')
          .select('id, title')
          .in('status', ['active', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('quiz_live_sessions')
          .select('id,title')
          .in('status', ['active', 'completed'])
          .order('created_at', { ascending: false }),
      ])

      setExams(examRows || [])
      if (examRows && examRows.length > 0) {
        setSelectedExamId(examRows[0].id)
      }
      setLiveSessions(liveRows || [])
      if (liveRows && liveRows.length > 0) {
        setSelectedLiveSessionId(liveRows[0].id)
      }
      setLoading(false)
    }

    void bootstrap()
  }, [supabase])

  const fetchExamLeaderboard = useCallback(async () => {
    if (!selectedExamId) return
    const { data, error } = await supabase
      .from('team_scores')
      .select('*, teams(team_name), exams(title)')
      .eq('exam_id', selectedExamId)
      .order('total_team_score', { ascending: false })
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching leaderboard:', error)
    } else {
      setTeamScores(data || [])
    }
    setLastExamUpdatedAt(new Date())
  }, [selectedExamId, supabase])

  const fetchLiveLeaderboard = useCallback(async () => {
    if (!selectedLiveSessionId) return
    const { data, error } = await supabase
      .from('quiz_session_scores')
      .select('id,team_label,total_score,questions_correct')
      .eq('session_id', selectedLiveSessionId)
      .order('total_score', { ascending: false })

    if (error) {
      console.error('Error fetching live leaderboard:', error)
    } else {
      setLiveScores((data || []) as LiveScoreRow[])
    }
    setLastLiveUpdatedAt(new Date())
  }, [selectedLiveSessionId, supabase])

  useEffect(() => {
    if (!selectedExamId) return
    void fetchExamLeaderboard()
  }, [selectedExamId, fetchExamLeaderboard])

  useEffect(() => {
    if (!selectedLiveSessionId) return
    void fetchLiveLeaderboard()
  }, [selectedLiveSessionId, fetchLiveLeaderboard])

  const { status: examRealtimeStatus, usePollFallback: examPollFallback } =
    usePostgresLeaderboardRealtime({
      supabase,
      enabled: activeTab === 'exam' && Boolean(selectedExamId),
      channelName: `admin-team-scores-${selectedExamId ?? 'none'}`,
      table: 'team_scores',
      filter: `exam_id=eq.${selectedExamId}`,
      onDataStale: fetchExamLeaderboard,
    })

  const { status: liveRealtimeStatus, usePollFallback: livePollFallback } =
    usePostgresLeaderboardRealtime({
      supabase,
      enabled: activeTab === 'live' && Boolean(selectedLiveSessionId),
      channelName: `admin-quiz-session-scores-${selectedLiveSessionId ?? 'none'}`,
      table: 'quiz_session_scores',
      filter: `session_id=eq.${selectedLiveSessionId}`,
      onDataStale: fetchLiveLeaderboard,
    })

  const prevExamPollFallback = useRef(false)
  useEffect(() => {
    if (activeTab !== 'exam') {
      prevExamPollFallback.current = examPollFallback
      return
    }
    if (examPollFallback && !prevExamPollFallback.current) {
      toast.warning(
        'Exam leaderboard: Supabase Realtime is unavailable. Scores will refresh every 5 seconds.',
        { id: 'admin-leaderboard-exam-poll', duration: 10_000 },
      )
    } else if (!examPollFallback && prevExamPollFallback.current) {
      toast.success('Exam leaderboard: live updates restored.', {
        id: 'admin-leaderboard-exam-ok',
        duration: 4000,
      })
      toast.dismiss('admin-leaderboard-exam-poll')
    }
    prevExamPollFallback.current = examPollFallback
  }, [activeTab, examPollFallback])

  const prevLivePollFallback = useRef(false)
  useEffect(() => {
    if (activeTab !== 'live') {
      prevLivePollFallback.current = livePollFallback
      return
    }
    if (livePollFallback && !prevLivePollFallback.current) {
      toast.warning(
        'Live session leaderboard: Supabase Realtime is unavailable. Scores will refresh every 5 seconds.',
        { id: 'admin-leaderboard-live-poll', duration: 10_000 },
      )
    } else if (!livePollFallback && prevLivePollFallback.current) {
      toast.success('Live session leaderboard: live updates restored.', {
        id: 'admin-leaderboard-live-ok',
        duration: 4000,
      })
      toast.dismiss('admin-leaderboard-live-poll')
    }
    prevLivePollFallback.current = livePollFallback
  }, [activeTab, livePollFallback])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C0392B]" />
      </div>
    )
  }

  const examExportData = teamScores.map((ts, index) => ({
    Rank: ts.rank || index + 1,
    'Team Name': ts.teams?.team_name || 'N/A',
    'Participant 1 Score': ts.participant1_score,
    'Participant 2 Score': ts.participant2_score,
    'Total Score': ts.total_team_score,
  }))

  const liveExportData = liveScores.map((row, index) => ({
    Rank: index + 1,
    Team: row.team_label,
    'Total Score': row.total_score,
    'Questions Correct': row.questions_correct,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'exam' && selectedExamId && teamScores.length > 0 && (
            <ExportButton
              data={examExportData}
              filename={`leaderboard-${selectedExamId}`}
              exportType="both"
              pdfTitle={`Leaderboard - ${exams.find((e) => e.id === selectedExamId)?.title || 'Exam'}`}
              columns={[
                { header: 'Rank', dataKey: 'Rank' },
                { header: 'Team Name', dataKey: 'Team Name' },
                { header: 'Participant 1 Score', dataKey: 'Participant 1 Score' },
                { header: 'Participant 2 Score', dataKey: 'Participant 2 Score' },
                { header: 'Total Score', dataKey: 'Total Score' },
              ]}
            />
          )}
          {activeTab === 'live' &&
            selectedLiveSessionId &&
            liveScores.length > 0 && (
              <ExportButton
                data={liveExportData}
                filename={`live-leaderboard-${selectedLiveSessionId}`}
                exportType="both"
                pdfTitle={`Live Leaderboard - ${liveSessions.find((s) => s.id === selectedLiveSessionId)?.title || 'Session'}`}
                columns={[
                  { header: 'Rank', dataKey: 'Rank' },
                  { header: 'Team', dataKey: 'Team' },
                  { header: 'Total Score', dataKey: 'Total Score' },
                  {
                    header: 'Questions Correct',
                    dataKey: 'Questions Correct',
                  },
                ]}
              />
            )}
          <div className="w-72">
            <select
              value={
                activeTab === 'exam'
                  ? selectedExamId || ''
                  : selectedLiveSessionId || ''
              }
              onChange={(e) =>
                activeTab === 'exam'
                  ? setSelectedExamId(e.target.value)
                  : setSelectedLiveSessionId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
            >
              {activeTab === 'exam' ? (
                <>
                  <option value="">Select an exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">Select a live session</option>
                  {liveSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab('exam')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'exam'
              ? 'bg-[#C0392B] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Exam Leaderboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'live'
              ? 'bg-[#C0392B] text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Live Sessions
        </button>
      </div>

      {activeTab === 'exam' && selectedExamId && teamScores.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/70 p-12 text-center shadow-lg backdrop-blur-xl">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            No scores yet
          </h3>
          <p className="text-gray-500">
            Scores will appear here once participants submit their exams
          </p>
        </div>
      ) : activeTab === 'exam' && selectedExamId ? (
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl">
          <div className="flex justify-end border-b border-gray-100 px-4 py-3">
            <LiveLeaderboardMeta
              lastUpdatedAt={lastExamUpdatedAt}
              status={examRealtimeStatus}
              usePollFallback={examPollFallback}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Team Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Participant 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Participant 2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {teamScores.map((teamScore, index) => (
                  <tr key={teamScore.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        {teamScore.rank === 1 && (
                          <span className="text-2xl">🥇</span>
                        )}
                        {teamScore.rank === 2 && (
                          <span className="text-2xl">🥈</span>
                        )}
                        {teamScore.rank === 3 && (
                          <span className="text-2xl">🥉</span>
                        )}
                        <span
                          className={`text-lg font-bold ${
                            teamScore.rank === 1
                              ? 'text-yellow-600'
                              : teamScore.rank === 2
                                ? 'text-gray-400'
                                : teamScore.rank === 3
                                  ? 'text-orange-600'
                                  : 'text-gray-600'
                          }`}
                        >
                          {teamScore.rank || index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {teamScore.teams?.team_name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {teamScore.participant1_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {teamScore.participant2_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-lg font-bold text-[#C0392B]">
                        {teamScore.total_team_score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'live' && selectedLiveSessionId ? (
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl">
          <div className="flex justify-end border-b border-gray-100 px-4 py-3">
            <LiveLeaderboardMeta
              lastUpdatedAt={lastLiveUpdatedAt}
              status={liveRealtimeStatus}
              usePollFallback={livePollFallback}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Questions Correct
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {liveScores.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      Team {row.team_label}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-lg font-bold text-[#C0392B]">
                      {row.total_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {row.questions_correct}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/20 bg-white/70 p-12 text-center shadow-lg backdrop-blur-xl">
          <p className="text-gray-600">
            Please select{' '}
            {activeTab === 'exam' ? 'an exam' : 'a live session'} to view the
            leaderboard
          </p>
        </div>
      )}
    </div>
  )
}
