'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExportButton } from '@/components/admin/ExportButton'

interface TeamScore {
  id: string
  team_id: string
  exam_id: string
  participant1_score: number
  participant2_score: number
  total_team_score: number
  rank: number | null
  teams: {
    team_name: string
  }
  exams: {
    title: string
  }
}

interface Exam {
  id: string
  title: string
}

export default function LeaderboardPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [teamScores, setTeamScores] = useState<TeamScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('exams')
        .select('id, title')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })

      setExams(data || [])
      if (data && data.length > 0) {
        setSelectedExamId(data[0].id)
      }
      setLoading(false)
    }

    fetchExams()
  }, [])

  useEffect(() => {
    if (!selectedExamId) return

    const fetchLeaderboard = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('team_scores')
        .select('*, teams(team_name), exams(title)')
        .eq('exam_id', selectedExamId)
        .order('total_team_score', { ascending: false })
        .order('rank', { ascending: true })

      if (error) {
        console.error('Error fetching leaderboard:', error)
      } else {
        setTeamScores(data || [])
      }
    }

    fetchLeaderboard()

    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_scores',
          filter: `exam_id=eq.${selectedExamId}`,
        },
        () => {
          fetchLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedExamId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  const exportData = teamScores.map((ts, index) => ({
    'Rank': ts.rank || index + 1,
    'Team Name': ts.teams?.team_name || 'N/A',
    'Participant 1 Score': ts.participant1_score,
    'Participant 2 Score': ts.participant2_score,
    'Total Score': ts.total_team_score,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <div className="flex items-center gap-3">
          {selectedExamId && teamScores.length > 0 && (
            <ExportButton
              data={exportData}
              filename={`leaderboard-${selectedExamId}`}
              exportType="both"
              pdfTitle={`Leaderboard - ${exams.find(e => e.id === selectedExamId)?.title || 'Exam'}`}
              columns={[
                { header: 'Rank', dataKey: 'Rank' },
                { header: 'Team Name', dataKey: 'Team Name' },
                { header: 'Participant 1 Score', dataKey: 'Participant 1 Score' },
                { header: 'Participant 2 Score', dataKey: 'Participant 2 Score' },
                { header: 'Total Score', dataKey: 'Total Score' },
              ]}
            />
          )}
          <div className="w-64">
            <select
              value={selectedExamId || ''}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">Select an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedExamId && teamScores.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No scores yet</h3>
          <p className="text-gray-500">Scores will appear here once participants submit their exams</p>
        </div>
      ) : selectedExamId ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant 1</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant 2</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamScores.map((teamScore, index) => (
                  <tr key={teamScore.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {teamScore.rank === 1 && (
                          <span className="text-2xl">🥇</span>
                        )}
                        {teamScore.rank === 2 && (
                          <span className="text-2xl">🥈</span>
                        )}
                        {teamScore.rank === 3 && (
                          <span className="text-2xl">🥉</span>
                        )}
                        <span className={`text-lg font-bold ${
                          teamScore.rank === 1 ? 'text-yellow-600' :
                          teamScore.rank === 2 ? 'text-gray-400' :
                          teamScore.rank === 3 ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {teamScore.rank || index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {teamScore.teams?.team_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {teamScore.participant1_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {teamScore.participant2_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-[#C0392B]">
                        {teamScore.total_team_score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <p className="text-gray-600">Please select an exam to view the leaderboard</p>
        </div>
      )}
    </div>
  )
}

