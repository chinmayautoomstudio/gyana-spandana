'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { calculateTotalScore } from '@/lib/utils/scoring'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  points: number
  order_index: number | null
}

interface Exam {
  id: string
  title: string
  duration_minutes: number
  total_questions: number
}

interface Answer {
  questionId: string
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null
}

export default function TakeExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeExam = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get participant ID
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!participant) {
        router.push('/dashboard')
        return
      }

      setParticipantId(participant.id)

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (!examData) {
        router.push('/exams')
        return
      }

      // Check if exam has participant assignments
      const { data: allAssignments } = await supabase
        .from('exam_participants')
        .select('exam_id')
        .eq('exam_id', examId)

      // If exam has assignments, verify participant is assigned
      if (allAssignments && allAssignments.length > 0) {
        const { data: participantAssignment } = await supabase
          .from('exam_participants')
          .select('id')
          .eq('exam_id', examId)
          .eq('participant_id', participant.id)
          .single()

        if (!participantAssignment) {
          // Participant not assigned to this exam
          alert('You are not assigned to this exam. Please contact an administrator.')
          router.push('/exams')
          return
        }
      }

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('participant_id', participant.id)
        .eq('status', 'in_progress')
        .single()

      setExam(examData)

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (!questionsData || questionsData.length === 0) {
        alert('No questions found for this exam')
        router.push('/exams')
        return
      }

      setQuestions(questionsData)

      // Create or resume attempt
      let attempt = existingAttempt
      if (!attempt) {
        const { data: newAttempt, error } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            participant_id: participant.id,
            total_questions: questionsData.length,
            status: 'in_progress',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating attempt:', error)
          router.push('/exams')
          return
        }
        attempt = newAttempt
      }

      setAttemptId(attempt.id)

      // Calculate time remaining
      const startTime = new Date(attempt.started_at).getTime()
      const durationMs = examData.duration_minutes * 60 * 1000
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, durationMs - elapsed)
      setTimeRemaining(Math.floor(remaining / 1000))

      // Load existing answers
      const { data: existingAnswers } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('attempt_id', attempt.id)

      if (existingAnswers) {
        const answersMap: Record<string, Answer> = {}
        existingAnswers.forEach(answer => {
          answersMap[answer.question_id] = {
            questionId: answer.question_id,
            selectedAnswer: answer.selected_answer as 'A' | 'B' | 'C' | 'D' | null,
          }
        })
        setAnswers(answersMap)
      }

      setLoading(false)
    }

    initializeExam()
  }, [examId, router])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !attemptId) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, attemptId])

  // Auto-save answers
  useEffect(() => {
    if (!attemptId || Object.keys(answers).length === 0) return

    const autoSave = async () => {
      const supabase = createClient()
      
      // Save all answers
      for (const [questionId, answer] of Object.entries(answers)) {
        if (!answer.selectedAnswer) continue

        const { error } = await supabase
          .from('exam_answers')
          .upsert({
            attempt_id: attemptId,
            question_id: questionId,
            selected_answer: answer.selectedAnswer,
          }, {
            onConflict: 'attempt_id,question_id'
          })

        if (error) {
          console.error('Auto-save error:', error)
        }
      }
    }

    const timeout = setTimeout(autoSave, 2000) // Debounce 2 seconds
    return () => clearTimeout(timeout)
  }, [answers, attemptId])

  const handleAnswerSelect = (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedAnswer: answer,
      }
    }))
  }

  const handleAutoSubmit = async () => {
    if (!attemptId || !exam) return

    await submitExam(true)
  }

  const submitExam = async (isTimeout = false) => {
    if (!attemptId || !exam || !participantId) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Get all questions with correct answers for scoring
      const { data: questionsWithAnswers } = await supabase
        .from('questions')
        .select('id, correct_answer, points')
        .eq('exam_id', examId)

      if (!questionsWithAnswers) {
        throw new Error('Failed to fetch questions for scoring')
      }

      // Calculate scores
      let totalScore = 0
      let correctAnswers = 0

      for (const question of questionsWithAnswers) {
        const userAnswer = answers[question.id]?.selectedAnswer
        const isCorrect = userAnswer === question.correct_answer

        if (isCorrect) {
          correctAnswers++
          totalScore += question.points
        }

        // Save/update answer with scoring
        await supabase
          .from('exam_answers')
          .upsert({
            attempt_id: attemptId,
            question_id: question.id,
            selected_answer: userAnswer || null,
            is_correct: isCorrect,
            points_earned: isCorrect ? question.points : 0,
          }, {
            onConflict: 'attempt_id,question_id'
          })
      }

      // Get attempt start time
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('started_at')
        .eq('id', attemptId)
        .single()

      const startTime = attemptData?.started_at ? new Date(attemptData.started_at).getTime() : Date.now()
      const timeTaken = Math.floor((Date.now() - startTime) / 60000)

      const { error: updateError } = await supabase
        .from('exam_attempts')
        .update({
          status: 'submitted',
          score: totalScore,
          correct_answers: correctAnswers,
          submitted_at: new Date().toISOString(),
          time_taken_minutes: timeTaken,
        })
        .eq('id', attemptId)

      if (updateError) {
        throw updateError
      }

      // Trigger team score calculation (handled by database trigger)
      // Navigate to results
      router.push(`/exams/${examId}/results`)
    } catch (error: any) {
      console.error('Error submitting exam:', error)
      alert('Error submitting exam: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Exam not found or no questions available</p>
          <Link href="/exams">
            <Button variant="outline">Back to Exams</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion.id]?.selectedAnswer || null
  const answeredCount = Object.values(answers).filter(a => a.selectedAnswer !== null).length

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                timeRemaining < 300 ? 'bg-red-500/10 text-red-700' : 'bg-[#C0392B]/10 text-[#C0392B]'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (confirm('Are you sure you want to submit the exam?')) {
                    submitExam()
                  }
                }}
                disabled={isSubmitting}
              >
                Submit Exam
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {answeredCount} / {questions.length} answered</span>
              <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#C0392B] h-2 rounded-full transition-all"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-3">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id]?.selectedAnswer !== null
                  const isCurrent = index === currentQuestionIndex
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        isCurrent
                          ? 'bg-[#C0392B] text-white'
                          : isAnswered
                          ? 'bg-green-500/20 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {currentQuestion.question_text}
                </h2>

                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => {
                    const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof Question] as string
                    const isSelected = currentAnswer === option

                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-[#C0392B]/10 border-[#C0392B] text-[#C0392B]'
                            : 'bg-white border-gray-200 hover:border-[#E67E22] text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            isSelected ? 'bg-[#C0392B] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {option}
                          </div>
                          <span className="flex-1">{optionText}</span>
                          {isSelected && (
                            <svg className="w-5 h-5 text-[#C0392B]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

