'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Carousel } from '@/components/ui/Carousel'

// Carousel slides data
const carouselSlides = [
  {
    image: '/images/carousel/carousel-img-1.png',
    title: 'Test Your Knowledge of Odisha',
    description: 'Participate in exciting quizzes about Odisha\'s rich culture, traditions, history, and geography.',
  },
  {
    image: '/images/carousel/carousel-img2.png',
    title: 'Compete with Your Team',
    description: 'Join forces with your teammate and showcase your combined knowledge of Odisha\'s heritage.',
  },
  {
    image: '/images/carousel/carousel-img3.png',
    title: 'Celebrate Odia Culture',
    description: 'Deepen your understanding of Odisha while competing for recognition and exciting prizes.',
  },
  {
    image: '/images/carousel/carousel-img4.png',
    title: 'Explore Odisha\'s Heritage',
    description: 'Learn about Konark Temple, Jagannath Puri, and the rich cultural legacy of Odisha.',
  },
  {
    image: '/images/carousel/carousel-img5.png',
    title: 'Master Odia Language & Literature',
    description: 'Test your knowledge of Odia language, literature, and traditional arts of Odisha.',
  },
  {
    image: '/images/carousel/carousel-img6.png',
    title: 'Discover Odisha\'s Geography',
    description: 'Challenge yourself with questions about Odisha\'s districts, rivers, and natural beauty.',
  },
  {
    image: '/images/carousel/carousel-img7.png',
    title: 'Win Exciting Rewards',
    description: 'Top performers get recognized and rewarded for their exceptional knowledge of Odisha.',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const registered = searchParams.get('registered') === 'true'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (registered) {
      setTimeout(() => {
        setLoginError(null)
      }, 5000)
    }
  }, [registered])

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setLoginError(null)

    try {
      const supabase = createClient()

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email or password. Please try again.')
        } else if (authError.message.includes('Email not confirmed')) {
          setLoginError('Please verify your email address before logging in.')
        } else {
          setLoginError(authError.message)
        }
        setIsSubmitting(false)
        return
      }

      if (authData.user) {
        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResettingPassword(true)
    setLoginError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setLoginError(error.message)
        setIsResettingPassword(false)
        return
      }

      setForgotPasswordSuccess(true)
    } catch (error: any) {
      setLoginError(error.message || 'Failed to send reset email.')
    } finally {
      setIsResettingPassword(false)
    }
  }

  if (showForgotPassword && !forgotPasswordSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => {
              setShowForgotPassword(false)
              setForgotPasswordEmail('')
              setLoginError(null)
            }}
            className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Login
          </button>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{loginError}</p>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" isLoading={isResettingPassword} className="w-full">
              Send Reset Link
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (showForgotPassword && forgotPasswordSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{forgotPasswordEmail}</strong>. Please check
            your inbox and follow the instructions.
          </p>
          <Button
            onClick={() => {
              setShowForgotPassword(false)
              setForgotPasswordEmail('')
              setForgotPasswordSuccess(false)
            }}
            variant="primary"
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Carousel (60%) */}
      <div className="hidden lg:flex lg:w-[60%] relative">
        <Carousel slides={carouselSlides} />
      </div>

      {/* Right Side - Login Form (40%) */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col">
        {/* Login Form - Centered */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back to Gyana Spandana!
              </h1>
              <p className="text-gray-600">Sign in your account</p>
            </div>

            {registered && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✓ Registration successful! Please check your email for verification and then login.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Input
                  label="Your Email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    error={errors.password?.message}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[38px] text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember Me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{loginError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                Login
              </Button>
            </form>

            {/* Registration Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have any account?{' '}
                <Link href="/register" className="text-blue-600 hover:underline font-medium">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
