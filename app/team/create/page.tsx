'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { createTeamAndInviteP2, checkTeamNameAvailability } from '@/app/actions/team'
import { teamCreationSchema, TEAM_NAME_MAX_LENGTH, type TeamCreationFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { carouselSlides } from '@/lib/constants/carousel'
import type { User } from '@supabase/supabase-js'

const Carousel = dynamic(
  () => import('@/components/ui/Carousel').then((m) => ({ default: m.Carousel })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        <span className="text-white/60">Loading...</span>
      </div>
    ),
  }
)

const STEPS = 3

function formatAadhar(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const dobMax = new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]
const dobMin = new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]

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

  const { register, handleSubmit, formState: { errors }, reset, trigger, getValues, setError } = useForm<TeamCreationFormData>({
    resolver: zodResolver(teamCreationSchema),
    defaultValues: {
      p1Gender: '' as TeamCreationFormData['p1Gender'],
      p1Phone: '',
      p1Aadhar: '',
      p1Class: '' as TeamCreationFormData['p1Class'],
      p1DateOfBirth: '',
      schoolAuthority: { name: '', email: '', phone: '' },
    },
  })

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/login?message=Please check your email to complete your registration')
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
      const emailToCheck = (authUser.email ?? (authUser.user_metadata?.email as string | undefined))?.trim().toLowerCase()
      if (emailToCheck) {
        const { checkPendingInvitationForEmail } = await import('@/app/actions/team')
        const pending = await checkPendingInvitationForEmail(emailToCheck)
        if (pending.hasPending) {
          router.replace(`/register/invite/${pending.token}`)
          return
        }
      }
      setUser(authUser)
      const p1Name = getP1NameFromUser(authUser)
      reset({
        p1Name: p1Name || '',
        teamName: '',
        schoolName: '',
        p2Email: '',
        p1Gender: '' as TeamCreationFormData['p1Gender'],
        p1Phone: '',
        p1Aadhar: '',
        p1Class: '' as TeamCreationFormData['p1Class'],
        p1DateOfBirth: '',
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
      const nameResult = await checkTeamNameAvailability(getValues('teamName'))
      if (!nameResult.available) {
        setError('teamName', { type: 'manual', message: nameResult.error })
        return
      }
      const p2Email = getValues('p2Email')?.trim().toLowerCase()
      const p1Email = (user?.email ?? user?.user_metadata?.email as string | undefined)?.trim().toLowerCase()
      if (p1Email && p2Email === p1Email) {
        setError('p2Email', { type: 'manual', message: 'Participant 2 must use a different email address than yours.' })
        return
      }
    }
    if (step === 2) {
      const ok = await trigger(['p1Gender', 'p1Phone', 'p1Aadhar', 'p1Class', 'p1DateOfBirth'])
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
    console.log('[TeamCreate] Submitting form data:', { teamName: data.teamName, p2Email: data.p2Email })
    try {
      const result = await createTeamAndInviteP2(data)
      console.log('[TeamCreate] Server action result:', result)
      if (result.success) {
        console.log('[TeamCreate] Success — navigating to dashboard...')
        router.push('/dashboard?invitation_sent=1')
        return
      }
      setSubmitError(result.error)
    } catch (err) {
      console.error('[TeamCreate] Server action threw an exception:', err)
      setSubmitError('Something went wrong. Please try again.')
    }
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Carousel (60%) - same as login */}
      <div className="hidden lg:flex lg:w-[60%] relative">
        <Carousel slides={carouselSlides} />
      </div>

      {/* Right side - Form (40%) */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md" ref={formRef}>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-full border-2 border-gray-200 overflow-hidden flex-shrink-0 bg-white flex items-center justify-center shadow-sm">
                  <Image
                    src="/images/logo.webp"
                    alt="GYANA SPARDHA"
                    width={52}
                    height={52}
                    className="object-contain"
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Create your team</h1>
              </div>
              <p className="text-gray-600 mb-4">
                Enter your team details and invite your teammate. They will receive an email to complete registration.
              </p>
            </div>

            <div className="flex items-start gap-4 mb-6">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
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
                {[1, 2, 3].map((i) => (
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
                    placeholder="Suggest a team name"
                    maxLength={TEAM_NAME_MAX_LENGTH}
                    required
                  />
                  <Input
                    label="School / College name"
                    {...register('schoolName')}
                    error={errors.schoolName?.message}
                    placeholder="Enter your school/college name"
                    required
                  />
                  <Input
                    label="Participant 2 email address"
                    type="email"
                    {...register('p2Email')}
                    error={errors.p2Email?.message}
                    placeholder="Enter your teammate's name"
                    required
                  />
                </div>
              )}

              {/* Step 2: Participant 1 details */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Participant 1 details</h3>
                  <p className="text-sm text-gray-500">Your gender, phone, Aadhar and class (same as required for Participant 2).</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender <span className="text-red-500">*</span></label>
                    <select
                      {...register('p1Gender')}
                      className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.p1Gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
                    >
                      <option value="">Select your Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.p1Gender && <p className="mt-1.5 text-sm text-red-600">{errors.p1Gender.message}</p>}
                  </div>
                  <Input
                    label="Phone number"
                    type="tel"
                    {...register('p1Phone')}
                    error={errors.p1Phone?.message}
                    placeholder="Enter your phone number"
                    maxLength={10}
                    required
                  />
                  <Input
                    label="Aadhar number"
                    type="text"
                    {...register('p1Aadhar', {
                      onChange: (e) => { e.target.value = formatAadhar(e.target.value) },
                    })}
                    error={errors.p1Aadhar?.message}
                    placeholder="Enter your Aadhar number"
                    maxLength={14}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                    <select
                      {...register('p1Class')}
                      className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.p1Class ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
                    >
                      <option value="">Enter your Class</option>
                      <option value="Class X">Class X</option>
                      <option value="Class XI/+2 First Year">Class XI/+2 First Year</option>
                      <option value="Class XII/+2 Second Year">Class XII/+2 Second Year</option>
                    </select>
                    {errors.p1Class && <p className="mt-1.5 text-sm text-red-600">{errors.p1Class.message}</p>}
                  </div>
                  <Input
                    label="Select your Date of Birth"
                    type="date"
                    {...register('p1DateOfBirth')}
                    error={errors.p1DateOfBirth?.message}
                    max={dobMax}
                    min={dobMin}
                    required
                  />
                </div>
              )}

              {/* Step 3: Authority (optional) + Terms & submit */}
              {step === 3 && (
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

            <p className="mt-6 text-center text-gray-600 text-sm">
              <Link href="/dashboard" className="text-[#C0392B] hover:underline">Back to dashboard</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
