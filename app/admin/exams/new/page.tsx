'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { QuestionSelectionModal } from '@/components/admin/QuestionSelectionModal'
import { QuestionSetSelector } from '@/components/admin/QuestionSetSelector'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'

interface Team {
  id: string
  team_name: string
  team_code: string
  participant_count: number
}

/** Detach questions and remove exam so a failed team assignment never leaves a public unrestricted exam. */
async function rollbackExamAfterFailedTeamAssignment(
  supabase: ReturnType<typeof createClient>,
  examId: string,
  assignedQuestionIds: string[]
) {
  if (assignedQuestionIds.length > 0) {
    const { error } = await supabase
      .from('questions')
      .update({ exam_id: null, order_index: null })
      .eq('exam_id', examId)
      .in('id', assignedQuestionIds)
    if (error) {
      console.error('Rollback: failed to detach questions from exam', error)
    }
  }
  const { error: deleteError } = await supabase.from('exams').delete().eq('id', examId)
  if (deleteError) {
    console.error('Rollback: failed to delete exam after team assignment failure', deleteError)
    throw new Error(
      `Team assignment failed and cleanup could not delete the draft exam (id: ${examId}). Fix assignments manually or delete the exam in admin.`
    )
  }
}

const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  passing_score: z.number().optional().nullable(),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
  questions_per_participant: z.number().min(1).optional().nullable(),
})

type ExamFormData = z.infer<typeof examSchema>

export default function NewExamPage() {
  const router = useRouter()
  const { setIsBlocking, confirmOrRun } = useUnsavedChangesGuard()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  
  // Initialize selectedSetId from URL query parameter using client-side parsing
  const getQuestionSetIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      return searchParams.get('questionSetId')
    }
    return null
  }
  
  const [selectedSetId, setSelectedSetId] = useState<string | null>(getQuestionSetIdFromUrl())
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [availabilityMode, setAvailabilityMode] = useState<'now' | 'scheduled'>('now')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
  })

  const watchedValues = watch()
  const questionsPerParticipant = watch('questions_per_participant')
  const hasUnsavedChanges = useMemo(() => {
    const hasFormContent = Boolean(
      watchedValues.title?.trim() ||
        watchedValues.description?.trim() ||
        watchedValues.duration_minutes ||
        watchedValues.passing_score ||
        watchedValues.scheduled_start ||
        watchedValues.scheduled_end ||
        watchedValues.questions_per_participant
    )

    return (
      isDirty ||
      hasFormContent ||
      selectedQuestionIds.length > 0 ||
      selectedTeamIds.length > 0 ||
      Boolean(selectedSetId) ||
      availabilityMode !== 'now'
    )
  }, [availabilityMode, isDirty, selectedQuestionIds.length, selectedSetId, selectedTeamIds.length, watchedValues])

  useEffect(() => {
    setIsBlocking(hasUnsavedChanges && !isSubmitting)
    return () => setIsBlocking(false)
  }, [hasUnsavedChanges, isSubmitting, setIsBlocking])

  // Update selectedSetId when URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const questionSetId = searchParams.get('questionSetId')
      setSelectedSetId(questionSetId)
    }

    // Listen for URL changes (browser back/forward navigation)
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        const questionSetId = searchParams.get('questionSetId')
        setSelectedSetId(questionSetId)
      }
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const supabase = createClient()
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, team_name, team_code, participants(id)')
          .order('team_name')

        if (teamsError) {
          console.error('Error fetching teams:', teamsError)
          return
        }

        // Transform data to include participant count
        const teamsWithCounts: Team[] = (teamsData || []).map((team: any) => ({
          id: team.id,
          team_name: team.team_name,
          team_code: team.team_code,
          participant_count: team.participants?.length || 0,
        }))

        setTeams(teamsWithCounts)
      } catch (err) {
        console.error('Error fetching teams:', err)
      } finally {
        setLoadingTeams(false)
      }
    }

    fetchTeams()
  }, [])

  // Filter teams based on search term
  const filteredTeams = teams.filter((team) =>
    team.team_name.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    team.team_code.toLowerCase().includes(teamSearchTerm.toLowerCase())
  )

  // Handle team selection
  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    )
  }

  // Handle select all teams
  const handleSelectAllTeams = () => {
    if (selectedTeamIds.length === filteredTeams.length) {
      setSelectedTeamIds([])
    } else {
      setSelectedTeamIds(filteredTeams.map((team) => team.id))
    }
  }

  const onSubmit = async (data: ExamFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsBlocking(false)
        router.push('/login')
        return
      }

      // Verify admin role from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const role = profile?.role || user.user_metadata?.role || 'participant'
      if (role !== 'admin') {
        setError('Unauthorized: Only admins can create exams')
        setIsBlocking(false)
        router.push('/dashboard')
        return
      }

      // Validate that questions are selected
      if (selectedQuestionIds.length === 0) {
        throw new Error('Please select at least one question or a question set')
      }

      // Validate questions_per_participant if provided
      if (data.questions_per_participant !== null && data.questions_per_participant !== undefined) {
        if (data.questions_per_participant < 1) {
          throw new Error('Questions per participant must be at least 1')
        }
        if (data.questions_per_participant > selectedQuestionIds.length) {
          throw new Error(`Questions per participant (${data.questions_per_participant}) cannot exceed total questions selected (${selectedQuestionIds.length})`)
        }
      }

      // Validate scheduled exams
      if (availabilityMode === 'scheduled') {
        if (!data.scheduled_start || !data.scheduled_end) {
          throw new Error('Scheduled start and end times are required when scheduling an exam')
        }
        if (new Date(data.scheduled_end) <= new Date(data.scheduled_start)) {
          throw new Error('Scheduled end time must be after start time')
        }
      }

      // Determine status based on availability mode
      let examStatus: 'draft' | 'active' | 'scheduled' = 'draft'
      if (availabilityMode === 'now') {
        examStatus = 'active'
      } else if (availabilityMode === 'scheduled' && data.scheduled_start && data.scheduled_end) {
        const now = new Date()
        const start = new Date(data.scheduled_start)
        if (start <= now) {
          examStatus = 'active'  // Scheduled time has passed, activate immediately
        } else {
          examStatus = 'scheduled'
        }
      }

      const examData = {
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes,
        passing_score: data.passing_score || null,
        total_questions: selectedQuestionIds.length,
        questions_per_participant: data.questions_per_participant || null,
        scheduled_start: data.scheduled_start ? new Date(data.scheduled_start).toISOString() : null,
        scheduled_end: data.scheduled_end ? new Date(data.scheduled_end).toISOString() : null,
        status: examStatus,
        created_by: user.id,
      }

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single()

      if (examError) {
        throw new Error(examError.message)
      }

      // Assign selected questions to the exam
      if (selectedQuestionIds.length > 0) {
        const questionUpdates = selectedQuestionIds.map((questionId, index) => ({
          id: questionId,
          exam_id: exam.id,
          order_index: index + 1,
        }))

        // Track failed assignments
        const failedAssignments: string[] = []
        const failedErrors: Array<{ id: string; error: any }> = []

        // Update each question to assign it to the exam
        for (const update of questionUpdates) {
          const { error: updateError } = await supabase
            .from('questions')
            .update({ exam_id: update.exam_id, order_index: update.order_index })
            .eq('id', update.id)

          if (updateError) {
            console.error(`Error assigning question ${update.id}:`, updateError)
            failedAssignments.push(update.id)
            failedErrors.push({ id: update.id, error: updateError })
            // Continue with other questions even if one fails
          }
        }

        // Report failed assignments
        if (failedAssignments.length > 0) {
          const errorMessage = `Warning: ${failedAssignments.length} out of ${selectedQuestionIds.length} question(s) failed to assign to exam.`
          console.error(errorMessage, {
            failedIds: failedAssignments,
            errors: failedErrors
          })
          
          // Show warning to user
          alert(`${errorMessage}\n\nFailed question IDs: ${failedAssignments.slice(0, 5).join(', ')}${failedAssignments.length > 5 ? '...' : ''}\n\nPlease check the exam questions page and manually assign any missing questions.`)
        } else {
          console.log(`Successfully assigned all ${selectedQuestionIds.length} questions to exam ${exam.id}`)
        }
      }

      // Assign participants from selected teams (required when teams are selected — avoids a public exam)
      if (selectedTeamIds.length > 0) {
        const teamAssignErrorAlreadyRolledBack = (e: unknown) =>
          e instanceof Error &&
          (/Could not load participants for the selected teams|No participants found in the selected teams|Could not assign participants to the exam|cleanup could not delete the draft exam/.test(
            e.message
          ))

        try {
          const { data: participants, error: participantsError } = await supabase
            .from('participants')
            .select('id, team_id, teams(id, team_name)')
            .in('team_id', selectedTeamIds)

          if (participantsError) {
            console.error('Error fetching participants:', participantsError)
            await rollbackExamAfterFailedTeamAssignment(
              supabase,
              exam.id,
              selectedQuestionIds
            )
            throw new Error(
              `Could not load participants for the selected teams: ${participantsError.message}`
            )
          }

          if (!participants || participants.length === 0) {
            await rollbackExamAfterFailedTeamAssignment(
              supabase,
              exam.id,
              selectedQuestionIds
            )
            throw new Error(
              'No participants found in the selected teams. Add members to those teams, or clear team selection to create a public exam.'
            )
          }

          const teamsWithParticipants = new Set(participants.map((p: { team_id: string }) => p.team_id))
          const teamsWithoutParticipants = selectedTeamIds.filter(
            (teamId) => !teamsWithParticipants.has(teamId)
          )

          if (teamsWithoutParticipants.length > 0) {
            const teamNames = teamsWithoutParticipants
              .map((teamId) => teams.find((t) => t.id === teamId)?.team_name)
              .filter(Boolean)
              .join(', ')
            console.warn(`Teams without participants: ${teamNames}`)
          }

          const assignments = participants.map((participant: { id: string }) => ({
            exam_id: exam.id,
            participant_id: participant.id,
            assigned_by: user.id,
          }))

          const { data: assignedData, error: assignError } = await supabase
            .from('exam_participants')
            .upsert(assignments, {
              onConflict: 'exam_id,participant_id',
              ignoreDuplicates: true,
            })
            .select()

          if (assignError) {
            console.error('Error assigning participants:', assignError)
            await rollbackExamAfterFailedTeamAssignment(
              supabase,
              exam.id,
              selectedQuestionIds
            )
            throw new Error(
              `Could not assign participants to the exam: ${assignError.message}`
            )
          }

          const assignedCount = assignedData?.length || 0
          const skippedCount = participants.length - assignedCount
          if (skippedCount > 0) {
            console.info(`${skippedCount} participant(s) were already assigned to this exam`)
          }

          const participantIdsForInvite = [
            ...new Set(participants.map((p: { id: string }) => p.id)),
          ]
          try {
            const inviteRes = await fetch(
              `/api/admin/exams/${exam.id}/send-invitations`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantIds: participantIdsForInvite }),
              }
            )
            const inviteJson = (await inviteRes.json().catch(() => ({}))) as {
              error?: string
              failed?: number
              errors?: string[]
              success?: boolean
            }
            if (!inviteRes.ok) {
              const detail = inviteJson.error || `HTTP ${inviteRes.status}`
              sessionStorage.setItem(
                'examInviteWarning',
                `Exam created, but invitation emails could not be sent: ${detail}. Use Send invitations on the exam page to retry.`
              )
            } else if ((inviteJson.failed ?? 0) > 0 || inviteJson.success === false) {
              const detail =
                inviteJson.errors?.join('; ') ||
                `${inviteJson.failed ?? 0} failed`
              sessionStorage.setItem(
                'examInviteWarning',
                `Exam created, but some invitation emails failed (${detail}). Use Send invitations on the exam page to retry.`
              )
            }
          } catch (inviteErr) {
            console.error('Auto-send exam invitations failed:', inviteErr)
            sessionStorage.setItem(
              'examInviteWarning',
              'Exam created, but invitation emails could not be sent. Use Send invitations on the exam page to retry.'
            )
          }
        } catch (teamAssignError: unknown) {
          if (!teamAssignErrorAlreadyRolledBack(teamAssignError)) {
            await rollbackExamAfterFailedTeamAssignment(
              supabase,
              exam.id,
              selectedQuestionIds
            )
          }
          throw teamAssignError
        }
      }

      setIsBlocking(false)
      router.push(`/admin/exams/${exam.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create exam')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/exams"
          onClick={(event) => {
            event.preventDefault()
            confirmOrRun(() => router.push('/admin/exams'))
          }}
          className="text-[#C0392B] hover:text-[#A93226] flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Exams
        </Link>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Create New Exam</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8 space-y-6">
        <div>
          <Input
            label="Exam Title *"
            {...register('title')}
            error={errors.title?.message}
            placeholder="e.g., Odisha Culture Quiz - Round 1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
            placeholder="Enter exam description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Duration (minutes) *"
              type="number"
              {...register('duration_minutes', { valueAsNumber: true })}
              error={errors.duration_minutes?.message}
              placeholder="60"
              required
            />
          </div>

          <div>
            <Input
              label="Passing Score (optional)"
              type="number"
              {...register('passing_score', { valueAsNumber: true })}
              error={errors.passing_score?.message}
              placeholder="50"
            />
          </div>
        </div>

        <div>
          <Input
            label="Questions Per Participant (optional)"
            type="number"
            {...register('questions_per_participant', { valueAsNumber: true })}
            error={errors.questions_per_participant?.message}
            placeholder="Leave empty to use all questions (shuffled)"
          />
          {selectedQuestionIds.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Each participant will get {questionsPerParticipant || selectedQuestionIds.length} random question{questionsPerParticipant === 1 || (!questionsPerParticipant && selectedQuestionIds.length === 1) ? '' : 's'} from {selectedQuestionIds.length} total question{selectedQuestionIds.length !== 1 ? 's' : ''} (shuffled differently per participant)
            </p>
          )}
        </div>

        {/* Exam Availability Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Availability *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAvailabilityMode('now')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  availabilityMode === 'now'
                    ? 'border-[#C0392B] bg-[#C0392B]/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-1">Create & Activate Now</h3>
                <p className="text-sm text-gray-600">Exam starts immediately and is available to participants right away</p>
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityMode('scheduled')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  availabilityMode === 'scheduled'
                    ? 'border-[#C0392B] bg-[#C0392B]/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-1">Schedule for Later</h3>
                <p className="text-sm text-gray-600">Set specific start and end times for the exam</p>
              </button>
            </div>
          </div>

          {availabilityMode === 'scheduled' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Start *
                </label>
                <input
                  type="datetime-local"
                  {...register('scheduled_start')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
                  required={availabilityMode === 'scheduled'}
                />
                {errors.scheduled_start && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduled_start.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled End *
                </label>
                <input
                  type="datetime-local"
                  {...register('scheduled_end')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
                  required={availabilityMode === 'scheduled'}
                />
                {errors.scheduled_end && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduled_end.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Selection Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Questions
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Choose a question set or select individual questions from the question bank
            </p>
          </div>

          {/* Question Set Selector */}
          <QuestionSetSelector
            selectedSetId={selectedSetId}
            onSelectSet={(setId) => {
              setSelectedSetId(setId)
              // Clear individual selections when set is selected
              if (setId) {
                setSelectedQuestionIds([])
              }
            }}
            onQuestionsLoaded={(questionIds) => {
              // When a set is selected, load its questions
              if (selectedSetId) {
                setSelectedQuestionIds(questionIds)
              }
            }}
            onCreateQuestionSetClick={(event) => {
              event.preventDefault()
              confirmOrRun(() => router.push('/admin/question-sets'))
            }}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Individual Question Selection */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Individual Questions
              </label>
              <p className="text-sm text-gray-500">
                {selectedQuestionIds.length > 0
                  ? `${selectedQuestionIds.length} question${selectedQuestionIds.length !== 1 ? 's' : ''} selected`
                  : 'No questions selected. Click "Select Questions" to add questions from the question bank.'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setShowQuestionModal(true)
                // Clear set selection when selecting individual questions
                setSelectedSetId(null)
              }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {selectedQuestionIds.length > 0 ? 'Change Questions' : 'Select Questions'}
            </Button>
          </div>
        </div>

        {/* Team Selection Section */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Teams (Optional)
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Select teams to automatically assign all participants from those teams to this exam
            </p>
          </div>

          {loadingTeams ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C0392B]"></div>
              <span className="ml-2 text-sm text-gray-600">Loading teams...</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">No teams available</p>
            </div>
          ) : (
            <>
              {/* Team Search */}
              <div>
                <input
                  type="text"
                  value={teamSearchTerm}
                  onChange={(e) => setTeamSearchTerm(e.target.value)}
                  placeholder="Search teams by name or code..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white placeholder:text-gray-400"
                />
              </div>

              {/* Select All Teams */}
              {filteredTeams.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.length === filteredTeams.length && filteredTeams.length > 0}
                      onChange={handleSelectAllTeams}
                      className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All Teams ({filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  {selectedTeamIds.length > 0 && (
                    <span className="text-sm text-[#C0392B] font-medium">
                      {selectedTeamIds.length} selected
                    </span>
                  )}
                </div>
              )}

              {/* Teams List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                {filteredTeams.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No teams match your search
                  </div>
                ) : (
                  filteredTeams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id)
                    return (
                      <label
                        key={team.id}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-[#C0392B]/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTeamToggle(team.id)}
                          className="w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{team.team_name}</span>
                            {team.team_code && (
                              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                {team.team_code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {team.participant_count === 0 ? (
                              <span className="text-yellow-600">No participants</span>
                            ) : (
                              <span>{team.participant_count} participant{team.participant_count !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-[#C0392B]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </label>
                    )
                  })
                )}
              </div>

              {/* Selected Teams Summary */}
              {selectedTeamIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedTeamIds.length}</strong> team{selectedTeamIds.length !== 1 ? 's' : ''} selected.
                    All participants from these teams will be assigned to this exam.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
          >
            Create Exam
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => confirmOrRun(() => router.push('/admin/exams'))}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Question Selection Modal */}
      <QuestionSelectionModal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        onSelect={setSelectedQuestionIds}
        selectedQuestionIds={selectedQuestionIds}
      />
    </div>
  )
}

