'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Participant {
  id: string
  name: string
  email: string
  phone: string
  school_name: string
  is_participant1: boolean
  teams: {
    team_name: string
    team_code: string
  } | null
}

interface AssignedParticipant {
  id: string
  assigned_at: string
  participant: Participant
}

export default function ExamParticipantsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const [exam, setExam] = useState<{ id: string; title: string } | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [assignedParticipants, setAssignedParticipants] = useState<Set<string>>(new Set())
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    fetchData()
  }, [examId])

  const fetchData = async () => {
    setLoading(true)
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

    // Fetch all participants
    const { data: participantsData, error: participantsError } = await supabase
      .from('participants')
      .select('*, teams(team_name, team_code)')
      .order('name')

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
    } else {
      setParticipants(participantsData || [])
    }

    // Fetch assigned participants
    try {
      const response = await fetch(`/api/admin/exams/${examId}/participants`)
      if (response.ok) {
        const { assignments } = await response.json()
        const assignedIds = new Set<string>(
          assignments.map((a: AssignedParticipant) => a.participant.id as string)
        )
        setAssignedParticipants(assignedIds)
      }
    } catch (err) {
      console.error('Error fetching assignments:', err)
    }

    setLoading(false)
  }

  const filteredParticipants = participants.filter((p) => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      if (
        !p.name.toLowerCase().includes(lowerSearch) &&
        !p.email.toLowerCase().includes(lowerSearch) &&
        !p.school_name.toLowerCase().includes(lowerSearch) &&
        !p.teams?.team_name.toLowerCase().includes(lowerSearch)
      ) {
        return false
      }
    }
    if (teamFilter && p.teams?.team_name !== teamFilter) return false
    if (schoolFilter && p.school_name !== schoolFilter) return false
    if (roleFilter) {
      if (roleFilter === 'participant1' && !p.is_participant1) return false
      if (roleFilter === 'participant2' && p.is_participant1) return false
    }
    return true
  })

  const uniqueTeams = Array.from(
    new Set(participants.map((p) => p.teams?.team_name).filter(Boolean))
  )
  const uniqueSchools = Array.from(new Set(participants.map((p) => p.school_name).filter(Boolean)))

  const handleSelectParticipant = (participantId: string, selected: boolean) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(participantId)
      } else {
        next.delete(participantId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedParticipants.size === filteredParticipants.length) {
      setSelectedParticipants(new Set())
    } else {
      setSelectedParticipants(new Set(filteredParticipants.map((p) => p.id)))
    }
  }

  const handleAssign = async () => {
    if (selectedParticipants.size === 0) {
      setError('Please select at least one participant')
      return
    }

    setIsAssigning(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/exams/${examId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: Array.from(selectedParticipants),
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to assign participants')
      }

      const { assigned } = await response.json()
      setSuccess(`Successfully assigned ${assigned} participant(s)`)
      setSelectedParticipants(new Set())
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to assign participants')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async () => {
    if (selectedParticipants.size === 0) {
      setError('Please select at least one participant')
      return
    }

    setIsAssigning(true)
    setError(null)
    setSuccess(null)

    try {
      const participantIds = Array.from(selectedParticipants)
      const response = await fetch(
        `/api/admin/exams/${examId}/participants?participantIds=${encodeURIComponent(JSON.stringify(participantIds))}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to unassign participants')
      }

      const { unassigned } = await response.json()
      setSuccess(`Successfully unassigned ${unassigned} participant(s)`)
      setSelectedParticipants(new Set())
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to unassign participants')
    } finally {
      setIsAssigning(false)
    }
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Assign Participants</h1>
            <p className="text-gray-600 mt-1">Exam: {exam.title}</p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Total Participants</p>
          <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Assigned</p>
          <p className="text-2xl font-bold text-[#C0392B]">{assignedParticipants.size}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
          <p className="text-sm text-gray-600">Selected</p>
          <p className="text-2xl font-bold text-blue-600">{selectedParticipants.size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, school, or team..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
              >
                <option value="">All Teams</option>
                {uniqueTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
              >
                <option value="">All Schools</option>
                {uniqueSchools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white text-sm"
              >
                <option value="">All Roles</option>
                <option value="participant1">Participant 1</option>
                <option value="participant2">Participant 2</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
          />
          <span className="text-sm text-gray-600">
            Select All ({filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleAssign}
            isLoading={isAssigning}
            disabled={selectedParticipants.size === 0}
          >
            Assign Selected ({selectedParticipants.size})
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={handleUnassign}
            isLoading={isAssigning}
            disabled={selectedParticipants.size === 0}
          >
            Unassign Selected ({selectedParticipants.size})
          </Button>
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No participants found
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => {
                  const isAssigned = assignedParticipants.has(participant.id)
                  const isSelected = selectedParticipants.has(participant.id)
                  return (
                    <tr key={participant.id} className={isSelected ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectParticipant(participant.id, e.target.checked)}
                          className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {participant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.school_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.teams?.team_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            participant.is_participant1
                              ? 'bg-[#C0392B]/10 text-[#C0392B]'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {participant.is_participant1 ? 'Participant 1' : 'Participant 2'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAssigned ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Assigned
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Not Assigned
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

