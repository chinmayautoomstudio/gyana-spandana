'use client'

import { Suspense, useEffect, useState, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useResolvedParams, useStableSearchParams } from '@/lib/navigation/unwrapNavigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { getInvitationByToken, completeP2Registration, completeP2RegistrationWithGoogle } from '@/app/actions/team'
import { p2RegistrationSchema, type P2RegistrationFormData, p2RegistrationWithGoogleSchema, type P2RegistrationWithGoogleFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrength } from '@/components/ui/PasswordStrength'
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

function formatAadhar(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const dobMax = new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]
const dobMin = new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]

const P2_STEPS = 2

function formatAadharFullDisplay(raw: string | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  return formatAadhar(raw ?? '')
}

function PreviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium mt-1 break-words">{children}</div>
    </div>
  )
}

type InviteRouteParams = Record<string, string | string[] | undefined>

function RegisterInvitePageContent() {
  const routeParams = useResolvedParams<InviteRouteParams>()
  const router = useRouter()
  const searchParams = useStableSearchParams()
  const rawToken = routeParams.token
  const token =
    typeof rawToken === 'string'
      ? rawToken
      : Array.isArray(rawToken)
        ? rawToken[0] ?? ''
        : ''
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitationByToken>> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [completeWithGoogle, setCompleteWithGoogle] = useState(false)
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [googleButtonLoading, setGoogleButtonLoading] = useState(false)
  const [regStep, setRegStep] = useState(1)
  const formAreaRef = useRef<HTMLDivElement>(null)

  const emailForm = useForm<P2RegistrationFormData>({
    resolver: zodResolver(p2RegistrationSchema) as Resolver<P2RegistrationFormData>,
    shouldUnregister: false,
    defaultValues: {
      informationAccurate: false,
      consent: false,
    },
  })
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = emailForm
  const password = watch('password')
  const emailPreview = watch()

  const googleForm = useForm<P2RegistrationWithGoogleFormData>({
    resolver: zodResolver(p2RegistrationWithGoogleSchema) as Resolver<P2RegistrationWithGoogleFormData>,
    shouldUnregister: false,
    defaultValues: {
      informationAccurate: false,
      consent: false,
    },
  })
  const {
    register: registerGoogle,
    handleSubmit: handleSubmitGoogle,
    watch: watchGoogle,
    setValue: setValueGoogle,
    trigger: triggerGoogle,
    formState: { errors: errorsGoogle },
  } = googleForm
  const googlePreview = watchGoogle()

  useEffect(() => {
    setRegStep(1)
  }, [completeWithGoogle])

  useEffect(() => {
    if (!token) {
      setInvitation({ valid: false, error: 'Invalid invitation link.' })
      return
    }
    getInvitationByToken(token).then((result) => {
      setInvitation(result)
      if (result.valid) {
        setValue('email', result.p2Email)
      }
    })
  }, [token, setValue])

  // When ?google=1, check session and if email matches invite, show Google-complete form
  useEffect(() => {
    if (!invitation?.valid || searchParams.get('google') !== '1') return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && invitation.valid) {
        const userEmail = (session.user.email ?? '').toLowerCase()
        const invitedEmail = invitation.p2Email.toLowerCase()
        if (userEmail === invitedEmail) {
          setCompleteWithGoogle(true)
          setSessionUser(session.user)
        }
      }
    })
  }, [invitation, searchParams])

  useEffect(() => {
    if (sessionUser && completeWithGoogle) {
      const name = sessionUser.user_metadata?.full_name ?? sessionUser.user_metadata?.name ?? ''
      if (name && typeof name === 'string') setValueGoogle('name', name.trim())
    }
  }, [sessionUser, completeWithGoogle, setValueGoogle])

  const onContinueWithGoogle = async () => {
    if (!token) return
    setGoogleButtonLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/auth/invite-google?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError((data as { error?: string }).error || 'Failed to start Google sign-in.')
        return
      }
      const supabase = createClient()
      const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '' },
      })
      if (error) {
        setSubmitError(error.message)
        return
      }
      if (oauthData?.url) window.location.href = oauthData.url
    } finally {
      setGoogleButtonLoading(false)
    }
  }

  const onSubmit = async (data: P2RegistrationFormData) => {
    if (!token || !invitation?.valid) return
    if (!data.informationAccurate || !data.consent) return
    setIsSubmitting(true)
    setSubmitError(null)
    const result = await completeP2Registration(token, data)
    if (result.success) {
      router.push('/login?registered=true')
      return
    }
    setSubmitError(result.error)
    setIsSubmitting(false)
  }

  const onSubmitGoogle = async (data: P2RegistrationWithGoogleFormData) => {
    if (!token || !invitation?.valid) return
    if (!data.informationAccurate || !data.consent) return
    setIsSubmitting(true)
    setSubmitError(null)
    const result = await completeP2RegistrationWithGoogle(token, data)
    if (result.success) {
      router.push('/dashboard')
      return
    }
    setSubmitError(result.error)
    setIsSubmitting(false)
  }

  const scrollFormTop = () => {
    formAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onEmailStepNext = async () => {
    const ok = await trigger(['name', 'gender', 'email', 'phone', 'aadhar', 'class', 'dateOfBirth', 'password'])
    if (!ok) return
    setRegStep(2)
    scrollFormTop()
  }

  const onEmailBackToStep1 = () => {
    setRegStep(1)
    setValue('informationAccurate', false)
    setValue('consent', false)
    scrollFormTop()
  }

  const onGoogleStepNext = async () => {
    const ok = await triggerGoogle(['name', 'gender', 'phone', 'aadhar', 'class', 'dateOfBirth'])
    if (!ok) return
    setRegStep(2)
    scrollFormTop()
  }

  const onGoogleBackToStep1 = () => {
    setRegStep(1)
    setValueGoogle('informationAccurate', false)
    setValueGoogle('consent', false)
    scrollFormTop()
  }

  if (invitation === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1] px-4">
        <div className="text-gray-600">Loading invitation...</div>
      </div>
    )
  }

  if (!invitation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation invalid or expired</h2>
          <p className="text-gray-600 mb-6">{invitation.error}</p>
          <Link href="/login">
            <Button variant="primary">Go to sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Carousel (60%) - same as login / team create */}
      <div className="hidden lg:flex lg:w-[60%] relative">
        <Carousel slides={carouselSlides} />
      </div>

      {/* Right side - Form (40%) */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md" ref={formAreaRef}>
            <div className="mb-6">
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
                <h1 className="text-3xl font-bold text-gray-900">Complete your registration</h1>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                You were invited to join <strong>{invitation.teamName}</strong>. Fill in your details below.
              </p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700"><strong>Team:</strong> {invitation.teamName}</p>
              <p className="text-sm text-gray-700"><strong>Participant 1:</strong> {invitation.p1Name}</p>
              <p className="text-sm text-gray-700"><strong>School / College:</strong> {invitation.schoolName || '—'}</p>
            </div>

            {searchParams.get('error') === 'email_mismatch' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  This invitation was sent to <strong>{invitation.p2Email}</strong>. You signed in with a different email. Please use the form below to register with email and password.
                </p>
              </div>
            )}
            {searchParams.get('error') === 'invalid_invite' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">This invitation is no longer valid or has expired. Please request a new link from your teammate.</p>
              </div>
            )}

            {!completeWithGoogle && (
              <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onContinueWithGoogle}
              isLoading={googleButtonLoading}
              loadingText="Redirecting..."
              className="w-full mb-4 border-red-300 text-gray-700 hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-gray-500 mb-4">Or continue with email</p>
            </>
            )}

            {completeWithGoogle ? (
            <form
              onSubmit={(e) => {
                if (regStep < P2_STEPS) {
                  e.preventDefault()
                  return
                }
                void handleSubmitGoogle(onSubmitGoogle)(e)
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Step {regStep} of {P2_STEPS}</span>
                <div className="flex-1 flex gap-1">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i <= regStep ? 'bg-[#C0392B]' : 'bg-gray-200'}`}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">Signed in with Google. Your email cannot be changed.</p>

              {regStep === 1 && (
              <>
              <Input
                label="Email address"
                type="email"
                value={sessionUser?.email ?? ''}
                readOnly
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <Input
                label="Your full name"
                {...registerGoogle('name')}
                error={errorsGoogle.name?.message}
                placeholder="Enter your name"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender <span className="text-red-500">*</span></label>
                <select
                  {...registerGoogle('gender')}
                  className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errorsGoogle.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errorsGoogle.gender && <p className="mt-1.5 text-sm text-red-600">{errorsGoogle.gender.message}</p>}
              </div>
              <Input
                label="Phone number"
                type="tel"
                {...registerGoogle('phone')}
                error={errorsGoogle.phone?.message}
                placeholder="9876543210"
                maxLength={10}
                required
              />
              <Input
                label="Aadhar number"
                type="text"
                {...registerGoogle('aadhar', {
                  onChange: (e) => { e.target.value = formatAadhar(e.target.value) },
                })}
                error={errorsGoogle.aadhar?.message}
                placeholder="1234 5678 9012"
                maxLength={14}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                <select
                  {...registerGoogle('class')}
                  className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errorsGoogle.class ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
                >
                  <option value="">Select class</option>
                  <option value="Class X">Class X</option>
                  <option value="Class XI/+2 First Year">Class XI/+2 First Year</option>
                  <option value="Class XII/+2 Second Year">Class XII/+2 Second Year</option>
                </select>
                {errorsGoogle.class && <p className="mt-1.5 text-sm text-red-600">{errorsGoogle.class.message}</p>}
              </div>
              <Input
                label="Date of Birth"
                type="date"
                {...registerGoogle('dateOfBirth')}
                error={errorsGoogle.dateOfBirth?.message}
                max={dobMax}
                min={dobMin}
                required
              />
              </>
              )}

              {regStep === 2 && (
              <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Review your details</h3>
                  <Button type="button" variant="outline" size="sm" onClick={onGoogleBackToStep1} className="shrink-0">
                    Update
                  </Button>
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team invitation</p>
                <div className="space-y-1">
                  <PreviewField label="Team">{invitation.teamName}</PreviewField>
                  <PreviewField label="Participant 1">{invitation.p1Name}</PreviewField>
                  <PreviewField label="School / College">{invitation.schoolName || '—'}</PreviewField>
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2 border-t border-gray-200">Your details</p>
                <div className="space-y-1">
                  <PreviewField label="Email">
                    <span className="break-all">{sessionUser?.email ?? '—'}</span>
                  </PreviewField>
                  <PreviewField label="Your full name">{googlePreview.name || '—'}</PreviewField>
                  <PreviewField label="Gender">{googlePreview.gender || '—'}</PreviewField>
                  <PreviewField label="Phone">{googlePreview.phone || '—'}</PreviewField>
                  <PreviewField label="Aadhar">
                    <span className="font-mono tracking-wide">{formatAadharFullDisplay(googlePreview.aadhar)}</span>
                  </PreviewField>
                  <PreviewField label="Class">{googlePreview.class || '—'}</PreviewField>
                  <PreviewField label="Date of birth">{googlePreview.dateOfBirth || '—'}</PreviewField>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="p2g-informationAccurate"
                  {...registerGoogle('informationAccurate')}
                  className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <label htmlFor="p2g-informationAccurate" className="text-sm text-gray-700">
                  I confirm that the information above is accurate and complete.
                  {errorsGoogle.informationAccurate && (
                    <span className="block text-red-600 mt-1">{errorsGoogle.informationAccurate.message}</span>
                  )}
                </label>
              </div>
              <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="p2g-consent"
                  {...registerGoogle('consent')}
                  className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <label htmlFor="p2g-consent" className="text-sm text-gray-700">
                  I agree to the <Link href="/terms" className="text-[#C0392B] hover:underline">Terms and Conditions</Link>
                  {' '}and <Link href="/privacy" className="text-[#C0392B] hover:underline">Privacy Policy</Link>.
                  {errorsGoogle.consent && <span className="block text-red-600 mt-1">{errorsGoogle.consent.message}</span>}
                </label>
              </div>
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              )}
              </>
              )}

              <div className="flex gap-3 pt-2">
                {regStep === 1 ? (
                  <>
                    <div className="flex-1" />
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={onGoogleStepNext}
                      className="flex-1 bg-gray-900 hover:bg-gray-800"
                    >
                      Next
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="lg" onClick={onGoogleBackToStep1} className="flex-1">
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                      loadingText="Registering..."
                      className="flex-1 bg-gray-900 hover:bg-gray-800"
                    >
                      Complete registration
                    </Button>
                  </>
                )}
              </div>
            </form>
            ) : (
            <form
              onSubmit={(e) => {
                if (regStep < P2_STEPS) {
                  e.preventDefault()
                  return
                }
                void handleSubmit(onSubmit)(e)
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Step {regStep} of {P2_STEPS}</span>
                <div className="flex-1 flex gap-1">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i <= regStep ? 'bg-[#C0392B]' : 'bg-gray-200'}`}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>

              {regStep === 1 && (
              <>
            <Input
              label="Your full name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter your name"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender <span className="text-red-500">*</span></label>
              <select
                {...register('gender')}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="mt-1.5 text-sm text-red-600">{errors.gender.message}</p>}
            </div>
            <Input
              label="Email address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder={invitation.p2Email}
              required
            />
            <Input
              label="Phone number"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="9876543210"
              maxLength={10}
              required
            />
            <Input
              label="Aadhar number"
              type="text"
              {...register('aadhar', {
                onChange: (e) => { e.target.value = formatAadhar(e.target.value) },
              })}
              error={errors.aadhar?.message}
              placeholder="1234 5678 9012"
              maxLength={14}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Class <span className="text-red-500">*</span></label>
              <select
                {...register('class')}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${errors.class ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'}`}
              >
                <option value="">Select class</option>
                <option value="Class X">Class X</option>
                <option value="Class XI/+2 First Year">Class XI/+2 First Year</option>
                <option value="Class XII/+2 Second Year">Class XII/+2 Second Year</option>
              </select>
              {errors.class && <p className="mt-1.5 text-sm text-red-600">{errors.class.message}</p>}
            </div>
            <Input
              label="Date of Birth"
              type="date"
              {...register('dateOfBirth')}
              error={errors.dateOfBirth?.message}
              max={dobMax}
              min={dobMin}
              required
            />
            <div>
              <Input
                label="Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="Create a strong password"
                required
              />
              {password && <PasswordStrength password={password} />}
            </div>
              </>
              )}

              {regStep === 2 && (
              <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Review your details</h3>
                  <Button type="button" variant="outline" size="sm" onClick={onEmailBackToStep1} className="shrink-0">
                    Update
                  </Button>
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team invitation</p>
                <div className="space-y-1">
                  <PreviewField label="Team">{invitation.teamName}</PreviewField>
                  <PreviewField label="Participant 1">{invitation.p1Name}</PreviewField>
                  <PreviewField label="School / College">{invitation.schoolName || '—'}</PreviewField>
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2 border-t border-gray-200">Your details</p>
                <div className="space-y-1">
                  <PreviewField label="Your full name">{emailPreview.name || '—'}</PreviewField>
                  <PreviewField label="Gender">{emailPreview.gender || '—'}</PreviewField>
                  <PreviewField label="Email">
                    <span className="break-all">{emailPreview.email || '—'}</span>
                  </PreviewField>
                  <PreviewField label="Phone">{emailPreview.phone || '—'}</PreviewField>
                  <PreviewField label="Aadhar">
                    <span className="font-mono tracking-wide">{formatAadharFullDisplay(emailPreview.aadhar)}</span>
                  </PreviewField>
                  <PreviewField label="Class">{emailPreview.class || '—'}</PreviewField>
                  <PreviewField label="Date of birth">{emailPreview.dateOfBirth || '—'}</PreviewField>
                  <PreviewField label="Password">
                    {password && String(password).length > 0 ? 'Entered (hidden)' : '—'}
                  </PreviewField>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="p2e-informationAccurate"
                  {...register('informationAccurate')}
                  className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <label htmlFor="p2e-informationAccurate" className="text-sm text-gray-700">
                  I confirm that the information above is accurate and complete.
                  {errors.informationAccurate && (
                    <span className="block text-red-600 mt-1">{errors.informationAccurate.message}</span>
                  )}
                </label>
              </div>
              <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="p2e-consent"
                  {...register('consent')}
                  className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <label htmlFor="p2e-consent" className="text-sm text-gray-700">
                  I agree to the <Link href="/terms" className="text-[#C0392B] hover:underline">Terms and Conditions</Link>
                  {' '}and <Link href="/privacy" className="text-[#C0392B] hover:underline">Privacy Policy</Link>.
                  {errors.consent && <span className="block text-red-600 mt-1">{errors.consent.message}</span>}
                </label>
              </div>
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              )}
              </>
              )}

              <div className="flex gap-3 pt-2">
                {regStep === 1 ? (
                  <>
                    <div className="flex-1" />
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={onEmailStepNext}
                      className="flex-1 bg-gray-900 hover:bg-gray-800"
                    >
                      Next
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="lg" onClick={onEmailBackToStep1} className="flex-1">
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                      loadingText="Registering..."
                      className="flex-1 bg-gray-900 hover:bg-gray-800"
                    >
                      Complete registration
                    </Button>
                  </>
                )}
              </div>
          </form>
            )}

            <p className="mt-6 text-center text-gray-600 text-sm">
              <Link href="/login" className="text-[#C0392B] hover:underline">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-600">Loading…</p>
          </div>
        </div>
      }
    >
      <RegisterInvitePageContent />
    </Suspense>
  )
}
