'use client'

import { useEffect, useState } from 'react'
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

export default function ExamResultsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
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

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      setExam(examData)

      // Fetch attempt
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('participant_id', participant.id)
        .eq('status', 'submitted')
        .single()

      if (!attemptData) {
        router.push('/exams')
        return
      }

      setAttempt(attemptData)

      // Fetch answers with question details
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

      if (answersData) {
        const formattedAnswers: Answer[] = answersData.map((answer: any) => ({
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
        }))
        setAnswers(formattedAnswers)
      }

      setLoading(false)
    }

    fetchResults()
  }, [examId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!exam || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Results not found</p>
          <Link href="/exams">
            <Button variant="outline">Back to Exams</Button>
          </Link>
        </div>
      </div>
    )
  }

  const percentage = Math.round((attempt.score / (exam.total_questions * 1)) * 100) // Assuming 1 point per question
  const isPassed = exam.passing_score ? attempt.score >= exam.passing_score : true

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/exams"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exams
        </Link>

        {/* Results Summary */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-8 mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          <p className="text-gray-600 mb-6">Exam Results</p>

          <div className="flex items-center justify-center gap-8 mb-6">
            <div>
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-4xl font-bold text-gray-900">{attempt.score}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Correct Answers</p>
              <p className="text-4xl font-bold text-green-600">{attempt.correct_answers} / {attempt.total_questions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Percentage</p>
              <p className="text-4xl font-bold text-[#C0392B]">{percentage}%</p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            isPassed ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'
          }`}>
            {isPassed ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Passed</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Failed</span>
              </>
            )}
          </div>
        </div>

        {/* Detailed Answers */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Question Review</h2>
          <div className="space-y-6">
            {answers.map((answer, index) => (
              <div
                key={answer.question_id}
                className={`p-4 rounded-xl border-2 ${
                  answer.is_correct
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Question {index + 1}: {answer.question_text}
                  </h3>
                  {answer.is_correct ? (
                    <span className="text-green-700 font-medium">+{answer.points_earned} points</span>
                  ) : (
                    <span className="text-red-700 font-medium">0 points</span>
                  )}
                </div>

                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((option) => {
                    const optionText = answer[`option_${option.toLowerCase()}` as keyof Answer] as string
                    const isSelected = answer.selected_answer === option
                    const isCorrect = answer.correct_answer === option

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
                          <span className="font-medium">{option}.</span>
                          <span className="flex-1">{optionText}</span>
                          {isCorrect && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Correct</span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Your Answer</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

