'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface Participant {
  id: string
  name: string
  email: string
  school_name: string
  teams?: {
    team_name: string
    team_code: string
  } | null
}

interface ExamInvitationModalProps {
  isOpen: boolean
  onClose: () => void
  examId: string
  examTitle: string
  examDuration: number
  scheduledStart?: string | null
  scheduledEnd?: string | null
  participants: Participant[]
  onSuccess?: () => void
}

export const ExamInvitationModal: React.FC<ExamInvitationModalProps> = ({
  isOpen,
  onClose,
  examId,
  examTitle,
  examDuration,
  scheduledStart,
  scheduledEnd,
  participants,
  onSuccess
}) => {
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set())

  // Initialize with all participants selected
  useEffect(() => {
    if (isOpen && participants.length > 0) {
      setSelectedParticipants(new Set(participants.map(p => p.id)))
    }
  }, [isOpen, participants])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedParticipants(new Set())
      setCustomMessage('')
      setSending(false)
      setSentCount(0)
      setFailedCount(0)
      setErrors([])
      setCopiedLinks(new Set())
    }
  }, [isOpen])

  const handleSelectParticipant = (participantId: string, selected: boolean) => {
    setSelectedParticipants(prev => {
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
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set())
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.id)))
    }
  }

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

  const openExamLink = (participantId: string) => {
    const examUrl = generateExamUrl(participantId)
    window.open(examUrl, '_blank')
  }

  const handleSendInvitations = async () => {
    if (selectedParticipants.size === 0) {
      setErrors(['Please select at least one participant'])
      return
    }

    setSending(true)
    setErrors([])
    setSentCount(0)
    setFailedCount(0)

    try {
      const response = await fetch(`/api/admin/exams/${examId}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: Array.from(selectedParticipants),
          customMessage: customMessage.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Failed to send invitations')
      }

      const result = await response.json()
      setSentCount(result.sent || 0)
      setFailedCount(result.failed || 0)
      
      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors)
      }

      if (result.success && onSuccess) {
        onSuccess()
      }

      // Auto-close after 3 seconds if successful
      if (result.success && result.failed === 0) {
        setTimeout(() => {
          onClose()
        }, 3000)
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to send invitations'])
      setFailedCount(selectedParticipants.size)
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  const selectedParticipantsList = participants.filter(p => selectedParticipants.has(p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Send Exam Invitations</h2>
              <p className="text-gray-600 mt-1">
                {selectedParticipants.size} participant{selectedParticipants.size !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Exam Details */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Exam Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Exam Title</p>
              <p className="font-medium text-gray-900">{examTitle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">{examDuration} minutes</p>
            </div>
            {scheduledStart && (
              <div>
                <p className="text-sm text-gray-500">Start Time</p>
                <p className="font-medium text-gray-900">{formatDate(scheduledStart)}</p>
              </div>
            )}
            {scheduledEnd && (
              <div>
                <p className="text-sm text-gray-500">End Time</p>
                <p className="font-medium text-gray-900">{formatDate(scheduledEnd)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Message */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
            rows={3}
            placeholder="Add a personalized message for all participants..."
          />
        </div>

        {/* Participants List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Participants</h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-[#C0392B] hover:text-[#A93226] font-medium"
            >
              {selectedParticipants.size === participants.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {participants.map((participant) => {
              const isSelected = selectedParticipants.has(participant.id)
              const examUrl = generateExamUrl(participant.id)
              
              return (
                <div
                  key={participant.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected ? 'border-[#C0392B] bg-[#C0392B]/5' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectParticipant(participant.id, e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{participant.name}</p>
                          <p className="text-sm text-gray-600">{participant.email}</p>
                          {participant.school_name && (
                            <p className="text-xs text-gray-500 mt-1">{participant.school_name}</p>
                          )}
                          {participant.teams?.team_name && (
                            <p className="text-xs text-gray-500">Team: {participant.teams.team_name}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyExamLink(participant.id)}
                            className="p-2 text-gray-600 hover:text-[#C0392B] transition-colors"
                            title="Copy link"
                          >
                            {copiedLinks.has(participant.id) ? (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => openExamLink(participant.id)}
                            className="p-2 text-gray-600 hover:text-[#C0392B] transition-colors"
                            title="Open in new tab"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <p className="text-gray-600 font-mono break-all">{examUrl}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Results */}
        {(sentCount > 0 || failedCount > 0) && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Sending Results</h3>
            <div className="space-y-2">
              {sentCount > 0 && (
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{failedCount} invitation{failedCount !== 1 ? 's' : ''} failed</span>
                </div>
              )}
              {errors.length > 0 && (
                <div className="mt-2">
                  {errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">• {error}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-4 justify-end">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {sentCount > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSendInvitations}
            disabled={sending || selectedParticipants.size === 0}
            isLoading={sending}
          >
            {sending ? (
              'Sending...'
            ) : (
              `Send ${selectedParticipants.size} Invitation${selectedParticipants.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ExamInvitationModal
