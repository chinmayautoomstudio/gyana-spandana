'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
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

export default function RegisterInvitePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = typeof params.token === 'string' ? params.token : ''
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitationByToken>> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [completeWithGoogle, setCompleteWithGoogle] = useState(false)
  const [sessionUser, setSessionUser] = useState<User | null>(null)
  const [googleButtonLoading, setGoogleButtonLoading] = useState(false)

  const emailForm = useForm<P2RegistrationFormData>({
    resolver: zodResolver(p2RegistrationSchema),
  })
  const { register, handleSubmit, watch, setValue, formState: { errors } } = emailForm
  const password = watch('password')

  const googleForm = useForm<P2RegistrationWithGoogleFormData>({
    resolver: zodResolver(p2RegistrationWithGoogleSchema),
  })
  const { register: registerGoogle, handleSubmit: handleSubmitGoogle, setValue: setValueGoogle, formState: { errors: errorsGoogle } } = googleForm

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
          <div className="w-full max-w-md">
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
            <form onSubmit={handleSubmitGoogle(onSubmitGoogle)} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">Signed in as <strong>{sessionUser?.email}</strong></p>
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
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="consent-google"
                  {...registerGoogle('consent')}
                  className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                />
                <label htmlFor="consent-google" className="text-sm text-gray-700">
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
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Registering..."
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                Complete registration
              </Button>
            </form>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="consent"
                {...register('consent')}
                className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Registering..."
              className="w-full bg-gray-900 hover:bg-gray-800"
            >
              Complete registration
            </Button>
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
