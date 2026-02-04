'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface Participant {
  id: string
  name: string
  email: string
  is_participant1?: boolean
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

interface ParticipantExamLinksProps {
  examId: string
  examTitle: string
  className?: string
}

export const ParticipantExamLinks: React.FC<ParticipantExamLinksProps> = ({
  examId,
  examTitle,
  className = ''
}) => {
  const [participants, setParticipants] = useState<AssignedParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch(`/api/admin/exams/${examId}/participants`)
        if (response.ok) {
          const { assignments } = await response.json()
          setParticipants(assignments || [])
        }
      } catch (error) {
        console.error('Error fetching participants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchParticipants()
  }, [examId])

  const generateExamUrl = (participantId: string) => {
    const siteUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return `${siteUrl}/exams/${examId}/take`
  }

  const copyExamLink = async (participantId: string) => {
    const examUrl = generateExamUrl(participantId)
    try {
      await navigator.clipboard.writeText(examUrl)
      setCopiedLinks(prev => {
        const newSet = new Set(prev)
        newSet.add(participantId)
        return newSet
      })
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev)
          newSet.delete(participantId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Group participants by team
  const groupedByTeam = participants.reduce((acc, assignment) => {
    const teamId = assignment.participant.teams?.team_name || 'No Team'
    if (!acc[teamId]) {
      acc[teamId] = {
        teamName: assignment.participant.teams?.team_name || 'No Team',
        teamCode: assignment.participant.teams?.team_code || '',
        participants: []
      }
    }
    acc[teamId].participants.push(assignment)
    return acc
  }, {} as Record<string, { teamName: string; teamCode: string; participants: AssignedParticipant[] }>)

            // Sort participants within each team (Participant 1 first)
  Object.keys(groupedByTeam).forEach(teamId => {
    groupedByTeam[teamId].participants.sort((a, b) => {
      const aIsP1 = a.participant.is_participant1 ?? false
      const bIsP1 = b.participant.is_participant1 ?? false
      if (aIsP1 && !bIsP1) return -1
      if (!aIsP1 && bIsP1) return 1
      return 0
    })
  })

  if (loading) {
    return (
      <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
        </div>
      </div>
    )
  }

  if (participants.length === 0) {
    return (
      <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Participant Exam Links</h3>
        <p className="text-sm text-gray-600">
          No participants assigned to this exam yet. Assign participants to generate individual exam links.
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Participant Exam Links</h3>
      <p className="text-sm text-gray-600 mb-4">
        Each participant takes the exam individually. Team scores are calculated by summing both participants' scores.
      </p>

      <div className="space-y-6">
        {Object.values(groupedByTeam).map((team, teamIndex) => (
          <div key={teamIndex} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#C0392B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h4 className="font-semibold text-gray-900">
                {team.teamName}
                {team.teamCode && <span className="text-gray-500 ml-2">({team.teamCode})</span>}
              </h4>
            </div>

            <div className="space-y-3">
              {team.participants.map((assignment) => {
                const participant = assignment.participant
                const examUrl = generateExamUrl(participant.id)
                const isCopied = copiedLinks.has(participant.id)

                return (
                  <div
                    key={participant.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {participant.is_participant1 !== undefined && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              participant.is_participant1
                                ? 'bg-[#C0392B]/10 text-[#C0392B]'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {participant.is_participant1 ? 'Participant 1' : 'Participant 2'}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-600">{participant.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 max-w-xs">
                          <code className="text-xs text-gray-900 break-all">{examUrl}</code>
                        </div>
                        <Button
                          variant={isCopied ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => copyExamLink(participant.id)}
                          className="flex-shrink-0"
                        >
                          {isCopied ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Each participant must take the exam individually using their own account</li>
              <li>Team scores are automatically calculated by summing both participants' individual scores</li>
              <li>Participants must be logged in to access their exam link</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParticipantExamLinks
