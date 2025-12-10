'use client'

interface QuestionStatsProps {
  totalQuestions: number
  questionsByExam: { examTitle: string; count: number }[]
  questionsByDifficulty: { difficulty: string; count: number }[]
  questionsByCategory: { category: string; count: number }[]
}

export function QuestionStats({
  totalQuestions,
  questionsByExam,
  questionsByDifficulty,
  questionsByCategory,
}: QuestionStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuestions}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Exams</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{questionsByExam.length}</p>
          </div>
          <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Categories</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{questionsByCategory.length}</p>
          </div>
          <div className="w-12 h-12 bg-purple-500/10 text-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Avg Difficulty</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {questionsByDifficulty.length > 0
                ? questionsByDifficulty.reduce((acc, curr) => {
                    const weight = curr.difficulty === 'easy' ? 1 : curr.difficulty === 'medium' ? 2 : 3
                    return acc + weight * curr.count
                  }, 0) /
                  questionsByDifficulty.reduce((acc, curr) => acc + curr.count, 0) >
                  2
                  ? 'Hard'
                  : questionsByDifficulty.reduce((acc, curr) => {
                      const weight = curr.difficulty === 'easy' ? 1 : curr.difficulty === 'medium' ? 2 : 3
                      return acc + weight * curr.count
                    }, 0) /
                      questionsByDifficulty.reduce((acc, curr) => acc + curr.count, 0) >
                    1.5
                  ? 'Medium'
                  : 'Easy'
                : 'N/A'}
            </p>
          </div>
          <div className="w-12 h-12 bg-yellow-500/10 text-yellow-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

