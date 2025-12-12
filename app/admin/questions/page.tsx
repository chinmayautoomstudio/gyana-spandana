'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { type Question } from '@/components/admin/QuestionCard'
import { QuestionsTable } from '@/components/admin/QuestionsTable'
import { QuestionForm } from '@/components/admin/QuestionForm'
import { QuestionSearch } from '@/components/admin/QuestionSearch'
import { QuestionFilters } from '@/components/admin/QuestionFilters'
import { QuestionStats } from '@/components/admin/QuestionStats'
import { BulkQuestionActions } from '@/components/admin/BulkQuestionActions'
import { QuestionPreviewModal } from '@/components/admin/QuestionPreviewModal'
import { ExportButton } from '@/components/admin/ExportButton'

interface Exam {
  id: string
  title: string
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    // Fetch all exams
    const { data: examsData } = await supabase.from('exams').select('id, title').order('title')

    setExams(examsData || [])

    // Fetch all questions with exam info
    const { data: questionsData, error } = await supabase
      .from('questions')
      .select(`
        *,
        exam:exams(id, title)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      const questionsWithExam = (questionsData || []).map((q: any) => ({
        ...q,
        exam: q.exam || null,
      }))
      setQuestions(questionsWithExam)
      setFilteredQuestions(questionsWithExam)
      calculateStats(questionsWithExam)
    }

    setLoading(false)
  }

  const calculateStats = (questionsList: Question[]) => {
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
  }

  useEffect(() => {
    let filtered = [...questions]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.question_text.toLowerCase().includes(term) ||
          q.option_a.toLowerCase().includes(term) ||
          q.option_b.toLowerCase().includes(term) ||
          q.option_c.toLowerCase().includes(term) ||
          q.option_d.toLowerCase().includes(term) ||
          q.exam?.title.toLowerCase().includes(term) ||
          q.category?.toLowerCase().includes(term) ||
          (Array.isArray(q.tags) && q.tags.some((tag) => tag.toLowerCase().includes(term)))
      )
    }

    // Exam filter
    if (selectedExam) {
      filtered = filtered.filter((q) => q.exam_id === selectedExam)
    }

    // Difficulty filter
    if (selectedDifficulty) {
      filtered = filtered.filter((q) => q.difficulty_level === selectedDifficulty)
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((q) => q.category === selectedCategory)
    }

    // Points filter
    filtered = filtered.filter((q) => q.points >= minPoints && q.points <= maxPoints)

    setFilteredQuestions(filtered)
    calculateStats(filtered)
  }, [questions, searchTerm, selectedExam, selectedDifficulty, selectedCategory, minPoints, maxPoints])

  const handleDelete = async (questionId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().eq('id', questionId)

    if (error) {
      alert('Error deleting question: ' + error.message)
    } else {
      setQuestions(questions.filter((q) => q.id !== questionId))
      setSelectedQuestions((prev) => {
        const next = new Set(prev)
        next.delete(questionId)
        return next
      })
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
      setQuestions(questions.filter((q) => !selectedQuestions.has(q.id)))
      setSelectedQuestions(new Set())
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

  const handleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map((q) => q.id)))
    }
  }

  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean) as string[]))

  if (loading) {
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

      {/* Statistics */}
      <QuestionStats
        totalQuestions={stats.totalQuestions}
        questionsByExam={stats.questionsByExam}
        questionsByDifficulty={stats.questionsByDifficulty}
        questionsByCategory={stats.questionsByCategory}
      />

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <QuestionSearch value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
            />
            <span className="text-sm text-gray-600">Select All</span>
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
      </div>

      {/* Bulk Actions */}
      <BulkQuestionActions
        selectedCount={selectedQuestions.size}
        onDelete={handleBulkDelete}
        onAssignToExam={handleAssignToExam}
        onExport={handleBulkExport}
        onClearSelection={() => setSelectedQuestions(new Set())}
      />

      {/* Questions List */}
      {showAddForm && (
        <QuestionForm
          examId={editingQuestion?.exam_id}
          question={editingQuestion}
          onClose={() => {
            setShowAddForm(false)
            setEditingQuestion(null)
          }}
          onSuccess={() => {
            setShowAddForm(false)
            setEditingQuestion(null)
            fetchData()
          }}
          allowNoExam={true}
        />
      )}

      {filteredQuestions.length === 0 ? (
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
        <QuestionsTable
          questions={filteredQuestions}
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
      )}

      {/* Preview Modal */}
      {previewQuestion && (
        <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
      )}
    </div>
  )
}

// Import Papa for CSV export
import Papa from 'papaparse'

