'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { calculateTotalScore } from '@/lib/utils/scoring'
import { FullScreenExam } from '@/components/exam/FullScreenExam'
import { SecurityViolation } from '@/lib/services/examSecurityService'
import { MCQQuestion } from '@/components/exam/MCQQuestion'
import { ExamTimer } from '@/components/exam/ExamTimer'
import { ExamProgressBar } from '@/components/exam/ExamProgressBar'
import { QuestionNavigator } from '@/components/exam/QuestionNavigator'
import { ExamInstructions } from '@/components/exam/ExamInstructions'
import { selectAndShuffleQuestions } from '@/lib/utils/randomQuestions'

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
  questions_per_participant: number | null
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
  const [showInstructions, setShowInstructions] = useState(true)
  const [examStarted, setExamStarted] = useState(false)

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

      // Create or resume attempt
      let attempt = existingAttempt
      let participantQuestionIds: string[] = []
      let participantQuestions: Question[] = []

      if (!attempt) {
        // New attempt: Fetch all questions from exam pool and randomly select/shuffle
        const { data: allQuestionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', examId)
          .order('order_index', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })

        if (!allQuestionsData || allQuestionsData.length === 0) {
          alert('No questions found for this exam')
          router.push('/exams')
          return
        }

        // Get questions_per_participant from exam (or use all if NULL)
        const questionsPerParticipant = examData.questions_per_participant || null

        // Validate: Ensure at least 1 question per participant
        if (questionsPerParticipant !== null && questionsPerParticipant < 1) {
          alert('Invalid exam configuration: Questions per participant must be at least 1')
          router.push('/exams')
          return
        }

        // Validate: Ensure questions_per_participant doesn't exceed pool size
        if (questionsPerParticipant !== null && questionsPerParticipant > allQuestionsData.length) {
          console.warn(`questions_per_participant (${questionsPerParticipant}) exceeds pool size (${allQuestionsData.length}). Using all questions.`)
          // Use all questions if requested count exceeds pool
        }

        // Randomly select and shuffle questions for this participant
        participantQuestionIds = selectAndShuffleQuestions(
          allQuestionsData,
          questionsPerParticipant
        )

        // Ensure we have at least one question
        if (participantQuestionIds.length === 0) {
          alert('No questions available for this exam')
          router.push('/exams')
          return
        }

        // Create attempt with selected question IDs
        const { data: newAttempt, error } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            participant_id: participant.id,
            question_ids: participantQuestionIds,
            total_questions: participantQuestionIds.length,
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

        // Fetch the selected questions in the shuffled order
        // We need to preserve the order from participantQuestionIds
        const questionsMap = new Map(allQuestionsData.map(q => [q.id, q]))
        participantQuestions = participantQuestionIds
          .map(id => questionsMap.get(id))
          .filter((q): q is Question => q !== undefined)
      } else {
        // Resuming existing attempt: Load question IDs from attempt
        if (attempt.question_ids && Array.isArray(attempt.question_ids)) {
          participantQuestionIds = attempt.question_ids as string[]
        } else {
          // Fallback: If question_ids is not set (old attempts), fetch all exam questions
          const { data: allQuestionsData } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true })

          if (!allQuestionsData || allQuestionsData.length === 0) {
            alert('No questions found for this exam')
            router.push('/exams')
            return
          }

          participantQuestionIds = allQuestionsData.map(q => q.id)
        }

        // Fetch questions by IDs, preserving order
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .in('id', participantQuestionIds)

        if (!questionsData || questionsData.length === 0) {
          alert('No questions found for this attempt')
          router.push('/exams')
          return
        }

        // Preserve the order from participantQuestionIds
        const questionsMap = new Map(questionsData.map(q => [q.id, q]))
        participantQuestions = participantQuestionIds
          .map(id => questionsMap.get(id))
          .filter((q): q is Question => q !== undefined)

        // Handle case where some question IDs don't exist (questions may have been deleted)
        if (participantQuestions.length < participantQuestionIds.length) {
          console.warn(`Some questions from attempt are missing. Expected ${participantQuestionIds.length}, found ${participantQuestions.length}`)
          // Update attempt with valid question IDs only
          const validQuestionIds = participantQuestions.map(q => q.id)
          await supabase
            .from('exam_attempts')
            .update({ question_ids: validQuestionIds, total_questions: validQuestionIds.length })
            .eq('id', attempt.id)
        }
      }

      setQuestions(participantQuestions)

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

  // Timer countdown - handled by ExamTimer component now
  const handleTimeUp = async () => {
    await handleAutoSubmit()
  }

  const handleTimeWarning = (secondsRemaining: number) => {
    console.warn(`Time warning: ${secondsRemaining} seconds remaining`)
  }

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

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const handleStartExam = () => {
    setShowInstructions(false)
    setExamStarted(true)
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

      // Get questions for this participant's attempt (from question_ids stored in attempt)
      const { data: attemptDataWithQuestions } = await supabase
        .from('exam_attempts')
        .select('question_ids, started_at')
        .eq('id', attemptId)
        .single()

      const participantQuestionIds = attemptDataWithQuestions?.question_ids as string[] | null || questions.map(q => q.id)

      // Get all questions with correct answers for scoring (only participant's questions)
      const { data: questionsWithAnswers } = await supabase
        .from('questions')
        .select('id, correct_answer, points')
        .in('id', participantQuestionIds)

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

      // Get attempt start time (already fetched above)
      const startTime = attemptDataWithQuestions?.started_at ? new Date(attemptDataWithQuestions.started_at).getTime() : Date.now()
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

      // Stop security monitoring before navigation
      const { examSecurityService } = await import('@/lib/services/examSecurityService')
      examSecurityService.stopSecurityForExamCompletion()

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
  const answeredQuestionIds = new Set(
    Object.entries(answers)
      .filter(([_, answer]) => answer.selectedAnswer !== null)
      .map(([questionId, _]) => questionId)
  )

  // Handle security violations
  const handleViolation = (violation: SecurityViolation) => {
    console.warn('🚨 Security Violation:', violation)
    // Optionally log to database or show warning to user
    // For now, just log to console
  }

  // Handle exam start
  const handleExamStart = () => {
    console.log('✅ Exam started with security monitoring')
    setExamStarted(true)
  }

  // Handle exam end
  const handleExamEnd = () => {
    console.log('🏁 Exam ended, security monitoring stopped')
  }

  // Show instructions modal if not started
  if (showInstructions && !examStarted) {
    return (
      <ExamInstructions
        isOpen={showInstructions}
        onClose={() => router.push('/exams')}
        onStartExam={handleStartExam}
        examDetails={{
          title: exam?.title || '',
          duration: exam?.duration_minutes || 0,
          totalQuestions: questions.length
        }}
        canStart={true}
      />
    )
  }

  return (
    <FullScreenExam
      onViolation={handleViolation}
      onExamStart={handleExamStart}
      onExamEnd={handleExamEnd}
      examDurationMinutes={exam.duration_minutes}
      warningMessage="This exam is monitored for security purposes. Fullscreen mode and security monitoring will be activated. Please ensure you follow all exam rules."
    >
      <div className="min-h-screen bg-[#ECF0F1]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                <p className="text-gray-600 mt-1">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ExamTimer
                  durationSeconds={timeRemaining}
                  onTimeUp={handleTimeUp}
                  onWarning={handleTimeWarning}
                  isActive={examStarted}
                />
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

            {/* Enhanced Progress Bar */}
            <ExamProgressBar
              currentQuestion={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              answeredQuestions={answeredCount}
              timeRemaining={timeRemaining}
              totalDuration={exam.duration_minutes * 60}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question Navigation Sidebar */}
            <div className="lg:col-span-1">
              <QuestionNavigator
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                answeredQuestionIds={answeredQuestionIds}
                onQuestionSelect={handleQuestionSelect}
              />
            </div>

            {/* Question Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
                <MCQQuestion
                  question={currentQuestion}
                  selectedAnswer={currentAnswer}
                  onAnswerSelect={(option) => handleAnswerSelect(currentQuestion.id, option)}
                  disabled={false}
                  showCorrectAnswer={false}
                />

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
    </FullScreenExam>
  )
}

