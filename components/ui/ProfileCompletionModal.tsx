'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileCompletionSchema, type ProfileCompletionFormData } from '@/lib/validations'
import { Input } from './Input'
import { Button } from './Button'
import { completeProfile } from '@/app/actions/profile'

interface ProfileCompletionModalProps {
  onComplete: () => void
  onSkip: () => void
}

export function ProfileCompletionModal({ onComplete, onSkip }: ProfileCompletionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileCompletionFormData>({
    resolver: zodResolver(profileCompletionSchema),
    mode: 'onChange',
  })

  const selectedPhoto = watch('profilePhoto')

  // Handle photo selection and preview
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue('profilePhoto', file, { shouldValidate: true })
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: ProfileCompletionFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setUploadProgress(0)

    try {
      let profilePhotoUrl: string | undefined

      // Upload profile photo if provided
      if (data.profilePhoto && data.profilePhoto instanceof File) {
        setUploadProgress(25)
        
        // Use API route for file upload to bypass Server Actions body size limit
        const formData = new FormData()
        formData.append('file', data.profilePhoto)
        
        setUploadProgress(50)
        const uploadResponse = await fetch('/api/upload/profile-photo', {
          method: 'POST',
          body: formData,
        })
        
        const uploadResult = await uploadResponse.json()
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Failed to upload profile photo')
        }
        
        profilePhotoUrl = uploadResult.url
        setUploadProgress(75)
      }

      // Complete profile (handles optional/empty fields)
      const result = await completeProfile(data, profilePhotoUrl)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save profile')
      }

      setUploadProgress(100)
      
      // Call onComplete callback to refresh dashboard
      setTimeout(() => {
        onComplete()
      }, 500)
    } catch (error: any) {
      console.error('Profile completion error:', error)
      setSubmitError(error.message || 'Failed to save profile. Please try again.')
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              <p className="text-sm text-gray-600 mt-1">
                Add additional information to your profile (optional - you can fill this later)
              </p>
            </div>
            <button
              onClick={onSkip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Profile Photo Upload */}
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

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#C0392B] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
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
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onSkip}
              disabled={isSubmitting}
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

