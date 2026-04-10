'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PublicExamLeaderboard,
  type PublishedExamOption,
} from '@/components/competition/PublicExamLeaderboard'

function CompetitionLeaderboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examFromQuery = searchParams.get('exam')
  const supabase = useMemo(() => createClient(), [])
  const [exams, setExams] = useState<PublishedExamOption[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)

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

  useEffect(() => {
    if (examsLoading) return
    if (!exams.length) {
      setSelectedExamId(null)
      return
    }
    if (examFromQuery && exams.some((e) => e.id === examFromQuery)) {
      setSelectedExamId(examFromQuery)
      return
    }
    setSelectedExamId((prev) =>
      prev && exams.some((e) => e.id === prev) ? prev : exams[0].id,
    )
  }, [exams, examsLoading, examFromQuery])

  const onSelectExamId = useCallback(
    (id: string) => {
      setSelectedExamId(id)
      router.replace(`/competition/leaderboard?exam=${encodeURIComponent(id)}`, {
        scroll: false,
      })
    },
    [router],
  )

  return (
    <div className="p-4 lg:p-8" style={{ marginTop: '80px' }}>
      <PublicExamLeaderboard
        selectedExamId={selectedExamId}
        exams={exams}
        examsLoading={examsLoading}
        onSelectExamId={onSelectExamId}
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
