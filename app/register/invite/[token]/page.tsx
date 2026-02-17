'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getInvitationByToken, completeP2Registration } from '@/app/actions/team'
import { p2RegistrationSchema, type P2RegistrationFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrength } from '@/components/ui/PasswordStrength'

function formatAadhar(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export default function RegisterInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = typeof params.token === 'string' ? params.token : ''
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof getInvitationByToken>> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<P2RegistrationFormData>({
    resolver: zodResolver(p2RegistrationSchema),
  })
  const password = watch('password')

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
    <div className="min-h-screen bg-[#ECF0F1] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your registration</h1>
          <p className="text-gray-600 text-sm mb-6">
            You were invited to join <strong>{invitation.teamName}</strong>. Fill in your details below.
          </p>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700"><strong>Team:</strong> {invitation.teamName}</p>
            <p className="text-sm text-gray-700"><strong>Participant 1:</strong> {invitation.p1Name}</p>
            <p className="text-sm text-gray-700"><strong>School / College:</strong> {invitation.schoolName || '—'}</p>
          </div>

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
        </div>
      </div>
    </div>
  )
}
