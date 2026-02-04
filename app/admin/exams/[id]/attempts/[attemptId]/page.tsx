'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Exam {
  id: string
  title: string
  total_questions: number
  passing_score: number | null
}

interface Attempt {
  id: string
  score: number
  correct_answers: number
  total_questions: number
  submitted_at: string
  question_ids: string[] | null
  participant_id: string
}

interface Participant {
  id: string
  name: string
  email: string
  teams: {
    team_name: string
    team_code: string
  } | null
}

interface Answer {
  question_id: string
  question_text: string
  selected_answer: string | null
  correct_answer: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  is_correct: boolean
  points_earned: number
}

export default function AdminAttemptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const examId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined
  const attemptId = typeof resolvedParams?.attemptId === 'string' ? resolvedParams.attemptId : undefined
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showQuestionReview, setShowQuestionReview] = useState(false)
  const [gotoInputValue, setGotoInputValue] = useState('')
  const [isGotoInputFocused, setIsGotoInputFocused] = useState(false)

  useEffect(() => {
    if (!examId || !attemptId) return
    
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Verify admin role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = profile?.role || user.user_metadata?.role || 'participant'
      if (role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (!examData) {
        router.push(`/admin/exams/${examId}/results`)
        return
      }

      setExam(examData)

      // Fetch attempt
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('exam_id', examId)
        .single()

      if (!attemptData) {
        router.push(`/admin/exams/${examId}/results`)
        return
      }

      setAttempt(attemptData)

      // Fetch participant info
      const { data: participantData } = await supabase
        .from('participants')
        .select(`
          id,
          name,
          email,
          teams(team_name, team_code)
        `)
        .eq('id', attemptData.participant_id)
        .single()

      if (participantData) {
        // Handle teams as array or single object from Supabase relation
        const teamsData = Array.isArray(participantData.teams) 
          ? participantData.teams[0] || null
          : participantData.teams || null
        
        setParticipant({
          id: participantData.id,
          name: participantData.name,
          email: participantData.email,
          teams: teamsData,
        })
      }

      // Get question IDs for this participant's attempt
      let participantQuestionIds = (attemptData.question_ids as string[] | null) || []
      
      // If question_ids is not set (old attempts), fetch all exam questions as fallback
      if (participantQuestionIds.length === 0) {
        const { data: allQuestions } = await supabase
          .from('questions')
          .select('id')
          .eq('exam_id', examId)
        
        participantQuestionIds = allQuestions?.map(q => q.id) || []
      }

      const questionIdsToFetch = participantQuestionIds

      // Fetch answers with question details (only for participant's questions)
      const { data: answersData } = await supabase
        .from('exam_answers')
        .select(`
          *,
          questions (
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
          )
        `)
        .eq('attempt_id', attemptData.id)
        .in('question_id', questionIdsToFetch)

      if (answersData) {
        // Create a map for quick lookup
        const answersMap = new Map(answersData.map((a: any) => [a.question_id, a]))
        
        // Format answers preserving the order from question_ids
        const formattedAnswers: Answer[] = questionIdsToFetch
          .map(questionId => {
            const answer = answersMap.get(questionId)
            if (!answer) {
              // Question was assigned but no answer provided
              return null
            }
            return {
              question_id: answer.question_id,
              question_text: answer.questions.question_text,
              selected_answer: answer.selected_answer,
              correct_answer: answer.questions.correct_answer,
              option_a: answer.questions.option_a,
              option_b: answer.questions.option_b,
              option_c: answer.questions.option_c,
              option_d: answer.questions.option_d,
              is_correct: answer.is_correct,
              points_earned: answer.points_earned,
            }
          })
          .filter((a): a is Answer => a !== null)
        
        setAnswers(formattedAnswers)
      }

      setLoading(false)
    }

    fetchData()
  }, [examId, attemptId, router])

  // Clear goto input when question index changes
  useEffect(() => {
    if (!isGotoInputFocused) {
      setGotoInputValue('')
    }
  }, [currentQuestionIndex, isGotoInputFocused])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (!exam || !attempt || !participant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Attempt not found</p>
        <Link href={`/admin/exams/${examId}/results`}>
          <Button variant="outline">Back to Results</Button>
        </Link>
      </div>
    )
  }

  const totalPossibleScore = exam.total_questions
  
  const percentage = totalPossibleScore > 0 
    ? Math.round((attempt.score / totalPossibleScore) * 100)
    : 0
  const isPassed = exam.passing_score ? attempt.score >= exam.passing_score : true

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-blue-600'
    if (percentage >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100'
    if (percentage >= 60) return 'bg-blue-100'
    if (percentage >= 40) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const handleQuestionNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else if (direction === 'next' && currentQuestionIndex < answers.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const currentAnswer = answers[currentQuestionIndex] || null
  const wrongAnswers = answers.filter(a => !a.is_correct).length
  const skippedQuestions = exam.total_questions - answers.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/admin/exams/${examId}/results`}
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Results
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              Participant: <span className="font-medium">{participant.name}</span>
              {participant.teams && (
                <> • Team: <span className="font-medium">{participant.teams.team_name}</span></>
              )}
            </p>
          </div>
        </div>
      </div>

      {!showQuestionReview ? (
        <>
          {/* Results Summary */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg className={`w-16 h-16 mx-auto mb-2 ${getScoreColor(percentage)}`} fill="currentColor" viewBox="0 0 20 20">
                {percentage >= 80 ? (
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                )}
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Results</h2>
            </div>

            {/* Score Card */}
            <div className={`${getScoreBgColor(percentage)} rounded-xl p-6 mb-6`}>
              <div className={`text-5xl font-bold mb-2 ${
                percentage >= 80 ? 'text-green-800' :
                percentage >= 60 ? 'text-blue-800' :
                percentage >= 40 ? 'text-yellow-800' :
                'text-red-800'
              }`}>{percentage}%</div>
              <div className="text-sm text-gray-700 mb-4">Score</div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                isPassed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </div>
              <div className={`mt-4 text-lg font-semibold ${
                percentage >= 80 ? 'text-green-800' :
                percentage >= 60 ? 'text-blue-800' :
                percentage >= 40 ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                {attempt.score} / {totalPossibleScore} points
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{attempt.correct_answers}</div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{wrongAnswers}</div>
                <div className="text-sm text-gray-600">Wrong Answers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">{skippedQuestions}</div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => setShowQuestionReview(true)}
                className="px-8 py-3"
              >
                Review Questions & Answers
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Question Review Header */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowQuestionReview(false)}
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Results
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Question Review</h2>
                  <p className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {answers.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Question Card */}
          {currentAnswer && (
            <div className={`bg-white/70 backdrop-blur-xl rounded-xl border-2 shadow-lg p-6 ${
              currentAnswer.is_correct ? 'border-green-200' : 'border-red-200'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {currentAnswer.is_correct ? (
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {currentAnswer.is_correct ? 'Correct' : 'Incorrect'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Points: {currentAnswer.points_earned}/{currentAnswer.points_earned || 1}
                    </div>
                  </div>
                </div>
              </div>

              {/* Question */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Question {currentQuestionIndex + 1}: {currentAnswer.question_text}
              </h3>

              {/* Options */}
              <div className="space-y-2 mb-6">
                {(['A', 'B', 'C', 'D'] as const).map((option) => {
                  const optionText = currentAnswer[`option_${option.toLowerCase()}` as keyof Answer] as string
                  const isSelected = currentAnswer.selected_answer === option
                  const isCorrect = currentAnswer.correct_answer === option

                  return (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border ${
                        isCorrect
                          ? 'bg-green-100 border-green-300'
                          : isSelected
                          ? 'bg-red-100 border-red-300'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          isCorrect ? 'text-green-900' :
                          isSelected ? 'text-red-900' :
                          'text-gray-900'
                        }`}>{option}.</span>
                        <span className={`flex-1 ${
                          isCorrect ? 'text-green-900' :
                          isSelected ? 'text-red-900' :
                          'text-gray-900'
                        }`}>{optionText}</span>
                        {isCorrect && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Correct</span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Selected</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => handleQuestionNavigation('prev')}
                disabled={currentQuestionIndex === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </Button>

              {/* Quick navigation input for large question sets */}
              {answers.length > 10 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Go to:</span>
                  <input
                    type="text"
                    value={gotoInputValue}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      if (inputValue === '' || /^\d+$/.test(inputValue)) {
                        setGotoInputValue(inputValue)
                      }
                    }}
                    onFocus={(e) => {
                      setIsGotoInputFocused(true)
                      if (!gotoInputValue) {
                        setGotoInputValue((currentQuestionIndex + 1).toString())
                        setTimeout(() => e.target.select(), 0)
                      }
                    }}
                    onBlur={(e) => {
                      setIsGotoInputFocused(false)
                      const inputValue = e.target.value.trim()
                      if (inputValue === '') {
                        setGotoInputValue('')
                        return
                      }
                      const value = parseInt(inputValue)
                      if (!isNaN(value) && value >= 1 && value <= answers.length) {
                        setCurrentQuestionIndex(value - 1)
                        setGotoInputValue('')
                      } else {
                        setGotoInputValue('')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const target = e.target as HTMLInputElement
                        const value = parseInt(target.value)
                        if (!isNaN(value) && value >= 1 && value <= answers.length) {
                          setCurrentQuestionIndex(value - 1)
                          setGotoInputValue('')
                          setIsGotoInputFocused(false)
                          target.blur()
                        }
                      }
                      if (e.key === 'Escape') {
                        setGotoInputValue('')
                        setIsGotoInputFocused(false)
                        const target = e.target as HTMLInputElement
                        target.blur()
                      }
                    }}
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-sm"
                  />
                  <span className="text-sm text-gray-600">of {answers.length}</span>
                </div>
              )}

              {/* Pagination buttons */}
              <div className="flex gap-2 flex-wrap justify-center">
                {(() => {
                  const totalQuestions = answers.length
                  const maxVisiblePages = 7
                  const currentPage = currentQuestionIndex + 1

                  if (totalQuestions <= maxVisiblePages) {
                    return answers.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors text-sm ${
                          index === currentQuestionIndex
                            ? 'bg-[#C0392B] text-white'
                            : answers[index].is_correct
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))
                  }

                  const pages = []
                  pages.push(
                    <button
                      key={0}
                      onClick={() => setCurrentQuestionIndex(0)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors text-sm ${
                        0 === currentQuestionIndex
                          ? 'bg-[#C0392B] text-white'
                          : answers[0].is_correct
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      1
                    </button>
                  )

                  if (currentPage > 4) {
                    pages.push(<span key="ellipsis1" className="px-2">...</span>)
                  }

                  const startPage = Math.max(1, currentPage - 2)
                  const endPage = Math.min(totalQuestions - 1, currentPage + 2)

                  for (let i = startPage; i <= endPage; i++) {
                    if (i !== 0 && i !== totalQuestions - 1) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors text-sm ${
                            i === currentQuestionIndex
                              ? 'bg-[#C0392B] text-white'
                              : answers[i].is_correct
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    }
                  }

                  if (currentPage < totalQuestions - 3) {
                    pages.push(<span key="ellipsis2" className="px-2">...</span>)
                  }

                  if (totalQuestions > 1) {
                    pages.push(
                      <button
                        key={totalQuestions - 1}
                        onClick={() => setCurrentQuestionIndex(totalQuestions - 1)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors text-sm ${
                          totalQuestions - 1 === currentQuestionIndex
                            ? 'bg-[#C0392B] text-white'
                            : answers[totalQuestions - 1].is_correct
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {totalQuestions}
                      </button>
                    )
                  }

                  return pages
                })()}
              </div>

              <Button
                variant="outline"
                onClick={() => handleQuestionNavigation('next')}
                disabled={currentQuestionIndex === answers.length - 1}
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
