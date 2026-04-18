'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useResolvedParams } from '@/lib/navigation/unwrapNavigation'
import { createClient } from '@/lib/supabase/client'
import {
  CompetitionLeaderboardPanel,
  type LeaderboardExamOption,
} from '@/components/leaderboard/CompetitionLeaderboardPanel'

function CompetitionLeaderboardExamInner() {
  const resolvedParams = useResolvedParams()
  const router = useRouter()
  const raw = resolvedParams?.examId
  const examIdParam = Array.isArray(raw) ? raw[0] : raw
  const supabase = useMemo(() => createClient(), [])
  const [exams, setExams] = useState<LeaderboardExamOption[]>([])
  const [examsLoading, setExamsLoading] = useState(true)

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
    if (!examIdParam) return null
    if (examsLoading) return examIdParam
    return exams.some((e) => e.id === examIdParam) ? examIdParam : null
  }, [examIdParam, examsLoading, exams])

  useEffect(() => {
    if (examsLoading || !examIdParam || !exams.length) return
    if (!exams.some((e) => e.id === examIdParam)) {
      router.replace('/competition/leaderboard')
    }
  }, [exams, examsLoading, examIdParam, router])

  const onSelectExamId = useCallback(
    (id: string) => {
      router.push(`/competition/leaderboard/${id}`)
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

export default function CompetitionLeaderboardExamPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-600">Loading…</div>}>
      <CompetitionLeaderboardExamInner />
    </Suspense>
  )
}
