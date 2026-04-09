'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { type Question } from '@/components/admin/QuestionCard'
import { QuestionsTable } from '@/components/admin/QuestionsTable'
import { QuestionSearch } from '@/components/admin/QuestionSearch'
import { QuestionFilters } from '@/components/admin/QuestionFilters'
import { QuestionStats } from '@/components/admin/QuestionStats'
import { BulkQuestionActions } from '@/components/admin/BulkQuestionActions'
import { QuestionPreviewModal } from '@/components/admin/QuestionPreviewModal'
import { ExportButton } from '@/components/admin/ExportButton'
import { QuestionFormModal } from '@/components/admin/QuestionFormModal'
const QuestionBankCharts = dynamic(
  () => import('@/components/admin/QuestionBankCharts').then((m) => m.QuestionBankCharts),
  { ssr: false }
)
import { RecentImportsPanel, type ImportBatchRow } from '@/components/admin/RecentImportsPanel'
import { normalizeQuestionTextForDedupe } from '@/lib/questions/import-schema'
import {
  fetchQuestionBankPage,
  fetchQuestionBankStats,
  fetchBankDedupeMap,
} from '@/lib/questions/bank-queries'

interface Exam {
  id: string
  title: string
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [totalFilteredCount, setTotalFilteredCount] = useState(0)
  const [bankTextToId, setBankTextToId] = useState(() => new Map<string, string>())
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [bypassFilters, setBypassFilters] = useState(false)
  const [importBatches, setImportBatches] = useState<ImportBatchRow[]>([])
  const [sortBy, setSortBy] = useState<'created_at' | 'points' | 'difficulty'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const pageSize = 25

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [minPoints, setMinPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(100)

  // Statistics
  const [stats, setStats] = useState({
    totalQuestions: 0,
    questionsByExam: [] as { examTitle: string; count: number }[],
    questionsByDifficulty: [] as { difficulty: string; count: number }[],
    questionsByCategory: [] as { category: string; count: number }[],
  })

  const mapStatsRowsToQuestions = (rows: any[]): Question[] =>
    (rows || []).map((q) => ({
      id: q.id,
      exam_id: q.exam_id,
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A' as const,
      points: 1,
      explanation: null,
      order_index: null,
      category: q.category,
      difficulty_level: q.difficulty_level,
      tags: null,
      exam: q.exam ? { id: q.exam_id || '', title: q.exam.title } : null,
    }))

  const calculateStats = useCallback((questionsList: Question[]) => {
    const byExam: Record<string, number> = {}
    const byDifficulty: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    questionsList.forEach((q) => {
      // By exam
      const examTitle = q.exam?.title || 'Unassigned'
      byExam[examTitle] = (byExam[examTitle] || 0) + 1

      // By difficulty
      const difficulty = q.difficulty_level || 'medium'
      byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1

      // By category
      if (q.category) {
        byCategory[q.category] = (byCategory[q.category] || 0) + 1
      }
    })

    setStats({
      totalQuestions: questionsList.length,
      questionsByExam: Object.entries(byExam).map(([examTitle, count]) => ({ examTitle, count })),
      questionsByDifficulty: Object.entries(byDifficulty).map(([difficulty, count]) => ({
        difficulty,
        count,
      })),
      questionsByCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    })
  }, [])

  const refreshStats = useCallback(async () => {
    const supabase = createClient()
    const { rows, error } = await fetchQuestionBankStats(supabase)
    if (error) return
    calculateStats(mapStatsRowsToQuestions(rows))
  }, [calculateStats])

  const loadInitialMeta = useCallback(async () => {
    const supabase = createClient()
    try {
      const [examsRes, statsRes] = await Promise.all([
        supabase.from('exams').select('id, title').order('title'),
        fetchQuestionBankStats(supabase),
      ])
      if (!examsRes.error && examsRes.data) setExams(examsRes.data)
      else setExams([])
      if (!statsRes.error && statsRes.rows) {
        calculateStats(mapStatsRowsToQuestions(statsRes.rows))
      }
      const { data: batchData, error: batchError } = await supabase
        .from('import_batches')
        .select('id, created_at, filename, source, row_count, inserted_count, skipped_count, status')
        .order('created_at', { ascending: false })
        .limit(8)
      if (!batchError && batchData) setImportBatches(batchData as ImportBatchRow[])
      else setImportBatches([])
    } catch (e) {
      console.error(e)
    }
  }, [calculateStats])

  const loadQuestionsPage = useCallback(async () => {
    const supabase = createClient()
    setError(null)
    setLoading(true)
    try {
      const filterState = {
        bypassFilters,
        searchTerm,
        selectedExam,
        selectedDifficulty,
        selectedCategory,
        minPoints,
        maxPoints,
      }
      const { data, error: pageError, count } = await fetchQuestionBankPage(
        supabase,
        page,
        pageSize,
        sortBy,
        sortDir,
        filterState
      )
      if (pageError) throw pageError
      const normalized = (data || []).map((q: any) => ({
        ...q,
        exam: q.exam ?? null,
      })) as Question[]
      setQuestions(normalized)
      setTotalFilteredCount(count ?? 0)
    } catch (err: any) {
      setError(err?.message || 'Error fetching questions')
    } finally {
      setLoading(false)
      setHasLoadedOnce(true)
    }
  }, [
    page,
    pageSize,
    sortBy,
    sortDir,
    bypassFilters,
    searchTerm,
    selectedExam,
    selectedDifficulty,
    selectedCategory,
    minPoints,
    maxPoints,
  ])

  useEffect(() => {
    void loadInitialMeta()
  }, [loadInitialMeta])

  useEffect(() => {
    void loadQuestionsPage()
  }, [loadQuestionsPage])

  useEffect(() => {
    if (!showAddForm) return
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const rows = await fetchBankDedupeMap(supabase)
      if (cancelled) return
      const m = new Map<string, string>()
      for (const row of rows) {
        if (row.exam_id != null) continue
        const n = normalizeQuestionTextForDedupe(row.question_text || '')
        if (n.length > 5) m.set(n, row.id)
      }
      setBankTextToId(m)
    })()
    return () => {
      cancelled = true
    }
  }, [showAddForm])

  const handleDelete = async (questionId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().eq('id', questionId)

    if (error) {
      toast.error('Error deleting question: ' + error.message)
    } else {
      toast.success('Question deleted')
      setSelectedQuestions((prev) => {
        const next = new Set(prev)
        next.delete(questionId)
        return next
      })
      void loadQuestionsPage()
      void refreshStats()
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedQuestions.size} questions?`)) return

    const supabase = createClient()
    const questionIds = Array.from(selectedQuestions)

    const { error } = await supabase.from('questions').delete().in('id', questionIds)

    if (error) {
      alert('Error deleting questions: ' + error.message)
    } else {
      setSelectedQuestions(new Set())
      void loadQuestionsPage()
      void refreshStats()
    }
  }

  const handleBulkExport = () => {
    const selectedQuestionsList = questions.filter((q) => selectedQuestions.has(q.id))
    const exportData = selectedQuestionsList.map((q) => ({
      'Question Text': q.question_text,
      'Option A': q.option_a,
      'Option B': q.option_b,
      'Option C': q.option_c,
      'Option D': q.option_d,
      'Correct Answer': q.correct_answer,
      Points: q.points,
      Difficulty: q.difficulty_level || 'medium',
      Category: q.category || '',
      Tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      'Exam Title': q.exam?.title || 'Unassigned',
      Explanation: q.explanation || '',
    }))

    // Trigger export using ExportButton logic
    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `questions-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAssignToExam = () => {
    // This will be implemented with a modal
    alert('Assign to Exam feature coming soon!')
  }

  const handleSelectQuestion = (questionId: string, selected: boolean) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(questionId)
      } else {
        next.delete(questionId)
      }
      return next
    })
  }

  const handleSelectAll = useCallback(() => {
    setSelectedQuestions((prev) => {
      const pageIds = questions.map((q) => q.id)
      const allPageSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }, [questions])

  const categories = useMemo(
    () =>
      stats.questionsByCategory
        .map((c) => c.category)
        .filter((c): c is string => Boolean(c)),
    [stats.questionsByCategory]
  )

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedQuestions = questions

  const exportRows = useMemo(
    () =>
      pagedQuestions.map((q) => ({
        'Question Text': q.question_text,
        'Option A': q.option_a,
        'Option B': q.option_b,
        'Option C': q.option_c,
        'Option D': q.option_d,
        'Correct Answer': q.correct_answer,
        Points: q.points,
        Difficulty: q.difficulty_level || 'medium',
        Category: q.category || '',
        Tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
        'Exam Title': q.exam?.title || 'Unassigned',
        Explanation: q.explanation || '',
      })),
    [pagedQuestions]
  )

  const allVisibleSelected =
    questions.length > 0 && questions.every((q) => selectedQuestions.has(q.id))

  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedExam, selectedDifficulty, selectedCategory, minPoints, maxPoints, bypassFilters])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">Manage all questions across all exams</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingQuestion(null)
              setShowAddForm(true)
            }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">Error Loading Questions</h3>
              <p className="text-sm text-red-700 mb-2">{error}</p>

              {/* RLS Diagnostic Section for 500 Errors */}
              {error && (error.includes('500') || error.includes('HTTP 500')) && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">🔧 RLS Policy Diagnostic</h4>
                  <p className="text-xs text-yellow-700 mb-3">
                    The 500 error indicates RLS policies are causing server-side errors. Run these SQL queries in Supabase to diagnose:
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold text-yellow-800 mb-2">Click to view diagnostic SQL queries</summary>
                    <div className="mt-2 p-3 bg-yellow-100 rounded font-mono text-xs overflow-x-auto">
                      <div className="mb-3">
                        <strong className="text-yellow-900">1. Check if is_admin_user function exists:</strong>
                        <pre className="mt-1 text-yellow-800 whitespace-pre-wrap">
{`SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin_user';`}
                        </pre>
                      </div>
                      <div className="mb-3">
                        <strong className="text-yellow-900">2. Check RLS policies on questions table:</strong>
                        <pre className="mt-1 text-yellow-800 whitespace-pre-wrap">
{`SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'questions';`}
                        </pre>
                      </div>
                      <div className="mb-3">
                        <strong className="text-yellow-900">3. Test the function with your user ID:</strong>
                        <pre className="mt-1 text-yellow-800 whitespace-pre-wrap">
{`-- Replace with your actual user ID (e.g. from Supabase Auth)
SELECT is_admin_user('your-user-id-here');`}
                        </pre>
                      </div>
                      <div className="mb-3">
                        <strong className="text-yellow-900">4. Quick fix - Run this SQL:</strong>
                        <pre className="mt-1 text-yellow-800 whitespace-pre-wrap">
{`-- Run: docs/sql/fix-questions-rls-policy-simple.sql
-- This uses a simpler approach without functions`}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              <div className="mt-3 text-sm text-red-600">
                <p className="font-medium mb-1">Possible solutions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Verify you are logged in as an admin user</li>
                  <li>Check that your user has role=&apos;admin&apos; in the user_profiles table</li>
                  <li>Run the migration script: docs/sql/fix-questions-rls-policy.sql</li>
                  <li>Ensure the questions table exists and has data</li>
                  <li>Check browser console (F12) for detailed error messages</li>
                  <li>If questions exist in the database but none load, review RLS policies on the questions table</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 ml-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <QuestionStats
        totalQuestions={stats.totalQuestions}
        questionsByExam={stats.questionsByExam}
        questionsByDifficulty={stats.questionsByDifficulty}
        questionsByCategory={stats.questionsByCategory}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 relative">
        {loading && hasLoadedOnce && (
          <div className="absolute inset-0 z-10 bg-white/40 flex items-start justify-center pt-8 pointer-events-none">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C0392B]" />
          </div>
        )}
        <div className="xl:col-span-2">
          <QuestionBankCharts
            questionsByDifficulty={stats.questionsByDifficulty}
            questionsByCategory={stats.questionsByCategory}
          />
        </div>
        <div className="xl:col-span-1">
          <RecentImportsPanel batches={importBatches} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <QuestionSearch value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setBypassFilters(!bypassFilters)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                bypassFilters
                  ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
              title="Bypass all filters to show all questions"
            >
              {bypassFilters ? '🔓 Bypass Active' : '🔒 Bypass Filters'}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
              />
              <span className="text-sm text-gray-600">Select page</span>
            </div>
          </div>
        </div>

        <QuestionFilters
          exams={exams}
          selectedExam={selectedExam}
          onExamChange={setSelectedExam}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          minPoints={minPoints}
          maxPoints={maxPoints}
          onPointsChange={(min, max) => {
            setMinPoints(min)
            setMaxPoints(max)
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
        />
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-gray-600 whitespace-nowrap">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'points' | 'difficulty')}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 bg-white text-sm min-w-[8rem]"
            >
              <option value="created_at">Date added</option>
              <option value="points">Marks / points</option>
              <option value="difficulty">Difficulty</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 bg-white text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          {exportRows.length > 0 && (
            <ExportButton
              data={exportRows}
              filename={`questions-page-${safePage}-${new Date().toISOString().split('T')[0]}`}
              exportType="both"
              pdfTitle="Question bank export (current page)"
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkQuestionActions
        selectedCount={selectedQuestions.size}
        onDelete={handleBulkDelete}
        onAssignToExam={handleAssignToExam}
        onExport={handleBulkExport}
        onClearSelection={() => setSelectedQuestions(new Set())}
      />

      <QuestionFormModal
        open={showAddForm}
        question={editingQuestion}
        bankTextToId={bankTextToId}
        onClose={() => {
          setShowAddForm(false)
          setEditingQuestion(null)
        }}
        onSuccess={() => {
          setShowAddForm(false)
          setEditingQuestion(null)
          void loadQuestionsPage()
          void refreshStats()
        }}
      />

      {totalFilteredCount === 0 && !loading ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedExam || selectedDifficulty || selectedCategory
              ? 'Try adjusting your filters'
              : 'Add your first question to get started'}
          </p>
          {!searchTerm && !selectedExam && !selectedDifficulty && !selectedCategory && (
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              Add Question
            </Button>
          )}
        </div>
      ) : (
        <>
          <QuestionsTable
            questions={pagedQuestions}
            selectedQuestions={selectedQuestions}
            onSelectQuestion={handleSelectQuestion}
            onSelectAll={handleSelectAll}
            onEdit={(q) => {
              setEditingQuestion(q)
              setShowAddForm(true)
            }}
            onDelete={handleDelete}
            onPreview={setPreviewQuestion}
          />
          {(totalPages > 1 || totalFilteredCount > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 text-sm text-gray-600">
              <span>
                Page {safePage} of {totalPages} · {totalFilteredCount} matching
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
      )}
    </div>
  )
}
