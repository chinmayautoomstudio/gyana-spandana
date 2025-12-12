'use client'

import { useState } from 'react'
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
import { useSearchParams } from 'next/navigation'

const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  passing_score: z.number().optional().nullable(),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
})

type ExamFormData = z.infer<typeof examSchema>

export default function NewExamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    searchParams.get('questionSetId')
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
  })

  const onSubmit = async (data: ExamFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
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
        router.push('/dashboard')
        return
      }

      const examData = {
        title: data.title,
        description: data.description || null,
        duration_minutes: data.duration_minutes,
        passing_score: data.passing_score || null,
        scheduled_start: data.scheduled_start ? new Date(data.scheduled_start).toISOString() : null,
        scheduled_end: data.scheduled_end ? new Date(data.scheduled_end).toISOString() : null,
        status: 'draft',
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

      // Validate that questions are selected
      if (selectedQuestionIds.length === 0) {
        throw new Error('Please select at least one question or a question set')
      }

      // Assign selected questions to the exam
      if (selectedQuestionIds.length > 0) {
        const questionUpdates = selectedQuestionIds.map((questionId, index) => ({
          id: questionId,
          exam_id: exam.id,
          order_index: index + 1,
        }))

        // Update each question to assign it to the exam
        for (const update of questionUpdates) {
          const { error: updateError } = await supabase
            .from('questions')
            .update({ exam_id: update.exam_id, order_index: update.order_index })
            .eq('id', update.id)

          if (updateError) {
            console.error(`Error assigning question ${update.id}:`, updateError)
            // Continue with other questions even if one fails
          }
        }
      }

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Start
            </label>
            <input
              type="datetime-local"
              {...register('scheduled_start')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled End
            </label>
            <input
              type="datetime-local"
              {...register('scheduled_end')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent text-gray-900 bg-white"
            />
          </div>
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
          <Link href="/admin/exams">
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>
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

