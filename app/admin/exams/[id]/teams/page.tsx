'use client'

import { useEffect, useState, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface TeamMember {
  id: string
  name: string
  email: string
  assigned: boolean
}

interface Team {
  team_id: string
  team_name: string
  team_code: string | null
  participant1: TeamMember | null
  participant2: TeamMember | null
  assigned_count: number
  status: 'complete' | 'partial'
  both_assigned: boolean
}

export default function ExamTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const examId = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined
  const [exam, setExam] = useState<{ id: string; title: string } | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [examId])

  const fetchData = async () => {
    if (!examId) return
    
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Fetch exam details
    const { data: examData } = await supabase
      .from('exams')
      .select('id, title')
      .eq('id', examId)
      .single()

    if (examData) {
      setExam(examData)
    }

    // Fetch teams assigned to exam
    try {
      const response = await fetch(`/api/admin/exams/${examId}/teams`)
      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to fetch teams')
      }
      const { teams: teamsData } = await response.json()
      setTeams(teamsData || [])
    } catch (err: any) {
      console.error('Error fetching teams:', err)
      setError(err.message || 'Failed to fetch teams')
    }

    setLoading(false)
  }

  const filteredTeams = teams.filter((team) => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      if (
        !team.team_name.toLowerCase().includes(lowerSearch) &&
        !(team.team_code?.toLowerCase().includes(lowerSearch)) &&
        !team.participant1?.name.toLowerCase().includes(lowerSearch) &&
        !team.participant2?.name.toLowerCase().includes(lowerSearch) &&
        !team.participant1?.email.toLowerCase().includes(lowerSearch) &&
        !team.participant2?.email.toLowerCase().includes(lowerSearch)
      ) {
        return false
      }
    }
    if (statusFilter && team.status !== statusFilter) return false
    return true
  })

  // Calculate statistics
  const totalTeams = teams.length
  const completeTeams = teams.filter((t) => t.both_assigned).length
  const partialTeams = teams.filter((t) => !t.both_assigned).length

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
          <Button variant="outline" size="md" className="mt-4">
            Back to Exams
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assigned Teams</h1>
            <p className="text-gray-600 mt-1">Exam: {exam.title}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Total Teams</p>
          <p className="text-2xl font-bold text-gray-900">{totalTeams}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Complete Teams</p>
          <p className="text-2xl font-bold text-green-600">{completeTeams}</p>
          <p className="text-xs text-gray-500 mt-1">Both participants assigned</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Partial Teams</p>
          <p className="text-2xl font-bold text-yellow-600">{partialTeams}</p>
          <p className="text-xs text-gray-500 mt-1">Only one participant assigned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by team name, code, or participant name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
            >
              <option value="">All Status</option>
              <option value="complete">Complete Teams</option>
              <option value="partial">Partial Teams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {teams.length === 0 ? 'No teams assigned to this exam' : 'No teams match your search'}
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                  <tr key={team.team_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{team.team_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{team.team_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {team.participant1 ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{team.participant1.name}</div>
                          <div className="text-sm text-gray-500">{team.participant1.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {team.participant2 ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{team.participant2.name}</div>
                          <div className="text-sm text-gray-500">{team.participant2.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {team.both_assigned ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Partial
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
