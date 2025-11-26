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

export default function RegisterPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

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

  const onSubmit = async (data: TeamRegistrationFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const supabase = createClient()

      // Check if team name already exists
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('team_name', data.teamName)
        .single()

      if (existingTeam) {
        setSubmitError('Team name already exists. Please choose a different name.')
        setIsSubmitting(false)
        return
      }

      // Check if emails or Aadhar numbers already exist
      const { data: existingParticipants } = await supabase
        .from('participants')
        .select('email, aadhar')
        .in('email', [data.participant1.email, data.participant2.email])
        .or(`aadhar.in.(${data.participant1.aadhar},${data.participant2.aadhar})`)

      if (existingParticipants && existingParticipants.length > 0) {
        setSubmitError('One or more participants are already registered.')
        setIsSubmitting(false)
        return
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ team_name: data.teamName })
        .select()
        .single()

      if (teamError || !team) {
        throw new Error(teamError?.message || 'Failed to create team')
      }

      // Create auth users and participants
      const participants = [
        { ...data.participant1, isParticipant1: true },
        { ...data.participant2, isParticipant1: false },
      ]

      for (const participant of participants) {
        // Sign up user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: participant.email,
          password: participant.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (authError) {
          throw new Error(authError.message)
        }

        // Create participant record
        if (!authData.user) {
          throw new Error('Failed to create auth user')
        }

        const { error: participantError } = await supabase
          .from('participants')
          .insert({
            user_id: authData.user.id, // Link to Supabase Auth user
            team_id: team.id,
            name: participant.name,
            email: participant.email,
            phone: participant.phone,
            school_name: participant.schoolName,
            aadhar: participant.aadhar,
            is_participant1: participant.isParticipant1,
            email_verified: false,
            phone_verified: false,
          })

        if (participantError) {
          throw new Error(participantError.message)
        }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Gyana Spandana
            </h1>
          </Link>
          <p className="text-gray-600 text-lg">Team Registration</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Team Name */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                Team Information
              </h3>
              <Input
                label="Team Name"
                {...register('teamName')}
                error={errors.teamName?.message}
                placeholder="Enter your team name"
                required
              />
            </div>

            {/* Participant 1 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                Participant 1 Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  {...register('participant1.name')}
                  error={errors.participant1?.name?.message}
                  placeholder="Enter full name"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  {...register('participant1.email')}
                  error={errors.participant1?.email?.message}
                  placeholder="example@email.com"
                  required
                />
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
                  label="School Name"
                  {...register('participant1.schoolName')}
                  error={errors.participant1?.schoolName?.message}
                  placeholder="Enter school name"
                  required
                />
                <Input
                  label="Aadhar Number"
                  type="text"
                  {...register('participant1.aadhar')}
                  error={errors.participant1?.aadhar?.message}
                  placeholder="123456789012"
                  maxLength={12}
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
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                Participant 2 Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  {...register('participant2.name')}
                  error={errors.participant2?.name?.message}
                  placeholder="Enter full name"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  {...register('participant2.email')}
                  error={errors.participant2?.email?.message}
                  placeholder="example@email.com"
                  required
                />
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
                  label="School Name"
                  {...register('participant2.schoolName')}
                  error={errors.participant2?.schoolName?.message}
                  placeholder="Enter school name"
                  required
                />
                <Input
                  label="Aadhar Number"
                  type="text"
                  {...register('participant2.aadhar')}
                  error={errors.participant2?.aadhar?.message}
                  placeholder="123456789012"
                  maxLength={12}
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
            <div className="flex items-start gap-3">
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
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="flex-1"
              >
                Register Team
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push('/login')}
                className="flex-1"
              >
                Already Registered? Login
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

