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
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  schoolName: z.string().min(2, 'School name is required').max(200, 'School name is too long'),
  aadhar: z.string().regex(aadharRegex, 'Aadhar must be exactly 12 digits'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, and a number'),
})

export const teamRegistrationSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(100, 'Team name is too long'),
  participant1: participantSchema,
  participant2: participantSchema,
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

export type TeamRegistrationFormData = z.infer<typeof teamRegistrationSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

