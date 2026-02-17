'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createTeamAndInviteP2 } from '@/app/actions/team'
import { teamCreationSchema, type TeamCreationFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function TeamCreatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const { register, handleSubmit, formState: { errors } } = useForm<TeamCreationFormData>({
    resolver: zodResolver(teamCreationSchema),
    defaultValues: {
      schoolAuthority: { name: '', email: '', phone: '' },
    },
  })

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?message=Please sign in to create your team')
        return
      }
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (participant) {
        router.replace('/dashboard')
        return
      }
      setIsChecking(false)
    }
    check()
  }, [router])

  const onSubmit = async (data: TeamCreationFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    const result = await createTeamAndInviteP2(data)
    if (result.success) {
      router.push('/dashboard?invitation_sent=1')
      return
    }
    setSubmitError(result.error)
    setIsSubmitting(false)
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your team</h1>
          <p className="text-gray-600 text-sm mb-6">
            Enter your team details and invite your teammate. They will receive an email to complete registration.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Your full name"
              {...register('p1Name')}
              error={errors.p1Name?.message}
              placeholder="Enter your name"
              required
            />
            <Input
              label="Team name"
              {...register('teamName')}
              error={errors.teamName?.message}
              placeholder="Enter team name"
              required
            />
            <Input
              label="School / College name"
              {...register('schoolName')}
              error={errors.schoolName?.message}
              placeholder="Enter school or college name"
              required
            />
            <Input
              label="Participant 2 email address"
              type="email"
              {...register('p2Email')}
              error={errors.p2Email?.message}
              placeholder="teammate@example.com"
              required
            />

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">School/College Authority (optional)</h3>
              <div className="space-y-4">
                <Input
                  label="Authority name"
                  {...register('schoolAuthority.name')}
                  error={errors.schoolAuthority?.name?.message}
                  placeholder="e.g. Principal, Coordinator"
                />
                <Input
                  label="Authority email"
                  type="email"
                  {...register('schoolAuthority.email')}
                  error={errors.schoolAuthority?.email?.message}
                  placeholder="authority@school.com"
                />
                <Input
                  label="Authority phone"
                  type="tel"
                  {...register('schoolAuthority.phone')}
                  error={errors.schoolAuthority?.phone?.message}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="consent"
                {...register('consent')}
                className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
                I agree to the{' '}
                <Link href="/terms" className="text-[#C0392B] hover:underline">Terms and Conditions</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[#C0392B] hover:underline">Privacy Policy</Link>.
                {errors.consent && (
                  <span className="block text-red-600 mt-1">{errors.consent.message}</span>
                )}
              </label>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{submitError}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Creating team..."
              className="w-full bg-gray-900 hover:bg-gray-800"
            >
              Create team and send invitation
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-gray-600 text-sm">
          <Link href="/dashboard" className="text-[#C0392B] hover:underline">Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
