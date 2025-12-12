'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { editProfileSchema, type EditProfileFormData } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmailVerification } from '@/components/ui/EmailVerification'
import { updateProfile } from '@/app/actions/profile'

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Email OTP verification state
  const [emailChanged, setEmailChanged] = useState(false)
  const [newEmail, setNewEmail] = useState<string>('')
  const [emailVerified, setEmailVerified] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onChange',
  })

  const selectedPhoto = watch('profilePhoto')
  const currentEmail = watch('email')
  
  // Monitor email changes
  useEffect(() => {
    if (participantData && currentEmail) {
      const emailIsChanged = currentEmail !== participantData.email
      setEmailChanged(emailIsChanged)
      if (emailIsChanged) {
        setNewEmail(currentEmail)
        setEmailVerified(false) // Reset verification when email changes
      } else {
        setEmailVerified(true) // Email not changed, consider it verified
      }
    }
  }, [currentEmail, participantData])

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: participant } = await supabase
        .from('participants')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (participant) {
        setParticipantData(participant)
        
        // Pre-populate form
        setValue('name', participant.name)
        setValue('gender', participant.gender || 'Prefer not to say')
        setValue('email', participant.email)
        setValue('phone', participant.phone)
        setValue('address', participant.address || '')
        setValue('schoolAddress', participant.school_address || '')
        setValue('class', participant.class || '')
        setValue('dateOfBirth', participant.date_of_birth || '')
        setValue('profilePhoto', participant.profile_photo_url || '')
        
        if (participant.profile_photo_url) {
          setPhotoPreview(participant.profile_photo_url)
        }
      }

      setLoading(false)
    }

    fetchProfile()
  }, [router, setValue])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue('profilePhoto', file, { shouldValidate: true })
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // OTP Send Function
  const handleSendOTP = async () => {
    if (!newEmail) {
      throw new Error('Email is required')
    }
    
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: newEmail,
    })
    
    if (error) {
      throw new Error(error.message)
    }
  }

  // OTP Verify Function
  const handleVerifyOTP = async (otpCode: string) => {
    if (!newEmail || !otpCode) {
      throw new Error('Email and OTP code are required')
    }
    
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: newEmail,
      token: otpCode,
      type: 'email',
    })
    
    if (error) {
      throw new Error(error.message)
    }
    
    // OTP verified successfully
    setEmailVerified(true)
    
    // Note: We don't sign out here (unlike registration) to keep user session
  }

  const onSubmit = async (data: EditProfileFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      let profilePhotoUrl: string | undefined = undefined

      // Upload new photo if provided
      if (data.profilePhoto && data.profilePhoto instanceof File) {
        // Use API route for file upload to bypass Server Actions body size limit
        const formData = new FormData()
        formData.append('file', data.profilePhoto)
        
        const uploadResponse = await fetch('/api/upload/profile-photo', {
          method: 'POST',
          body: formData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload profile photo')
        }
        
        profilePhotoUrl = uploadResult.url
      } else if (typeof data.profilePhoto === 'string' && data.profilePhoto) {
        // Keep existing photo
        profilePhotoUrl = data.profilePhoto
      }

      // Check if email was changed and if it's verified
      if (emailChanged && !emailVerified) {
        throw new Error('Please verify your new email address with OTP before saving changes.')
      }

      // Update profile
      const result = await updateProfile({
        name: data.name,
        gender: data.gender,
        email: emailChanged && emailVerified ? newEmail : (data.email && data.email !== participantData?.email ? data.email : undefined),
        phone: data.phone && data.phone !== participantData?.phone ? data.phone : undefined,
        address: data.address || undefined,
        schoolAddress: data.schoolAddress || undefined,
        class: data.class || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        profilePhoto: profilePhotoUrl,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Profile update error:', error)
      setSubmitError(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0392B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF0F1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Update your profile information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8">
          <div className="space-y-6">
            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, or WebP. Max size: 5MB
                  </p>
                  {errors.profilePhoto && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <span>⚠</span>
                      {errors.profilePhoto.message as string}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <Input
              label="Full Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter full name"
              required
            />

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                {...register('gender')}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 ${
                  errors.gender
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'
                }`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠</span>
                  {errors.gender.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="example@email.com"
              />
              
              {/* Email OTP Verification - Show only if email is changed */}
              {emailChanged && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Email address changed. Please verify your new email address:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('email', participantData?.email || '')
                        setEmailChanged(false)
                        setEmailVerified(false)
                        setNewEmail('')
                      }}
                      className="text-sm text-[#C0392B] hover:text-[#A93226] font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  <EmailVerification
                    email={newEmail}
                    isVerified={emailVerified}
                    onSendOTP={handleSendOTP}
                    onVerifyOTP={handleVerifyOTP}
                    disabled={isSubmitting}
                  />
                  {emailVerified && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ Email verified. You can now save your changes.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Phone */}
            <Input
              label="Phone Number"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="9876543210"
              maxLength={10}
            />

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Residential Address
              </label>
              <textarea
                id="address"
                {...register('address')}
                rows={3}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 placeholder:text-gray-400 ${
                  errors.address
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'
                }`}
                placeholder="Enter your full residential address"
              />
              {errors.address && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠</span>
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* School Address */}
            <div>
              <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700 mb-2">
                School / College Address
              </label>
              <textarea
                id="schoolAddress"
                {...register('schoolAddress')}
                rows={3}
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 placeholder:text-gray-400 ${
                  errors.schoolAddress
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#C0392B] focus:border-[#C0392B]'
                }`}
                placeholder="Enter your school/college address"
              />
              {errors.schoolAddress && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠</span>
                  {errors.schoolAddress.message}
                </p>
              )}
            </div>

            {/* Class */}
            <Input
              label="Class / Grade"
              {...register('class')}
              error={errors.class?.message}
              placeholder="e.g., 10th, 12th, B.Tech 2nd Year"
            />

            {/* Date of Birth */}
            <Input
              label="Date of Birth"
              type="date"
              {...register('dateOfBirth')}
              error={errors.dateOfBirth?.message}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
            />

            {/* Success Message */}
            {submitSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Profile updated successfully! Redirecting to dashboard...
                </p>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <span>⚠</span>
                  {submitError}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={isSubmitting || (emailChanged && !emailVerified)}
              >
                Save Changes
              </Button>
              {emailChanged && !emailVerified && (
                <p className="text-sm text-amber-600 mt-2">
                  Please verify your new email address before saving changes.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

