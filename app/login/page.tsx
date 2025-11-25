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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

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

      // Check if identifier is email or Aadhar
      const isEmail = data.identifier.includes('@')
      
      let email = ''
      
      if (isEmail) {
        email = data.identifier
      } else {
        // Look up email by Aadhar
        const { data: participant, error: lookupError } = await supabase
          .from('participants')
          .select('email')
          .eq('aadhar', data.identifier)
          .single()

        if (lookupError || !participant) {
          setLoginError('Invalid Aadhar number or email address.')
          setIsSubmitting(false)
          return
        }

        email = participant.email
      }

      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email/Aadhar or password. Please try again.')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Gyana Spandana
            </h1>
          </Link>
          <p className="text-gray-600 text-lg">Welcome back! Please login to continue.</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          {registered && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✓ Registration successful! Please check your email for verification and then login.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email or Aadhar Number"
              {...register('identifier')}
              error={errors.identifier?.message}
              placeholder="Enter email or 12-digit Aadhar"
              required
              autoFocus
            />

            <div>
              <Input
                label="Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="Enter your password"
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>
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
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Gyana Spandana?</span>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6">
            <Link href="/register">
              <Button variant="outline" size="lg" className="w-full">
                Create New Team Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Register your team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

