'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

const DIFF_COLORS: Record<string, string> = {
  easy: '#22c55e',
  medium: '#eab308',
  hard: '#ef4444',
}

type QuestionBankChartsProps = {
  questionsByDifficulty: { difficulty: string; count: number }[]
  questionsByCategory: { category: string; count: number }[]
}

export function QuestionBankCharts({
  questionsByDifficulty,
  questionsByCategory,
}: QuestionBankChartsProps) {
  const pieData = questionsByDifficulty.map((d) => ({
    name: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1),
    value: d.count,
    color: DIFF_COLORS[d.difficulty] || '#94a3b8',
  }))

  const barData = [...questionsByCategory]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => ({ name: c.category.length > 14 ? c.category.slice(0, 12) + '…' : c.category, count: c.count }))

  if (pieData.every((d) => d.value === 0) && barData.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {pieData.some((d) => d.value > 0) && (
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4 min-h-[280px]">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Difficulty distribution</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {barData.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4 min-h-[280px]">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Top categories</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#C0392B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
