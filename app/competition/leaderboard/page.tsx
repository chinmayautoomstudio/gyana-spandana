'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStableSearchParams } from '@/lib/navigation/unwrapNavigation'
import { createClient } from '@/lib/supabase/client'
import {
  CompetitionLeaderboardPanel,
  type LeaderboardExamOption,
} from '@/components/leaderboard/CompetitionLeaderboardPanel'

function CompetitionLeaderboardInner() {
  const router = useRouter()
  const searchParams = useStableSearchParams()
  const examFromQuery = searchParams.get('exam')
  const supabase = useMemo(() => createClient(), [])
  const [exams, setExams] = useState<LeaderboardExamOption[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [manualSelectedExamId, setManualSelectedExamId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setExamsLoading(true)
      const { data, error } = await supabase
        .from('exams')
        .select('id, title')
        .eq('public_leaderboard_visible', true)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })
      if (!error && data) setExams(data)
      else setExams([])
      setExamsLoading(false)
    })()
  }, [supabase])

  const selectedExamId = useMemo(() => {
    if (examsLoading || !exams.length) return null
    if (examFromQuery && exams.some((e) => e.id === examFromQuery)) return examFromQuery
    if (manualSelectedExamId && exams.some((e) => e.id === manualSelectedExamId)) return manualSelectedExamId
    return exams[0].id
  }, [exams, examsLoading, examFromQuery, manualSelectedExamId])

  const onSelectExamId = useCallback(
    (id: string) => {
      setManualSelectedExamId(id)
      router.replace(`/competition/leaderboard?exam=${encodeURIComponent(id)}`, {
        scroll: false,
      })
    },
    [router],
  )

  const controlledExams = useMemo(
    () => ({
      exams,
      selectedExamId,
      onSelectExamId,
      loading: examsLoading,
    }),
    [exams, selectedExamId, onSelectExamId, examsLoading],
  )

  return (
    <div className="p-4 lg:p-8" style={{ marginTop: '80px' }}>
      <CompetitionLeaderboardPanel
        variant="public"
        controlledExams={controlledExams}
        showHeading
        headingText="Leaderboard"
      />
    </div>
  )
}

export default function CompetitionLeaderboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Loading…</div>}>
      <CompetitionLeaderboardInner />
    </Suspense>
  )
}
