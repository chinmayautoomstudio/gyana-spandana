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
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{
    userRole: string | null
    userId: string | null
    questionsCount: number
    directQueryCount: number
    rawQueryCount: number
    hasError: boolean
    rawQuestionsSample: any[] | null
  } | null>(null)
  const [bypassFilters, setBypassFilters] = useState(false)

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
    setError(null)

    try {
      // Step 1: Verify user authentication and role
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      console.log('=== DEBUG: User Authentication ===')
      console.log('User:', user ? { id: user.id, email: user.email } : 'Not authenticated')
      console.log('User Error:', userError)

      let userRole: string | null = null
      let userId: string | null = user?.id || null

      if (user) {
        // Check user_profiles table first
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        console.log('=== DEBUG: User Profile ===')
        console.log('Profile:', profile)
        console.log('Profile Error:', profileError)
        
        // Check if profile query also returns 500
        const profileHttpStatus = (profileError as any)?.status || (profileError as any)?.statusCode || null
        if (profileHttpStatus === 500) {
          console.error('⚠️ CRITICAL: user_profiles query returning 500 - RLS policy blocking role check!')
          console.error('This confirms RLS policies are broken. The is_admin_user() function or RLS policy is failing.')
        }

        if (profile?.role) {
          userRole = profile.role
        } else if (user.user_metadata?.role) {
          userRole = user.user_metadata.role
          console.warn('Using user_metadata role as fallback (user_profiles query may have failed)')
        } else {
          userRole = 'participant'
          console.warn('No role found, defaulting to participant')
        }

        console.log('Detected Role:', userRole)
      }

      // Step 2: Test direct query without joins (to verify questions exist)
      console.log('=== DEBUG: Direct Query Test (Count Only) ===')
      const { count: directCount, error: directError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })

      console.log('Direct Query Count:', directCount)
      console.log('Direct Query Error:', directError)

      // Step 2b: Test raw query WITHOUT join (to see if join is the issue)
      console.log('=== DEBUG: Raw Query Test (No Join) ===')
      const { data: rawQuestionsData, error: rawQuestionsError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10) // Get first 10 for testing

      console.log('Raw Questions (No Join):', {
        count: rawQuestionsData?.length || 0,
        data: rawQuestionsData?.slice(0, 2),
        error: rawQuestionsError,
      })

      // Step 3: Fetch all exams
      console.log('=== DEBUG: Fetching Exams ===')
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, title')
        .order('title')

      console.log('Exams Data:', examsData)
      console.log('Exams Error:', examsError)

      if (examsError) {
        const examErrorMessage = examsError.message || 'Unknown error'
        const examErrorCode = examsError.code || 'N/A'
        const examHttpStatus = (examsError as any)?.status || (examsError as any)?.statusCode || null
        const is500Error = examHttpStatus === 500 || examErrorCode === '500'
        
        console.error('Error fetching exams:', {
          message: examErrorMessage,
          code: examErrorCode,
          httpStatus: examHttpStatus,
          details: examsError.details,
          hint: examsError.hint,
          fullError: examsError,
        })
        
        if (is500Error) {
          console.warn('⚠️ Exams query also returning 500 - RLS policy issue confirmed')
        }
        
        // Don't set error for exams - it's not critical, just log it
        console.warn('Exams fetch failed, continuing without exam list')
        setExams([])
      } else {
        setExams(examsData || [])
      }

      // Step 4: Fetch all questions with exam info
      // Try with LEFT JOIN semantics (exam is optional)
      console.log('=== DEBUG: Fetching Questions with Join ===')
      let questionsData: any[] | null = null
      let questionsError: any = null

      // First, try the join query
      const joinResult = await supabase
        .from('questions')
        .select(`
          *,
          exam:exams(id, title)
        `)
        .order('created_at', { ascending: false })

      questionsData = joinResult.data
      questionsError = joinResult.error

      // If join query fails or returns empty but raw query worked, try alternative approach
      if (questionsError || (questionsData?.length === 0 && rawQuestionsData && rawQuestionsData.length > 0)) {
        console.warn('=== DEBUG: Join query failed or returned empty, trying alternative ===')
        console.warn('Join Error:', questionsError)
        console.warn('Join Result Count:', questionsData?.length || 0)
        console.warn('Raw Query Count:', rawQuestionsData?.length || 0)

        // Alternative: Fetch questions without join, then manually attach exam info
        const { data: questionsWithoutJoin, error: questionsWithoutJoinError } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })

        if (!questionsWithoutJoinError && questionsWithoutJoin) {
          console.log('=== DEBUG: Fetching exam info separately ===')
          // Get unique exam IDs
          const examIds = [...new Set(questionsWithoutJoin.map((q: any) => q.exam_id).filter(Boolean))]
          
          let examsMap: Record<string, any> = {}
          if (examIds.length > 0) {
            const { data: examsDataForJoin } = await supabase
              .from('exams')
              .select('id, title')
              .in('id', examIds)

            if (examsDataForJoin) {
              examsMap = examsDataForJoin.reduce((acc: any, exam: any) => {
                acc[exam.id] = exam
                return acc
              }, {})
            }
          }

          // Manually attach exam info
          questionsData = questionsWithoutJoin.map((q: any) => ({
            ...q,
            exam: q.exam_id ? examsMap[q.exam_id] || null : null,
          }))

          questionsError = null
          console.log('=== DEBUG: Alternative query successful ===')
          console.log(`Loaded ${questionsData.length} questions with manual exam join`)
        } else {
          questionsError = questionsWithoutJoinError
        }
      }

      console.log('Questions Query Response:', {
        dataLength: questionsData?.length || 0,
        data: questionsData?.slice(0, 2), // Log first 2 for inspection
        error: questionsError,
        errorCode: questionsError?.code,
        errorMessage: questionsError?.message,
        errorDetails: questionsError?.details,
        errorHint: questionsError?.hint,
      })

      // Update debug info
      setDebugInfo({
        userRole,
        userId,
        questionsCount: (questionsData || [])?.length || 0,
        directQueryCount: directCount || 0,
        rawQueryCount: rawQuestionsData?.length || 0,
        hasError: !!questionsError,
        rawQuestionsSample: rawQuestionsData?.slice(0, 3) || null,
      })

      if (questionsError) {
        // Properly serialize error for logging
        const errorMessage = questionsError.message || 'Unknown error'
        const errorCode = questionsError.code || 'N/A'
        const errorDetails = questionsError.details || null
        const errorHint = questionsError.hint || null
        const httpStatus = (questionsError as any)?.status || (questionsError as any)?.statusCode || null
        
        console.error('Error fetching questions:', {
          message: errorMessage,
          code: errorCode,
          httpStatus: httpStatus,
          details: errorDetails,
          hint: errorHint,
          fullError: questionsError,
        })
        
        // Check if it's a 500 error (server-side RLS policy issue)
        const is500Error = httpStatus === 500 || errorCode === '500' || errorMessage.includes('500') || 
                          errorMessage.toLowerCase().includes('internal server error')
        
        if (is500Error) {
          console.error('=== CRITICAL: 500 Server Error Detected ===')
          console.error('This indicates RLS policies are causing server-side errors.')
          console.error('The RLS policy function or query is likely failing on the server.')
          
          // Try fallback: simple query without join
          console.log('=== Attempting Fallback Query (No Join) ===')
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            console.log('✅ Fallback query succeeded! Loaded', fallbackData.length, 'questions')
            const questionsWithExam = fallbackData.map((q: any) => ({
              ...q,
              exam: null, // No exam info in fallback
            }))
            setQuestions(questionsWithExam)
            setFilteredQuestions(questionsWithExam)
            calculateStats(questionsWithExam)
            
            setError(
              `⚠️ Main query failed with 500 error, but fallback query succeeded. ` +
              `Loaded ${fallbackData.length} questions without exam information. ` +
              `The join query is failing - likely due to RLS policy issues. ` +
              `Please run: docs/fix-questions-rls-policy-v2.sql or docs/fix-questions-rls-policy-simple.sql`
            )
            return // Exit early since fallback worked
          } else {
            console.error('Fallback query also failed:', fallbackError)
          }
        }
        
        // Build error message for display
        let errorDisplayMessage = `Error fetching questions: ${errorMessage}`
        if (errorCode !== 'N/A') {
          errorDisplayMessage += ` (Code: ${errorCode})`
        }
        if (httpStatus) {
          errorDisplayMessage += ` [HTTP ${httpStatus}]`
        }
        if (errorHint) {
          errorDisplayMessage += `. Hint: ${errorHint}`
        }
        
        if (is500Error) {
          errorDisplayMessage += `. ⚠️ CRITICAL: Server returned 500 error. This indicates RLS policies have syntax errors or the is_admin_user() function doesn't exist. Please check the RLS policies in Supabase.`
        } else {
          errorDisplayMessage += `. This might be due to RLS policies. Please check if you have admin role in the user_profiles table.`
        }
        
        errorDisplayMessage += ` Direct query count: ${directCount || 0} questions exist in database.`
        
        setError(errorDisplayMessage)
      } else {
        const questionsWithExam = ((questionsData || []) as any[]).map((q: any) => ({
          ...q,
          exam: q.exam || null,
        }))
        
        console.log('=== DEBUG: Processed Questions ===')
        console.log('Total questions processed:', questionsWithExam.length)
        console.log('Sample question:', questionsWithExam[0])
        
        setQuestions(questionsWithExam)
        setFilteredQuestions(questionsWithExam)
        calculateStats(questionsWithExam)
        
        // Log success for debugging
        if (questionsWithExam.length === 0) {
          console.warn('⚠️ No questions found in database after query.')
          console.warn('Direct query count:', directCount)
          console.warn('This suggests RLS policies might be blocking access.')
          console.warn('Make sure:')
          console.warn('1. You have admin role in user_profiles table')
          console.warn('2. RLS policy fix has been applied (docs/fix-questions-rls-policy.sql)')
          console.warn('3. Questions exist in database (run sample questions SQL)')
        } else {
          console.log(`✅ Successfully loaded ${questionsWithExam.length} questions`)
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error occurred'
      const errorStack = err?.stack || 'No stack trace available'
      console.error('=== DEBUG: Unexpected Error ===')
      console.error('Error Message:', errorMessage)
      console.error('Error Object:', err)
      console.error('Stack Trace:', errorStack)
      setError(`Unexpected error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
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
    // If bypass is enabled, show all questions
    if (bypassFilters) {
      console.log('=== DEBUG: Bypass Mode Active - Showing All Questions ===')
      setFilteredQuestions(questions)
      calculateStats(questions)
      return
    }

    let filtered = [...questions]
    const initialCount = filtered.length

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.question_text?.toLowerCase().includes(term) ||
          q.option_a?.toLowerCase().includes(term) ||
          q.option_b?.toLowerCase().includes(term) ||
          q.option_c?.toLowerCase().includes(term) ||
          q.option_d?.toLowerCase().includes(term) ||
          q.exam?.title?.toLowerCase().includes(term) ||
          q.category?.toLowerCase().includes(term) ||
          (Array.isArray(q.tags) && q.tags.some((tag) => tag.toLowerCase().includes(term)))
      )
      console.log(`Search filter: ${initialCount} -> ${filtered.length} questions`)
    }

    // Exam filter
    if (selectedExam) {
      const beforeCount = filtered.length
      filtered = filtered.filter((q) => q.exam_id === selectedExam)
      console.log(`Exam filter (${selectedExam}): ${beforeCount} -> ${filtered.length} questions`)
    }

    // Difficulty filter
    if (selectedDifficulty) {
      const beforeCount = filtered.length
      filtered = filtered.filter((q) => q.difficulty_level === selectedDifficulty)
      console.log(`Difficulty filter (${selectedDifficulty}): ${beforeCount} -> ${filtered.length} questions`)
    }

    // Category filter
    if (selectedCategory) {
      const beforeCount = filtered.length
      filtered = filtered.filter((q) => q.category === selectedCategory)
      console.log(`Category filter (${selectedCategory}): ${beforeCount} -> ${filtered.length} questions`)
    }

    // Points filter
    const beforeCount = filtered.length
    filtered = filtered.filter((q) => q.points >= minPoints && q.points <= maxPoints)
    if (minPoints > 0 || maxPoints < 100) {
      console.log(`Points filter (${minPoints}-${maxPoints}): ${beforeCount} -> ${filtered.length} questions`)
    }

    console.log(`=== DEBUG: Filtering Complete ===`)
    console.log(`Initial: ${initialCount} questions`)
    console.log(`After filters: ${filtered.length} questions`)
    console.log(`Active filters:`, {
      searchTerm: searchTerm || 'none',
      selectedExam: selectedExam || 'none',
      selectedDifficulty: selectedDifficulty || 'none',
      selectedCategory: selectedCategory || 'none',
      pointsRange: `${minPoints}-${maxPoints}`,
    })

    if (initialCount > 0 && filtered.length === 0) {
      console.warn('⚠️ All questions were filtered out! Check filter settings.')
    }

    setFilteredQuestions(filtered)
    calculateStats(filtered)
  }, [questions, searchTerm, selectedExam, selectedDifficulty, selectedCategory, minPoints, maxPoints, bypassFilters])

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

      {/* Debug Info Panel (Development) */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Debug Information</h3>
              <div className="text-xs text-blue-700 space-y-1 font-mono">
                <div><strong>User ID:</strong> {debugInfo.userId || 'Not authenticated'}</div>
                <div><strong>User Role:</strong> {debugInfo.userRole || 'Unknown'}</div>
                <div><strong>Direct Query Count:</strong> {debugInfo.directQueryCount} questions in DB</div>
                <div><strong>Raw Query (No Join):</strong> {debugInfo.rawQueryCount} questions</div>
                <div><strong>Questions with Join:</strong> {debugInfo.questionsCount} questions</div>
                <div><strong>Filtered Questions:</strong> {filteredQuestions.length} questions</div>
                <div><strong>Has Error:</strong> {debugInfo.hasError ? 'Yes' : 'No'}</div>
                
                {debugInfo.directQueryCount > 0 && debugInfo.questionsCount === 0 && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                    ⚠️ Questions exist in DB but join query returned empty. The join might be failing or RLS is blocking.
                  </div>
                )}
                
                {debugInfo.rawQueryCount > 0 && debugInfo.questionsCount === 0 && (
                  <div className="mt-2 p-2 bg-orange-100 rounded text-orange-800">
                    ⚠️ Raw query works but join query fails. The exam join is likely the issue.
                  </div>
                )}
                
                {debugInfo.questionsCount > 0 && filteredQuestions.length === 0 && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-red-800">
                    ⚠️ Questions loaded but filters removed all. Check filter settings.
                  </div>
                )}

                {debugInfo.rawQuestionsSample && debugInfo.rawQuestionsSample.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-blue-800">Raw Questions Sample (First 3)</summary>
                    <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.rawQuestionsSample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              
              {debugInfo && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 font-mono">
                  <div><strong>Debug Details:</strong></div>
                  <div>Role: {debugInfo.userRole || 'Unknown'}</div>
                  <div>Direct DB Count: {debugInfo.directQueryCount}</div>
                  <div>Raw Query Count: {debugInfo.rawQueryCount}</div>
                  <div>Query Result: {debugInfo.questionsCount}</div>
                  {debugInfo.directQueryCount > 0 && debugInfo.questionsCount === 0 && (
                    <div className="mt-1 font-semibold">
                      ⚠️ RLS Policy Issue: Questions exist but are blocked by security policies
                    </div>
                  )}
                </div>
              )}
              
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
{`-- Replace with your actual user ID from debug info above
SELECT is_admin_user('${debugInfo?.userId || 'your-user-id-here'}');`}
                        </pre>
                      </div>
                      <div className="mb-3">
                        <strong className="text-yellow-900">4. Quick fix - Run this SQL:</strong>
                        <pre className="mt-1 text-yellow-800 whitespace-pre-wrap">
{`-- Run: docs/fix-questions-rls-policy-simple.sql
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
                  <li>Verify you are logged in as an admin user (check debug info above)</li>
                  <li>Check that your user has role='admin' in the user_profiles table</li>
                  <li>Run the migration script: docs/fix-questions-rls-policy.sql</li>
                  <li>Ensure the questions table exists and has data</li>
                  <li>Check browser console (F12) for detailed error messages</li>
                  <li>If direct query count > 0 but questions loaded = 0, RLS policy needs fixing</li>
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
                checked={selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
              />
              <span className="text-sm text-gray-600">Select All</span>
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

