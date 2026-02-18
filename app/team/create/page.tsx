'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createTeamAndInviteP2 } from '@/app/actions/team'
import { teamCreationSchema, type TeamCreationFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { User } from '@supabase/supabase-js'

const STEPS = 2

function getP1NameFromUser(user: User): string {
  const m = user.user_metadata
  if (m?.full_name && typeof m.full_name === 'string') return m.full_name.trim()
  if (m?.name && typeof m.name === 'string') return m.name.trim()
  const given = m?.given_name ?? ''
  const family = m?.family_name ?? ''
  return [given, family].filter(Boolean).join(' ').trim()
}

function getAvatarUrl(user: User): string | null {
  const m = user.user_metadata
  const url = m?.avatar_url ?? m?.picture
  return typeof url === 'string' && url ? url : null
}

export default function TeamCreatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState(1)
  const formRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, formState: { errors }, reset, trigger } = useForm<TeamCreationFormData>({
    resolver: zodResolver(teamCreationSchema),
    defaultValues: {
      schoolAuthority: { name: '', email: '', phone: '' },
    },
  })

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/login?message=Please sign in to create your team')
        return
      }
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('user_id', authUser.id)
        .single()
      if (participant) {
        router.replace('/dashboard')
        return
      }
      setUser(authUser)
      const p1Name = getP1NameFromUser(authUser)
      reset({
        p1Name: p1Name || '',
        teamName: '',
        schoolName: '',
        p2Email: '',
        schoolAuthority: { name: '', email: '', phone: '' },
        consent: false,
      })
      setIsChecking(false)
    }
    check()
  }, [router, reset])

  const onStepNext = async () => {
    if (step === 1) {
      const ok = await trigger(['p1Name', 'teamName', 'schoolName', 'p2Email'])
      if (!ok) return
    }
    setStep((s) => Math.min(s + 1, STEPS))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onStepBack = () => {
    setStep((s) => Math.max(s - 1, 1))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const avatarUrl = user ? getAvatarUrl(user) : null

  return (
    <div className="min-h-screen bg-[#ECF0F1] py-12 px-4">
      <div className="max-w-xl mx-auto" ref={formRef}>
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your team</h1>
              <p className="text-gray-600 text-sm mb-1">
                Enter your team details and invite your teammate. They will receive an email to complete registration.
              </p>
              {user?.email && (
                <p className="text-sm text-gray-500">
                  Registered as: <span className="font-medium text-gray-700">{user.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-gray-600">Step {step} of {STEPS}</span>
            <div className="flex-1 flex gap-1">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#C0392B]' : 'bg-gray-200'}`}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Team & your info */}
            {step === 1 && (
              <div className="space-y-4">
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
              </div>
            )}

            {/* Step 2: Authority (optional) + Terms & submit */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">School/College Authority (optional)</h3>
                <p className="text-sm text-gray-500">You can skip this section if you don&apos;t have authority details.</p>
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
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3">
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
                </div>
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{submitError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onStepBack}
                  className="flex-1"
                >
                  Back
                </Button>
              ) : (
                <div className="flex-1" />
              )}
              {step < STEPS ? (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={onStepNext}
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  loadingText="Creating team..."
                  className="flex-1 bg-gray-900 hover:bg-gray-800"
                >
                  Create team and send invitation
                </Button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-gray-600 text-sm">
          <Link href="/dashboard" className="text-[#C0392B] hover:underline">Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
