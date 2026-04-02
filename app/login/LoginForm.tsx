'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { carouselSlides } from '@/lib/constants/carousel'

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

export default function LoginForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Check for registration success message or other message (e.g. password reset) from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const registeredParam = searchParams.get('registered') === 'true'
      const messageParam = searchParams.get('message')
      setRegistered(registeredParam)
      setSuccessMessage(messageParam)

      // Clear success message after 5 seconds
      if (registeredParam || messageParam) {
        const timer = setTimeout(() => {
          setLoginError(null)
        }, 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

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
        // Check user role from user_profiles table (primary source)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', authData.user.id)
          .single()

        // Fallback to user_metadata if profile doesn't exist
        const role = profile?.role || authData.user.user_metadata?.role || 'participant'

        setLoginSuccess(true)
        setIsSubmitting(false)
        if (role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      // Handle connection errors specifically
      const errorMessage = error.message || ''
      const errorString = String(error)
      
      if (
        errorMessage.includes('Failed to fetch') ||
        errorString.includes('Failed to fetch') ||
        errorMessage.includes('ERR_CONNECTION_CLOSED') ||
        errorString.includes('ERR_CONNECTION_CLOSED') ||
        errorMessage.includes('Missing Supabase environment variables')
      ) {
        setLoginError(
          'Cannot connect to Supabase. Please check:\n' +
          '1. Your internet connection\n' +
          '2. Your .env.local file has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
          '3. The dev server was restarted after adding environment variables\n' +
          '4. See ENV_SETUP.md for setup instructions'
        )
      } else if (errorMessage.includes('Missing Supabase environment variables')) {
        setLoginError(errorMessage)
      } else {
        setLoginError(errorMessage || 'Login failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setLoginError(null)
    try {
      const supabase = createClient()
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error) setLoginError(error.message)
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Google sign in failed.')
    } finally {
      setIsGoogleLoading(false)
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

  // Forgot Password Form
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

  // Forgot Password Success
  if (showForgotPassword && forgotPasswordSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-[#C0392B]/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#C0392B]"
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

  // Main Login Form
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
              <div className="flex justify-center mb-4">
                <Image
                  src="/images/logo.webp"
                  alt="GYANA SPARDHA"
                  width={56}
                  height={56}
                  className="object-contain rounded-lg"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back to GYANA SPARDHA!
              </h1>
              <p className="text-gray-600">Sign in your account</p>
            </div>

            {registered && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✓ Registration successful! Please Login!
                </p>
              </div>
            )}

            {successMessage && !registered && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">✓ {successMessage}</p>
              </div>
            )}

            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isGoogleLoading ? 'Redirecting...' : 'Sign in with Google'}
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

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
                    className="h-4 w-4 text-[#C0392B] focus:ring-[#C0392B] border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember Me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#C0392B] hover:text-[#A93226] font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              {loginSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    ✓ Login successful! Redirecting...
                  </p>
                </div>
              )}

              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm whitespace-pre-line">{loginError}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                loadingText="Logging in..."
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                Login
              </Button>
            </form>

            {/* Sign up link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="text-[#C0392B] hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
