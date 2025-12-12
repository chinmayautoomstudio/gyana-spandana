'use client'

interface Exam {
  id: string
  title: string
}

interface QuestionFiltersProps {
  exams: Exam[]
  selectedExam: string
  onExamChange: (examId: string) => void
  selectedDifficulty: string
  onDifficultyChange: (difficulty: string) => void
  minPoints: number
  maxPoints: number
  onPointsChange: (min: number, max: number) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  categories: string[]
}

export function QuestionFilters({
  exams,
  selectedExam,
  onExamChange,
  selectedDifficulty,
  onDifficultyChange,
  minPoints,
  maxPoints,
  onPointsChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: QuestionFiltersProps) {
  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Exam</label>
          <select
            value={selectedExam}
            onChange={(e) => onExamChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
          >
            <option value="">All Exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
          >
            <option value="">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points Range: {minPoints} - {maxPoints}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={minPoints}
              onChange={(e) => onPointsChange(parseInt(e.target.value) || 0, maxPoints)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
              placeholder="Min"
            />
            <input
              type="number"
              min="0"
              value={maxPoints}
              onChange={(e) => onPointsChange(minPoints, parseInt(e.target.value) || 100)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
              placeholder="Max"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

