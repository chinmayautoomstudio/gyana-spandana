'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Chart } from '@/components/admin/Chart'
import { format } from 'date-fns'

interface Exam {
  id: string
  title: string
  total_questions: number
}

interface QuestionAnalytics {
  question_id: string
  question_text: string
  total_attempts: number
  correct_count: number
  incorrect_count: number
  option_a_count: number
  option_b_count: number
  option_c_count: number
  option_d_count: number
  difficulty_score: number
}

interface ScoreDistribution {
  range: string
  count: number
}

export default function ExamAnalyticsPage() {
  const params = useParams()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([])
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([])
  const [timeAnalysis, setTimeAnalysis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient()

      // Fetch exam
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      setExam(examData)

      // Fetch questions
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true, nullsFirst: false })

      // Fetch exam attempts
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('id, score, time_taken_minutes, submitted_at')
        .eq('exam_id', examId)
        .eq('status', 'submitted')

      // Fetch exam answers for question analysis
      const { data: answers } = await supabase
        .from('exam_answers')
        .select(`
          *,
          attempt:exam_attempts!inner(exam_id),
          question:questions(*)
        `)
        .eq('attempt.exam_id', examId)

      // Calculate question analytics
      const questionStats: QuestionAnalytics[] = (questions || []).map((question) => {
        const questionAnswers = answers?.filter(
          (a: any) => a.question_id === question.id
        ) || []

        const correctCount = questionAnswers.filter(
          (a: any) => a.is_correct === true
        ).length

        const totalAttempts = attempts?.length || 0
        const difficultyScore = totalAttempts > 0
          ? Math.round((correctCount / totalAttempts) * 100)
          : 0

        return {
          question_id: question.id,
          question_text: question.question_text.substring(0, 100) + (question.question_text.length > 100 ? '...' : ''),
          total_attempts: totalAttempts,
          correct_count: correctCount,
          incorrect_count: totalAttempts - correctCount,
          option_a_count: questionAnswers.filter((a: any) => a.selected_answer === 'A').length,
          option_b_count: questionAnswers.filter((a: any) => a.selected_answer === 'B').length,
          option_c_count: questionAnswers.filter((a: any) => a.selected_answer === 'C').length,
          option_d_count: questionAnswers.filter((a: any) => a.selected_answer === 'D').length,
          difficulty_score: difficultyScore,
        }
      })

      setQuestionAnalytics(questionStats)

      // Calculate score distribution
      const distribution: ScoreDistribution[] = [
        { range: '0-25', count: 0 },
        { range: '26-50', count: 0 },
        { range: '51-75', count: 0 },
        { range: '76-100', count: 0 },
      ]

      attempts?.forEach((attempt) => {
        const percentage = examData?.total_questions
          ? Math.round((attempt.score / examData.total_questions) * 100)
          : 0

        if (percentage <= 25) distribution[0].count++
        else if (percentage <= 50) distribution[1].count++
        else if (percentage <= 75) distribution[2].count++
        else distribution[3].count++
      })

      setScoreDistribution(distribution)

      // Time analysis (group by hour of day)
      const timeGroups: { [key: number]: number } = {}
      attempts?.forEach((attempt) => {
        if (attempt.submitted_at) {
          const hour = new Date(attempt.submitted_at).getHours()
          timeGroups[hour] = (timeGroups[hour] || 0) + 1
        }
      })

      const timeData = Object.entries(timeGroups).map(([hour, count]) => ({
        hour: `${hour}:00`,
        submissions: count,
      }))

      setTimeAnalysis(timeData.sort((a, b) => a.hour.localeCompare(b.hour)))

      setLoading(false)
    }

    fetchAnalytics()
  }, [examId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Exam not found</p>
        <Link href="/admin/exams">
          <Link href="/admin/exams" className="text-[#C0392B] hover:underline mt-4 inline-block">
            Back to Exams
          </Link>
        </Link>
      </div>
    )
  }

  // Sort questions by difficulty (easiest to hardest)
  const sortedQuestions = [...questionAnalytics].sort(
    (a, b) => b.difficulty_score - a.difficulty_score
  )

  const easiestQuestions = sortedQuestions.slice(0, 5)
  const hardestQuestions = sortedQuestions.slice(-5).reverse()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/exams/${examId}`}
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exam Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
        <p className="text-gray-600 mt-1">Analytics & Performance</p>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{exam.total_questions}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionAnalytics.length > 0
              ? Math.round(
                  questionAnalytics.reduce((sum, q) => sum + q.difficulty_score, 0) /
                  questionAnalytics.length
                )
              : 0}%
          </p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Total Attempts</p>
          <p className="text-2xl font-bold text-gray-900">
            {questionAnalytics[0]?.total_attempts || 0}
          </p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-500">Questions Analyzed</p>
          <p className="text-2xl font-bold text-gray-900">{questionAnalytics.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Score Distribution</h3>
          {scoreDistribution.some(d => d.count > 0) ? (
            <Chart
              type="bar"
              data={scoreDistribution}
              dataKey="count"
              nameKey="range"
              height={250}
            />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No score data available</p>
          )}
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Submissions by Hour</h3>
          {timeAnalysis.length > 0 ? (
            <Chart
              type="line"
              data={timeAnalysis}
              dataKey="submissions"
              nameKey="hour"
              height={250}
            />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No time data available</p>
          )}
        </div>
      </div>

      {/* Question Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Easiest Questions */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Easiest Questions</h3>
          {easiestQuestions.length > 0 ? (
            <div className="space-y-3">
              {easiestQuestions.map((q, index) => (
                <div key={q.question_id} className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Q{index + 1}: {q.question_text}
                    </span>
                    <span className="text-sm font-bold text-green-600">{q.difficulty_score}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {q.correct_count} / {q.total_attempts} correct
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No question data available</p>
          )}
        </div>

        {/* Hardest Questions */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Most Difficult Questions</h3>
          {hardestQuestions.length > 0 ? (
            <div className="space-y-3">
              {hardestQuestions.map((q, index) => (
                <div key={q.question_id} className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Q{index + 1}: {q.question_text}
                    </span>
                    <span className="text-sm font-bold text-red-600">{q.difficulty_score}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {q.correct_count} / {q.total_attempts} correct
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No question data available</p>
          )}
        </div>
      </div>

      {/* Question-wise Performance Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Question Performance Details</h3>
        {questionAnalytics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incorrect</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answer Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {questionAnalytics.map((q, index) => (
                  <tr key={q.question_id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Q{index + 1}: {q.question_text}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{q.correct_count}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{q.incorrect_count}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        q.difficulty_score >= 75 ? 'bg-green-100 text-green-800' :
                        q.difficulty_score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {q.difficulty_score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600">A: {q.option_a_count}</span>
                        <span className="text-green-600">B: {q.option_b_count}</span>
                        <span className="text-yellow-600">C: {q.option_c_count}</span>
                        <span className="text-purple-600">D: {q.option_d_count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No question data available</p>
        )}
      </div>
    </div>
  )
}

