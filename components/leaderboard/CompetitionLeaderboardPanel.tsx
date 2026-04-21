'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ExportButton } from '@/components/admin/ExportButton'
import { usePostgresLeaderboardRealtime } from '@/lib/hooks/usePostgresLeaderboardRealtime'
import type { LeaderboardRealtimeStatus } from '@/lib/hooks/usePostgresLeaderboardRealtime'
import { LiveLeaderboardMeta } from '@/components/leaderboard/LiveLeaderboardMeta'

export type LeaderboardExamOption = { id: string; title: string }

export type CompetitionLeaderboardVariant = 'admin' | 'public'

export type ControlledExamSelection = {
  exams: LeaderboardExamOption[]
  selectedExamId: string | null
  onSelectExamId: (id: string) => void
  loading: boolean
}

interface TeamScore {
  id: string
  team_id: string
  exam_id: string
  participant1_score: number
  participant2_score: number
  total_team_score: number
  rank: number | null
  team_name?: string | null
}

interface QuizLiveSession {
  id: string
  title: string
}

interface LiveScoreRow {
  id: string
  team_label: 'A' | 'B' | 'C' | 'D'
  team_id: string | null
  total_score: number
  questions_correct: number
}

export interface FinalScoreRow {
  teamId: string
  teamName: string
  pointsScored: number
  rank: number
}

function mergeFinalRealtimeStatus(
  a: LeaderboardRealtimeStatus,
  b: LeaderboardRealtimeStatus,
  pollA: boolean,
  pollB: boolean,
): { status: LeaderboardRealtimeStatus; usePollFallback: boolean } {
  const usePollFallback = pollA || pollB
  if (usePollFallback) {
    return { status: 'SUBSCRIBED', usePollFallback: true }
  }
  if (a === 'SUBSCRIBED' && b === 'SUBSCRIBED') {
    return { status: 'SUBSCRIBED', usePollFallback: false }
  }
  const order: LeaderboardRealtimeStatus[] = [
    'CHANNEL_ERROR',
    'TIMED_OUT',
    'CLOSED',
    'connecting',
    'paused',
    'idle',
    'SUBSCRIBED',
  ]
  const pick = (x: LeaderboardRealtimeStatus, y: LeaderboardRealtimeStatus) =>
    order.indexOf(x) < order.indexOf(y) ? x : y
  return { status: pick(a, b), usePollFallback: false }
}

export interface CompetitionLeaderboardPanelProps {
  variant: CompetitionLeaderboardVariant
  /** Public pages: parent supplies exam catalog + selection. */
  controlledExams?: ControlledExamSelection
  /** Show top H1 (default: true for public, false for admin). */
  showHeading?: boolean
  headingText?: string
}

export function CompetitionLeaderboardPanel({
  variant,
  controlledExams,
  showHeading,
  headingText,
}: CompetitionLeaderboardPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const toastPrefix = variant === 'admin' ? 'admin-leaderboard' : 'public-competition-leaderboard'

  const [activeTab, setActiveTab] = useState<'exam' | 'live' | 'final'>('exam')
  const [internalExams, setInternalExams] = useState<LeaderboardExamOption[]>([])
  const [internalSelectedExamId, setInternalSelectedExamId] = useState<string | null>(null)
  const [liveSessions, setLiveSessions] = useState<QuizLiveSession[]>([])
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(null)
  const [teamScores, setTeamScores] = useState<TeamScore[]>([])
  const [liveScores, setLiveScores] = useState<LiveScoreRow[]>([])
  const [finalRows, setFinalRows] = useState<FinalScoreRow[]>([])
  const [liveTeamNames, setLiveTeamNames] = useState<Partial<Record<'A' | 'B' | 'C' | 'D', string>>>({})
  const [internalLoading, setInternalLoading] = useState(true)

  const [lastExamUpdatedAt, setLastExamUpdatedAt] = useState<Date | null>(null)
  const [lastLiveUpdatedAt, setLastLiveUpdatedAt] = useState<Date | null>(null)
  const [lastFinalUpdatedAt, setLastFinalUpdatedAt] = useState<Date | null>(null)

  const exams = controlledExams?.exams ?? internalExams
  const selectedExamId = controlledExams?.selectedExamId ?? internalSelectedExamId
  const setSelectedExamId = controlledExams?.onSelectExamId ?? setInternalSelectedExamId

  const loading =
    controlledExams != null ? internalLoading || controlledExams.loading : internalLoading

  const effectiveShowHeading =
    showHeading ?? (variant === 'public')
  const effectiveHeading = headingText ?? (variant === 'public' ? 'Leaderboard' : 'Leaderboard')

  useEffect(() => {
    const bootstrap = async () => {
      if (controlledExams) {
        setInternalLoading(true)
        let liveQuery = supabase
          .from('quiz_live_sessions')
          .select('id,title')
          .in('status', ['active', 'completed'])
          .order('created_at', { ascending: false })
        if (variant === 'public') {
          liveQuery = liveQuery.eq('public_leaderboard_visible', true)
        }
        const { data: liveRows } = await liveQuery
        setLiveSessions(liveRows || [])
        if (liveRows && liveRows.length > 0) {
          setSelectedLiveSessionId(liveRows[0].id)
        }
        setInternalLoading(false)
        return
      }

      setInternalLoading(true)
      let examQuery = supabase
        .from('exams')
        .select('id, title')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
      if (variant === 'public') {
        examQuery = examQuery.eq('public_leaderboard_visible', true)
      }
      let liveQuery = supabase
        .from('quiz_live_sessions')
        .select('id,title')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
      if (variant === 'public') {
        liveQuery = liveQuery.eq('public_leaderboard_visible', true)
      }

      const [{ data: examRows }, { data: liveRows }] = await Promise.all([examQuery, liveQuery])

      setInternalExams(examRows || [])
      if (examRows && examRows.length > 0) {
        setInternalSelectedExamId(examRows[0].id)
      }
      setLiveSessions(liveRows || [])
      if (liveRows && liveRows.length > 0) {
        setSelectedLiveSessionId(liveRows[0].id)
      }
      setInternalLoading(false)
    }

    void bootstrap()
  }, [supabase, variant, controlledExams])

  const resolveTeamNamesMap = useCallback(
    async (teamIds: string[]) => {
      const uniq = [...new Set(teamIds.filter(Boolean))]
      if (uniq.length === 0) return new Map<string, string>()
      const { data: teams } = await supabase
        .from('teams')
        .select('id,team_name')
        .in('id', uniq)
        .eq('is_eliminated', false)
      return new Map(
        (teams || [])
          .filter((row) => row?.id)
          .map((row) => [String(row.id), String(row.team_name || '').trim()]),
      )
    },
    [supabase],
  )

  const fetchExamLeaderboard = useCallback(async () => {
    if (!selectedExamId) return
    const { data, error } = await supabase
      .from('team_scores')
      .select('id, team_id, exam_id, participant1_score, participant2_score, total_team_score, rank')
      .eq('exam_id', selectedExamId)
      .order('total_team_score', { ascending: false })
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching leaderboard:', error)
    } else {
      const rawRows = (data || []) as TeamScore[]
      const teamIds = [...new Set(rawRows.map((row) => row.team_id).filter(Boolean))]
      const nameById = await resolveTeamNamesMap(teamIds)
      setTeamScores(
        rawRows
          .filter((row) => nameById.has(String(row.team_id || '')))
          .map((row) => ({
            ...row,
            team_name: nameById.get(String(row.team_id || '')) || null,
          })),
      )
    }
    setLastExamUpdatedAt(new Date())
  }, [selectedExamId, supabase, resolveTeamNamesMap])

  const fetchLiveTeamNames = useCallback(async () => {
    if (!selectedLiveSessionId) {
      setLiveTeamNames({})
      return
    }
    const { data: session, error } = await supabase
      .from('quiz_live_sessions')
      .select('team_slots')
      .eq('id', selectedLiveSessionId)
      .maybeSingle()
    if (error || !session?.team_slots) {
      setLiveTeamNames({})
      return
    }
    const slots = (session.team_slots || {}) as Record<string, string>
    const ids = (['A', 'B', 'C', 'D'] as const)
      .map((l) => slots[l])
      .filter((v): v is string => Boolean(v && String(v).trim()))
    if (ids.length === 0) {
      setLiveTeamNames({})
      return
    }
    const nameById = await resolveTeamNamesMap(ids)
    setLiveTeamNames({
      A: nameById.get(String(slots.A || ''))?.trim() || 'Unassigned',
      B: nameById.get(String(slots.B || ''))?.trim() || 'Unassigned',
      C: nameById.get(String(slots.C || ''))?.trim() || 'Unassigned',
      D: nameById.get(String(slots.D || ''))?.trim() || 'Unassigned',
    })
  }, [selectedLiveSessionId, supabase, resolveTeamNamesMap])

  const fetchLiveLeaderboard = useCallback(async () => {
    if (!selectedLiveSessionId) return
    const { data, error } = await supabase
      .from('quiz_session_scores')
      .select('id,team_label,team_id,total_score,questions_correct')
      .eq('session_id', selectedLiveSessionId)
      .order('total_score', { ascending: false })

    if (error) {
      console.error('Error fetching live leaderboard:', error)
    } else {
      const rows = (data || []) as LiveScoreRow[]
      const { data: session } = await supabase
        .from('quiz_live_sessions')
        .select('team_slots')
        .eq('id', selectedLiveSessionId)
        .maybeSingle()
      const slots = ((session?.team_slots || {}) as Record<string, string>) || {}
      const candidateTeamIds = rows
        .map((row) => row.team_id || slots[row.team_label] || null)
        .filter((id): id is string => Boolean(id))
      const activeNames = await resolveTeamNamesMap(candidateTeamIds)
      setLiveScores(
        rows.filter((row) => {
          const resolvedTeamId = row.team_id || slots[row.team_label] || null
          return Boolean(resolvedTeamId && activeNames.has(String(resolvedTeamId)))
        }),
      )
    }
    setLastLiveUpdatedAt(new Date())
  }, [selectedLiveSessionId, supabase, resolveTeamNamesMap])

  const fetchFinalLeaderboard = useCallback(async () => {
    if (!selectedExamId || !selectedLiveSessionId) {
      setFinalRows([])
      return
    }

    const [{ data: quizData, error: quizError }, sessionRes] = await Promise.all([
      supabase
        .from('quiz_session_scores')
        .select('team_label, team_id, total_score')
        .eq('session_id', selectedLiveSessionId),
      supabase
        .from('quiz_live_sessions')
        .select('team_slots')
        .eq('id', selectedLiveSessionId)
        .maybeSingle(),
    ])

    if (quizError) {
      console.error('Final leaderboard fetch error', quizError)
      setFinalRows([])
      setLastFinalUpdatedAt(new Date())
      return
    }

    const slots = ((sessionRes.data?.team_slots || {}) as Record<string, string>) || {}
    const quizByTeam = new Map<string, number>()
    for (const row of quizData || []) {
      const r = row as { team_label: string; team_id: string | null; total_score: number }
      let tid = r.team_id ? String(r.team_id) : ''
      if (!tid && r.team_label && slots[r.team_label]) {
        tid = String(slots[r.team_label])
      }
      if (!tid) continue
      quizByTeam.set(tid, Number(r.total_score) || 0)
    }

    const allIds = [...new Set([...quizByTeam.keys()])]
    const nameById = await resolveTeamNamesMap(allIds)

    const combined = allIds
      .filter((teamId) => nameById.has(teamId))
      .map((teamId) => {
      const quizPts = quizByTeam.get(teamId) || 0
      return {
        teamId,
        teamName: nameById.get(teamId) || 'Team',
        pointsScored: quizPts,
      }
      })

    combined.sort((x, y) => {
      if (y.pointsScored !== x.pointsScored) return y.pointsScored - x.pointsScored
      return x.teamName.localeCompare(y.teamName)
    })

    const ranked: FinalScoreRow[] = combined.map((row, i) => ({
      ...row,
      rank: i + 1,
    }))

    setFinalRows(ranked)
    setLastFinalUpdatedAt(new Date())
  }, [selectedExamId, selectedLiveSessionId, supabase, resolveTeamNamesMap])

  useEffect(() => {
    if (!selectedExamId) return
    const id = window.setTimeout(() => {
      void fetchExamLeaderboard()
    }, 0)
    return () => window.clearTimeout(id)
  }, [selectedExamId, fetchExamLeaderboard])

  useEffect(() => {
    if (!selectedLiveSessionId) return
    const id = window.setTimeout(() => {
      void fetchLiveLeaderboard()
    }, 0)
    return () => window.clearTimeout(id)
  }, [selectedLiveSessionId, fetchLiveLeaderboard])

  useEffect(() => {
    if (!selectedLiveSessionId) return
    const id = window.setTimeout(() => {
      void fetchLiveTeamNames()
    }, 0)
    return () => window.clearTimeout(id)
  }, [selectedLiveSessionId, fetchLiveTeamNames])

  useEffect(() => {
    if (activeTab !== 'final') return
    const id = window.setTimeout(() => {
      void fetchFinalLeaderboard()
    }, 0)
    return () => window.clearTimeout(id)
  }, [activeTab, fetchFinalLeaderboard])

  const { status: examRealtimeStatus, usePollFallback: examPollFallback } =
    usePostgresLeaderboardRealtime({
      supabase,
      enabled: activeTab === 'exam' && Boolean(selectedExamId),
      channelName: `${toastPrefix}-team-scores-${selectedExamId ?? 'none'}`,
      table: 'team_scores',
      filter: selectedExamId ? `exam_id=eq.${selectedExamId}` : undefined,
      onDataStale: fetchExamLeaderboard,
    })

  const { status: liveRealtimeStatus, usePollFallback: livePollFallback } =
    usePostgresLeaderboardRealtime({
      supabase,
      enabled: activeTab === 'live' && Boolean(selectedLiveSessionId),
      channelName: `${toastPrefix}-quiz-session-scores-${selectedLiveSessionId ?? 'none'}`,
      table: 'quiz_session_scores',
      filter: selectedLiveSessionId ? `session_id=eq.${selectedLiveSessionId}` : undefined,
      onDataStale: fetchLiveLeaderboard,
    })

  const { status: finalExamRt, usePollFallback: finalExamPoll } = usePostgresLeaderboardRealtime({
    supabase,
    enabled: activeTab === 'final' && Boolean(selectedExamId) && Boolean(selectedLiveSessionId),
    channelName: `${toastPrefix}-final-team-scores-${selectedExamId ?? 'none'}`,
    table: 'team_scores',
    filter: selectedExamId ? `exam_id=eq.${selectedExamId}` : undefined,
    onDataStale: fetchFinalLeaderboard,
  })

  const { status: finalLiveRt, usePollFallback: finalLivePoll } = usePostgresLeaderboardRealtime({
    supabase,
    enabled: activeTab === 'final' && Boolean(selectedExamId) && Boolean(selectedLiveSessionId),
    channelName: `${toastPrefix}-final-quiz-scores-${selectedLiveSessionId ?? 'none'}`,
    table: 'quiz_session_scores',
    filter: selectedLiveSessionId ? `session_id=eq.${selectedLiveSessionId}` : undefined,
    onDataStale: fetchFinalLeaderboard,
  })

  const finalMergedMeta = useMemo(
    () => mergeFinalRealtimeStatus(finalExamRt, finalLiveRt, finalExamPoll, finalLivePoll),
    [finalExamRt, finalLiveRt, finalExamPoll, finalLivePoll],
  )

  const prevExamPollFallback = useRef(false)
  useEffect(() => {
    if (activeTab !== 'exam') {
      prevExamPollFallback.current = examPollFallback
      return
    }
    if (examPollFallback && !prevExamPollFallback.current) {
      toast.warning('Exam leaderboard: Supabase Realtime is unavailable. Scores will refresh every 5 seconds.', {
        id: `${toastPrefix}-exam-poll`,
        duration: 10_000,
      })
    } else if (!examPollFallback && prevExamPollFallback.current) {
      toast.success('Exam leaderboard: live updates restored.', {
        id: `${toastPrefix}-exam-ok`,
        duration: 4000,
      })
      toast.dismiss(`${toastPrefix}-exam-poll`)
    }
    prevExamPollFallback.current = examPollFallback
  }, [activeTab, examPollFallback, toastPrefix])

  const prevLivePollFallback = useRef(false)
  useEffect(() => {
    if (activeTab !== 'live') {
      prevLivePollFallback.current = livePollFallback
      return
    }
    if (livePollFallback && !prevLivePollFallback.current) {
      toast.warning(
        'Live session leaderboard: Supabase Realtime is unavailable. Scores will refresh every 5 seconds.',
        { id: `${toastPrefix}-live-poll`, duration: 10_000 },
      )
    } else if (!livePollFallback && prevLivePollFallback.current) {
      toast.success('Live session leaderboard: live updates restored.', {
        id: `${toastPrefix}-live-ok`,
        duration: 4000,
      })
      toast.dismiss(`${toastPrefix}-live-poll`)
    }
    prevLivePollFallback.current = livePollFallback
  }, [activeTab, livePollFallback, toastPrefix])

  const prevFinalPollFallback = useRef(false)
  useEffect(() => {
    if (activeTab !== 'final') {
      prevFinalPollFallback.current = finalMergedMeta.usePollFallback
      return
    }
    if (finalMergedMeta.usePollFallback && !prevFinalPollFallback.current) {
      toast.warning(
        'Final score: Supabase Realtime is unavailable for one or both sources. Scores will refresh every 5 seconds.',
        { id: `${toastPrefix}-final-poll`, duration: 10_000 },
      )
    } else if (!finalMergedMeta.usePollFallback && prevFinalPollFallback.current) {
      toast.success('Final score: live updates restored.', {
        id: `${toastPrefix}-final-ok`,
        duration: 4000,
      })
      toast.dismiss(`${toastPrefix}-final-poll`)
    }
    prevFinalPollFallback.current = finalMergedMeta.usePollFallback
  }, [activeTab, finalMergedMeta.usePollFallback, toastPrefix])

  const showExports = variant === 'admin'

  const examExportData = teamScores.map((ts, index) => ({
    Rank: ts.rank || index + 1,
    'Team Name': ts.team_name || 'A/B/C',
    'Participant 1 Score': ts.participant1_score,
    'Participant 2 Score': ts.participant2_score,
    'Total Score': ts.total_team_score,
  }))

  const liveExportData = liveScores.map((row, index) => ({
    Rank: index + 1,
    Team: liveTeamNames[row.team_label] || row.team_label,
    'Total Score': row.total_score,
    'Questions Correct': row.questions_correct,
  }))

  const finalExportData = finalRows.map((row) => ({
    Rank: row.rank,
    'Team Name': row.teamName,
    'Points Scored': row.pointsScored,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#C0392B]" />
      </div>
    )
  }

  const renderSelectors = () => {
    if (activeTab === 'final') {
      return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="w-full sm:w-72">
            <select
              value={selectedExamId || ''}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
            >
              <option value="">Select an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-72">
            <select
              value={selectedLiveSessionId || ''}
              onChange={(e) => setSelectedLiveSessionId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#C0392B]"
            >
              <option value="">Select a live session</option>
              {liveSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )
    }

    return (
      <div className="w-72">
        <select
          value={activeTab === 'exam' ? selectedExamId || '' : selectedLiveSessionId || ''}
          onChange={(e) =>
            activeTab === 'exam' ? setSelectedExamId(e.target.value) : setSelectedLiveSessionId(e.target.value)
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
    )
  }

  const emptySelectMessage =
    activeTab === 'exam'
      ? 'an exam'
      : activeTab === 'live'
        ? 'a live session'
        : 'an exam and a live session'

  const hasFinalSelection = Boolean(selectedExamId && selectedLiveSessionId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {effectiveShowHeading ? (
          <h1 className="text-3xl font-bold text-gray-900">{effectiveHeading}</h1>
        ) : (
          <div />
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {showExports && activeTab === 'exam' && selectedExamId && teamScores.length > 0 && (
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
          {showExports && activeTab === 'live' && selectedLiveSessionId && liveScores.length > 0 && (
            <ExportButton
              data={liveExportData}
              filename={`live-leaderboard-${selectedLiveSessionId}`}
              exportType="both"
              pdfTitle={`Live Leaderboard - ${liveSessions.find((s) => s.id === selectedLiveSessionId)?.title || 'Session'}`}
              columns={[
                { header: 'Rank', dataKey: 'Rank' },
                { header: 'Team', dataKey: 'Team' },
                { header: 'Total Score', dataKey: 'Total Score' },
                { header: 'Questions Correct', dataKey: 'Questions Correct' },
              ]}
            />
          )}
          {showExports && activeTab === 'final' && hasFinalSelection && finalRows.length > 0 && (
            <ExportButton
              data={finalExportData}
              filename={`final-leaderboard-${selectedExamId}-${selectedLiveSessionId}`}
              exportType="both"
              pdfTitle="Final score leaderboard"
              columns={[
                { header: 'Rank', dataKey: 'Rank' },
                { header: 'Team Name', dataKey: 'Team Name' },
                { header: 'Points Scored', dataKey: 'Points Scored' },
              ]}
            />
          )}
          {renderSelectors()}
        </div>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab('exam')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'exam' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Exam Leaderboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'live' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Live Sessions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('final')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'final' ? 'bg-[#C0392B] text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Final Score
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
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No scores yet</h3>
          <p className="text-gray-500">Scores will appear here once participants submit their exams</p>
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
                        {teamScore.rank === 1 && <span className="text-2xl">🥇</span>}
                        {teamScore.rank === 2 && <span className="text-2xl">🥈</span>}
                        {teamScore.rank === 3 && <span className="text-2xl">🥉</span>}
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
                      {teamScore.team_name || 'A/B/C'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {teamScore.participant1_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {teamScore.participant2_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-lg font-bold text-[#C0392B]">{teamScore.total_team_score}</span>
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700">{index + 1}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {liveTeamNames[row.team_label] || row.team_label}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-lg font-bold text-[#C0392B]">
                      {row.total_score}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{row.questions_correct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'final' && hasFinalSelection && finalRows.length === 0 ? (
        <div className="rounded-2xl border border-white/20 bg-white/70 p-12 text-center shadow-lg backdrop-blur-xl">
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No combined scores yet</h3>
          <p className="text-gray-500">Final totals will appear when exam and live scores exist for the same teams.</p>
        </div>
      ) : activeTab === 'final' && hasFinalSelection ? (
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl">
          <div className="flex justify-end border-b border-gray-100 px-4 py-3">
            <LiveLeaderboardMeta
              lastUpdatedAt={lastFinalUpdatedAt}
              status={finalMergedMeta.status}
              usePollFallback={finalMergedMeta.usePollFallback}
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
                    Points Scored
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {finalRows.map((row) => (
                  <tr key={row.teamId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-700">{row.rank}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{row.teamName}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-lg font-bold text-[#C0392B]">{row.pointsScored}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/20 bg-white/70 p-12 text-center shadow-lg backdrop-blur-xl">
          <p className="text-gray-600">
            Please select {emptySelectMessage} to view the leaderboard
          </p>
        </div>
      )}
    </div>
  )
}
