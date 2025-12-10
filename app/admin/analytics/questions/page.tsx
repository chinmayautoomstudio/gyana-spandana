'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Chart } from '@/components/admin/Chart'

interface QuestionStats {
  question_id: string
  question_text: string
  total_attempts: number
  correct_count: number
  difficulty_percentage: number
  most_selected_option: string
}

export default function QuestionAnalyticsPage() {
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([])
  const [difficultyDistribution, setDifficultyDistribution] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch all questions with their answer statistics
      const { data: questions } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer')

      const { data: allAnswers } = await supabase
        .from('exam_answers')
        .select('question_id, selected_answer, is_correct')

      const stats: QuestionStats[] = []

      for (const question of questions || []) {
        const questionAnswers = allAnswers?.filter(a => a.question_id === question.id) || []
        const correctCount = questionAnswers.filter(a => a.is_correct === true).length
        const difficultyPercentage = questionAnswers.length > 0
          ? Math.round((correctCount / questionAnswers.length) * 100)
          : 0

        // Find most selected option
        const optionCounts: { [key: string]: number } = {}
        questionAnswers.forEach(a => {
          optionCounts[a.selected_answer] = (optionCounts[a.selected_answer] || 0) + 1
        })
        const mostSelected = Object.entries(optionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

        stats.push({
          question_id: question.id,
          question_text: question.question_text.substring(0, 100),
          total_attempts: questionAnswers.length,
          correct_count: correctCount,
          difficulty_percentage: difficultyPercentage,
          most_selected_option: mostSelected,
        })
      }

      // Calculate difficulty distribution
      const distribution = [
        { difficulty: 'Easy (76-100%)', count: 0 },
        { difficulty: 'Medium (51-75%)', count: 0 },
        { difficulty: 'Hard (26-50%)', count: 0 },
        { difficulty: 'Very Hard (0-25%)', count: 0 },
      ]

      stats.forEach((s) => {
        if (s.difficulty_percentage >= 76) distribution[0].count++
        else if (s.difficulty_percentage >= 51) distribution[1].count++
        else if (s.difficulty_percentage >= 26) distribution[2].count++
        else distribution[3].count++
      })

      setQuestionStats(stats.sort((a, b) => a.difficulty_percentage - b.difficulty_percentage))
      setDifficultyDistribution(distribution)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  const easiestQuestions = [...questionStats].slice(-10).reverse()
  const hardestQuestions = questionStats.slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/analytics"
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Analytics
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Question Analytics</h1>
        <p className="text-gray-600 mt-1">Question difficulty and effectiveness analysis</p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Difficulty Distribution</h3>
        {difficultyDistribution.some(d => d.count > 0) ? (
          <Chart type="pie" data={difficultyDistribution} dataKey="count" nameKey="difficulty" height={300} />
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Easiest Questions</h3>
          <div className="space-y-3">
            {easiestQuestions.slice(0, 5).map((q) => (
              <div key={q.question_id} className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">{q.question_text}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{q.correct_count} / {q.total_attempts} correct</span>
                  <span className="font-bold text-green-600">{q.difficulty_percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Most Difficult Questions</h3>
          <div className="space-y-3">
            {hardestQuestions.slice(0, 5).map((q) => (
              <div key={q.question_id} className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">{q.question_text}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{q.correct_count} / {q.total_attempts} correct</span>
                  <span className="font-bold text-red-600">{q.difficulty_percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

