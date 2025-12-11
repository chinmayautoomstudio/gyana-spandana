import { z } from 'zod'

// Aadhar validation (12 digits)
const aadharRegex = /^\d{12}$/

// Phone validation (10 digits, Indian format)
const phoneRegex = /^[6-9]\d{9}$/

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password validation: min 8 chars, at least one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const participantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say'], {
    message: 'Please select a valid gender option',
  }),
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  schoolName: z.string().min(2, 'School / College name is required').max(200, 'School / College name is too long'),
  aadhar: z.string()
    .refine((val) => {
      const digitsOnly = val.replace(/\s/g, '')
      return aadharRegex.test(digitsOnly)
    }, {
      message: 'Aadhar must be exactly 12 digits'
    })
    .transform((val) => val.replace(/\s/g, '')), // Remove spaces for storage
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, and a number'),
})

export const schoolAuthoritySchema = z.object({
  name: z.string().min(2, 'Authority name must be at least 2 characters').max(100, 'Authority name is too long'),
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  phone: z.string()
    .min(1, 'Authority phone number is required')
    .regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
})

export const teamRegistrationSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(100, 'Team name is too long'),
  participant1: participantSchema,
  participant2: participantSchema,
  schoolAuthority: schoolAuthoritySchema,
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine((data) => data.participant1.email !== data.participant2.email, {
  message: 'Both participants must have different email addresses',
  path: ['participant2', 'email'],
}).refine((data) => data.participant1.aadhar !== data.participant2.aadhar, {
  message: 'Both participants must have different Aadhar numbers',
  path: ['participant2', 'aadhar'],
}).refine((data) => data.participant1.phone !== data.participant2.phone, {
  message: 'Both participants must have different phone numbers',
  path: ['participant2', 'phone'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Profile completion validation schema (all fields optional)
export const profileCompletionSchema = z.object({
  profilePhoto: z
    .custom<File | string | null | undefined>((val) => {
      // Allow null, undefined, or valid file/string
      if (val === null || val === undefined) return true
      if (typeof val === 'string') return val.length > 0
      if (val instanceof File) {
        return val.size <= 5 * 1024 * 1024 && 
               ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(val.type)
      }
      return false
    }, {
      message: 'Profile photo must be a JPG, PNG, or WebP image under 5MB',
    })
    .optional()
    .nullable(),
  address: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true
      return val.length >= 10 && val.length <= 500
    }, {
      message: 'Address must be between 10 and 500 characters if provided',
    }),
  schoolAddress: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true
      return val.length >= 10 && val.length <= 500
    }, {
      message: 'School / College address must be between 10 and 500 characters if provided',
    }),
  class: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true
      return val.length >= 1 && val.length <= 50
    }, {
      message: 'Class / Grade must be between 1 and 50 characters if provided',
    }),
  dateOfBirth: z
    .string()
    .refine((date) => {
      if (!date || date.trim() === '') return true // Optional field
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age
      return actualAge >= 10 && actualAge <= 100
    }, {
      message: 'Date of birth must be valid and age must be between 10 and 100 years',
    })
    .optional()
    .nullable(),
})

// Edit profile validation schema
export const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say'], {
    message: 'Please select a valid gender option',
  }),
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format').optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  profilePhoto: z
    .custom<File | string>((val) => val !== undefined && val !== null)
    .refine(
      (val) => {
        if (typeof val === 'string') return true // Existing photo URL
        if (val instanceof File) {
          return val.size <= 5 * 1024 * 1024 && 
                 ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(val.type)
        }
        return false
      },
      {
        message: 'Profile photo must be a JPG, PNG, or WebP image under 5MB',
      }
    )
    .optional(),
  address: z
    .string()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address is too long')
    .optional()
    .or(z.literal('')),
  schoolAddress: z
    .string()
    .min(10, 'School / College address must be at least 10 characters')
    .max(500, 'School / College address is too long')
    .optional()
    .or(z.literal('')),
  class: z
    .string()
    .min(1, 'Class / Grade is required')
    .max(50, 'Class / Grade is too long')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z
    .string()
    .optional()
    .refine((date) => {
      if (!date || date === '') return true
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age
      return actualAge >= 10 && actualAge <= 100
    }, {
      message: 'Date of birth must be valid and age must be between 10 and 100 years',
    })
    .or(z.literal('')),
})

// Admin creation validation schemas
export const createAdminSchema = z.object({
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const inviteAdminSchema = z.object({
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
})

export type TeamRegistrationFormData = z.infer<typeof teamRegistrationSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ProfileCompletionFormData = z.infer<typeof profileCompletionSchema>
export type EditProfileFormData = z.infer<typeof editProfileSchema>
export type CreateAdminFormData = z.infer<typeof createAdminSchema>
export type InviteAdminFormData = z.infer<typeof inviteAdminSchema>

