'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signUpSchema, type SignUpFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrength } from '@/components/ui/PasswordStrength'

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

const carouselSlides = [
  { image: '/images/carousel-optimized/carousel-img-1.webp', title: 'Join the Competition', description: 'Register your team and participate in exciting quizzes about Odisha\'s culture and heritage.' },
  { image: '/images/carousel-optimized/carousel-img2.webp', title: 'Team Up & Compete', description: 'Form a team of two and showcase your combined knowledge of Odisha\'s traditions and history.' },
  { image: '/images/carousel-optimized/carousel-img3.webp', title: 'Start Your Journey', description: 'Begin your quest to become a GYANA SPARDHA champion. Sign up and create your team!' },
]

function getRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  return `${origin}/auth/callback?next=/team/create`
}

export default function SignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  /** Set when signUp succeeded but Supabase returned no session (email confirmation required). */
  const [confirmationEmailSentTo, setConfirmationEmailSentTo] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })
  const password = watch('password')

  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true)
    setSignupError(null)
    setPendingInviteToken(null)
    try {
      // Before calling signUp, check if this email has a pending P2 invitation
      const { checkPendingInvitationForEmail } = await import('@/app/actions/team')
      const pending = await checkPendingInvitationForEmail(data.email.trim().toLowerCase())
      if (pending.hasPending) {
        setSignupError(
          `This email has already been invited to join a team ("${pending.teamName}"). ` +
          'Please check your email for the invitation link, or click here to open it.'
        )
        setPendingInviteToken(pending.token)
        setIsSubmitting(false)
        return
      }

      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: getRedirectUrl() },
      })
      if (error) {
        setSignupError(error.message)
        setIsSubmitting(false)
        return
      }
      if (authData.user?.identities?.length === 0) {
        setSignupError('An account with this email already exists. Please sign in instead.')
        setIsSubmitting(false)
        return
      }
      if (authData.session) {
        router.push('/team/create')
      } else {
        setConfirmationEmailSentTo(data.email.trim())
      }
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setSignupError(null)
    try {
      const supabase = createClient()
      const redirectTo = getRedirectUrl()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) {
        setSignupError(error.message)
        return
      }
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : 'Google sign up failed.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[60%] h-screen relative">
        <Carousel slides={carouselSlides} />
      </div>

      <div className="w-full lg:w-[40%] bg-white flex flex-col min-h-screen">
        <div className="flex justify-end p-6">
          <Link href="/login">
            <Button variant="secondary" size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8">
          <div className="w-full max-w-md">
            {confirmationEmailSentTo ? (
              <>
                <div className="mb-8">
                  <div className="flex justify-center mb-4">
                    <Image src="/images/logo.webp" alt="GYANA SPARDHA" width={56} height={56} className="object-contain rounded-lg" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm your email</h1>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We sent a confirmation link to{' '}
                    <strong className="text-gray-900">{confirmationEmailSentTo}</strong>. Open that email and click the
                    link to verify your address. You will then continue to team registration.
                  </p>
                  <p className="text-gray-500 text-sm mt-4">
                    Did not receive it? Check your spam folder, or wait a minute and try again from sign up.
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-6">
                  <p className="text-green-900 text-sm">
                    After you confirm, you will be signed in and taken to create your team.
                  </p>
                </div>
                <Link href="/login" className="block">
                  <Button variant="outline" size="lg" className="w-full">
                    Already confirmed? Sign in
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex justify-center mb-4">
                    <Image src="/images/logo.webp" alt="GYANA SPARDHA" width={56} height={56} className="object-contain rounded-lg" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
                  <p className="text-gray-600">Sign up with email or Google to create your team</p>
                </div>

                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignUp}
                    disabled={isGoogleLoading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {isGoogleLoading ? 'Redirecting...' : 'Sign up with Google'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                  <Input
                    label="Enter your Email"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    placeholder="you@example.com"
                    required
                  />
                  <div>
                    <Input
                      label="Create a password"
                      type="password"
                      {...register('password')}
                      error={errors.password?.message}
                      placeholder="Create a strong password"
                      required
                    />
                    {password && <PasswordStrength password={password} />}
                  </div>

                  {signupError && (
                    <div className={`rounded-lg p-4 ${pendingInviteToken ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className={pendingInviteToken ? 'text-amber-800 text-sm' : 'text-red-800 text-sm'}>{signupError}</p>
                      {pendingInviteToken && (
                        <Link
                          href={`/register/invite/${pendingInviteToken}`}
                          className="text-[#C0392B] hover:underline text-sm font-medium mt-2 inline-block"
                        >
                          Open your invitation →
                        </Link>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    loadingText="Creating account..."
                    className="w-full bg-gray-900 hover:bg-gray-800"
                  >
                    Sign up with email
                  </Button>
                </form>

                <p className="mt-6 text-center text-gray-600 text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#C0392B] hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
