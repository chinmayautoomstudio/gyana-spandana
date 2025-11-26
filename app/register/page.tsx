'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { teamRegistrationSchema, type TeamRegistrationFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrength } from '@/components/ui/PasswordStrength'
import { EmailVerification } from '@/components/ui/EmailVerification'
import { Carousel } from '@/components/ui/Carousel'

// Carousel slides data
const carouselSlides = [
  {
    image: '/images/carousel/carousel-img-1.png',
    title: 'Join the Competition',
    description: 'Register your team and participate in exciting quizzes about Odisha\'s rich culture and heritage.',
  },
  {
    image: '/images/carousel/carousel-img2.png',
    title: 'Team Up & Compete',
    description: 'Form a team of two and showcase your combined knowledge of Odisha\'s traditions and history.',
  },
  {
    image: '/images/carousel/carousel-img3.png',
    title: 'Start Your Journey',
    description: 'Begin your quest to become a Gyana Spandana champion. Register now and test your knowledge!',
  },
  {
    image: '/images/carousel/carousel-img4.png',
    title: 'Learn About Odisha\'s Heritage',
    description: 'Discover the magnificent temples, festivals, and cultural traditions of Odisha through our quizzes.',
  },
  {
    image: '/images/carousel/carousel-img5.png',
    title: 'Celebrate Odia Language',
    description: 'Test your knowledge of Odia language, literature, poetry, and traditional arts of Odisha.',
  },
  {
    image: '/images/carousel/carousel-img6.png',
    title: 'Explore Odisha\'s Geography',
    description: 'Challenge yourself with questions about Odisha\'s districts, rivers, mountains, and natural wonders.',
  },
  {
    image: '/images/carousel/carousel-img7.png',
    title: 'Achieve Excellence',
    description: 'Compete for top positions and earn recognition for your deep knowledge of Odisha\'s culture and heritage.',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Email verification state
  const [p1EmailVerified, setP1EmailVerified] = useState(false)
  const [p2EmailVerified, setP2EmailVerified] = useState(false)
  const [p1UserId, setP1UserId] = useState<string | null>(null)
  const [p2UserId, setP2UserId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TeamRegistrationFormData>({
    resolver: zodResolver(teamRegistrationSchema),
    mode: 'onChange',
  })

  const participant1Password = watch('participant1.password')
  const participant2Password = watch('participant2.password')
  const participant1Email = watch('participant1.email')
  const participant2Email = watch('participant2.email')

  // Format Aadhar number as XXXX XXXX XXXX
  const formatAadhar = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Limit to 12 digits
    const limited = digits.slice(0, 12)
    // Add spaces after every 4 digits
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ')
    return formatted
  }

  // OTP Send Functions
  const sendP1OTP = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: participant1Email,
    })
    if (error) throw new Error(error.message)
  }

  const sendP2OTP = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: participant2Email,
    })
    if (error) throw new Error(error.message)
  }

  // OTP Verify Functions
  const verifyP1OTP = async (token: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: participant1Email,
      token: token,
      type: 'email',
    })
    if (error) throw new Error(error.message)
    if (data.user) setP1UserId(data.user.id)
    await supabase.auth.signOut()
    setP1EmailVerified(true)
  }

  const verifyP2OTP = async (token: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: participant2Email,
      token: token,
      type: 'email',
    })
    if (error) throw new Error(error.message)
    if (data.user) setP2UserId(data.user.id)
    await supabase.auth.signOut()
    setP2EmailVerified(true)
  }

  const onSubmit = async (data: TeamRegistrationFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Check email verification FIRST
    if (!p1EmailVerified || !p2EmailVerified) {
      setSubmitError('Please verify both email addresses before registering.')
      setIsSubmitting(false)
      return
    }

    try {
      // Call Server Action to complete registration
      const { registerTeam } = await import('@/app/actions/register')
      const result = await registerTeam(data, p1UserId!, p2UserId!)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 3000)
    } catch (error: any) {
      setSubmitError(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
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
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your team has been registered successfully. Please check your email for verification
            links. You will be redirected to the login page shortly.
          </p>
          <Button onClick={() => router.push('/login')} variant="primary">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Carousel (60%) */}
      <div className="hidden lg:flex lg:w-[60%] h-screen relative">
        <Carousel slides={carouselSlides} />
      </div>

      {/* Right Side - Registration Form (40%) */}
      <div className="w-full lg:w-[40%] h-screen bg-white flex flex-col">
        {/* Sign in button - Top Right */}
        <div className="flex justify-end p-6 flex-shrink-0">
          <Link href="/login">
            <Button variant="secondary" size="sm" className="bg-gray-900 text-white hover:bg-gray-800">
              Sign in
            </Button>
          </Link>
        </div>

        {/* Registration Form - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-8">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your Team
              </h1>
              <p className="text-gray-600">Register your team for Gyana Spandana</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Team Information */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Team Information</h3>
                </div>
                <Input
                  label="Team Name"
                  {...register('teamName')}
                  error={errors.teamName?.message}
                  placeholder="Enter your team name"
                  required
                />
              </div>

              {/* Participant 1 */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Participant 1 Details</h3>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    {...register('participant1.name')}
                    error={errors.participant1?.name?.message}
                    placeholder="Enter full name"
                    required
                  />
                  <div>
                    <Input
                      label="Email Address"
                      type="email"
                      {...register('participant1.email')}
                      error={errors.participant1?.email?.message}
                      placeholder="example@email.com"
                      required
                    />
                    <EmailVerification
                      email={participant1Email || ''}
                      isVerified={p1EmailVerified}
                      onSendOTP={sendP1OTP}
                      onVerifyOTP={verifyP1OTP}
                      disabled={!participant1Email || !!errors.participant1?.email}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      type="tel"
                      {...register('participant1.phone')}
                      error={errors.participant1?.phone?.message}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                    />
                    <Input
                      label="Aadhar Number"
                      type="text"
                      {...register('participant1.aadhar', {
                        onChange: (e) => {
                          const formatted = formatAadhar(e.target.value)
                          e.target.value = formatted
                        }
                      })}
                      error={errors.participant1?.aadhar?.message}
                      placeholder="1234 5678 9012"
                      maxLength={14}
                      required
                    />
                  </div>
                  <Input
                    label="School Name"
                    {...register('participant1.schoolName')}
                    error={errors.participant1?.schoolName?.message}
                    placeholder="Enter school name"
                    required
                  />
                  <div>
                    <Input
                      label="Password"
                      type="password"
                      {...register('participant1.password')}
                      error={errors.participant1?.password?.message}
                      placeholder="Create a strong password"
                      required
                    />
                    {participant1Password && (
                      <PasswordStrength password={participant1Password} />
                    )}
                  </div>
                </div>
              </div>

              {/* Participant 2 */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Participant 2 Details</h3>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    {...register('participant2.name')}
                    error={errors.participant2?.name?.message}
                    placeholder="Enter full name"
                    required
                  />
                  <div>
                    <Input
                      label="Email Address"
                      type="email"
                      {...register('participant2.email')}
                      error={errors.participant2?.email?.message}
                      placeholder="example@email.com"
                      required
                    />
                    <EmailVerification
                      email={participant2Email || ''}
                      isVerified={p2EmailVerified}
                      onSendOTP={sendP2OTP}
                      onVerifyOTP={verifyP2OTP}
                      disabled={!participant2Email || !!errors.participant2?.email}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      type="tel"
                      {...register('participant2.phone')}
                      error={errors.participant2?.phone?.message}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                    />
                    <Input
                      label="Aadhar Number"
                      type="text"
                      {...register('participant2.aadhar', {
                        onChange: (e) => {
                          const formatted = formatAadhar(e.target.value)
                          e.target.value = formatted
                        }
                      })}
                      error={errors.participant2?.aadhar?.message}
                      placeholder="1234 5678 9012"
                      maxLength={14}
                      required
                    />
                  </div>
                  <Input
                    label="School Name"
                    {...register('participant2.schoolName')}
                    error={errors.participant2?.schoolName?.message}
                    placeholder="Enter school name"
                    required
                  />
                  <div>
                    <Input
                      label="Password"
                      type="password"
                      {...register('participant2.password')}
                      error={errors.participant2?.password?.message}
                      placeholder="Create a strong password"
                      required
                    />
                    {participant2Password && (
                      <PasswordStrength password={participant2Password} />
                    )}
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="consent"
                  {...register('consent')}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                  . I understand that my data will be used for the quiz competition purposes only.
                  {errors.consent && (
                    <span className="block text-red-600 mt-1">{errors.consent.message}</span>
                  )}
                </label>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                Register Team
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
