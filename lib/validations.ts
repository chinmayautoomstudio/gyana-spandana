import { z } from 'zod'

/** Max length for participant-created team names (registration). */
export const TEAM_NAME_MAX_LENGTH = 20

/** Trimmed team name: 2–TEAM_NAME_MAX_LENGTH characters. */
export const teamNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(2, 'Team name must be at least 2 characters')
      .max(
        TEAM_NAME_MAX_LENGTH,
        `Team name must be at most ${TEAM_NAME_MAX_LENGTH} characters`
      )
  )

// Aadhar validation (12 digits)
const aadharRegex = /^\d{12}$/

// Phone validation (10 digits, Indian format)
const phoneRegex = /^[6-9]\d{9}$/

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password validation: min 8 chars, at least one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

/** Unicode letters and single spaces between words only; trims and collapses whitespace. */
const PARTICIPANT_FULL_NAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u

export const participantFullNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long')
      .regex(PARTICIPANT_FULL_NAME_PATTERN, {
        message: 'Name can only contain letters and spaces (no numbers or symbols)',
      })
  )

function ageFromDateString(dateStr: string): number {
  const birthDate = new Date(dateStr)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ? age - 1
    : age
}

/** Inclusive age bounds for participant date of birth (school quiz eligibility). */
export const PARTICIPANT_MIN_AGE = 14
export const PARTICIPANT_MAX_AGE = 18

/** Non-empty date string; age must be between PARTICIPANT_MIN_AGE and PARTICIPANT_MAX_AGE (inclusive). */
export const requiredDateOfBirthSchema = z
  .string()
  .min(1, 'Date of birth is required')
  .refine((date) => !Number.isNaN(new Date(date).getTime()), {
    message: 'Date of birth must be a valid date',
  })
  .refine((date) => {
    const actualAge = ageFromDateString(date)
    return actualAge >= PARTICIPANT_MIN_AGE && actualAge <= PARTICIPANT_MAX_AGE
  }, {
    message: `Date of birth must be valid and age must be between ${PARTICIPANT_MIN_AGE} and ${PARTICIPANT_MAX_AGE} years`,
  })

export const participantSchema = z.object({
  name: participantFullNameSchema,
  gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a valid gender option',
  }),
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  class: z.enum(
    ['Class X', 'Class XI/+2 First Year', 'Class XII/+2 Second Year'],
    { message: 'Please select your class' }
  ),
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

/** Attestation checkboxes: must be checked; normalizes unknown / "on" / boolean from HTML + RHF. */
function requiredChecked(message: string) {
  return z
    .unknown()
    .transform((val) => val === true || val === 'on')
    .pipe(
      z.boolean().refine((v) => v === true, {
        message,
      })
    )
}

/** RHF + Zod v4 infer `unknown` for piped checkbox fields; forms use boolean in state. */
type WithAccurateConsentBooleans<T> = Omit<T, 'informationAccurate' | 'consent'> & {
  informationAccurate: boolean
  consent: boolean
}

// Optional authority: all fields optional; when present and non-empty, validate format
export const schoolAuthorityOptionalSchema = z.object({
  name: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || (val.length >= 2 && val.length <= 100), {
      message: 'Authority name must be at least 2 characters and at most 100',
    }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || emailRegex.test(val), {
      message: 'Invalid email address',
    }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || phoneRegex.test(val.replace(/\s/g, '')), {
      message: 'Phone must be a valid 10-digit Indian mobile number',
    }),
})

// P1 creates team and invites P2 (two-step registration)
export const teamCreationSchema = z.object({
  p1Name: participantFullNameSchema,
  teamName: teamNameSchema,
  schoolName: z.string().min(2, 'School / College name is required').max(200, 'School / College name is too long'),
  p2Email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  p1Gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a valid gender option',
  }),
  p1Phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  p1Aadhar: z
    .string()
    .refine((val) => aadharRegex.test((val || '').replace(/\s/g, '')), {
      message: 'Aadhar must be exactly 12 digits',
    })
    .transform((val) => val.replace(/\s/g, '')),
  p1Class: z.enum(
    ['Class X', 'Class XI/+2 First Year', 'Class XII/+2 Second Year'],
    { message: 'Please select your class' }
  ),
  p1DateOfBirth: requiredDateOfBirthSchema,
  schoolAuthority: schoolAuthorityOptionalSchema,
  informationAccurate: requiredChecked('Please confirm that your information is accurate'),
  consent: requiredChecked('You must agree to the terms and conditions'),
})

// P2 completes registration via invitation link
export const p2RegistrationSchema = z.object({
  name: participantFullNameSchema,
  gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a valid gender option',
  }),
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  aadhar: z
    .string()
    .refine((val) => aadharRegex.test((val || '').replace(/\s/g, '')), {
      message: 'Aadhar must be exactly 12 digits',
    })
    .transform((val) => val.replace(/\s/g, '')),
  class: z.enum(
    ['Class X', 'Class XI/+2 First Year', 'Class XII/+2 Second Year'],
    { message: 'Please select your class' }
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, and a number'),
  dateOfBirth: requiredDateOfBirthSchema,
  informationAccurate: requiredChecked('Please confirm that your information is accurate'),
  consent: requiredChecked('You must agree to the terms and conditions'),
})

// P2 completes registration via invitation using existing Google account (no password)
export const p2RegistrationWithGoogleSchema = z.object({
  name: participantFullNameSchema,
  gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a valid gender option',
  }),
  phone: z.string().regex(phoneRegex, 'Phone must be a valid 10-digit Indian mobile number'),
  aadhar: z
    .string()
    .refine((val) => aadharRegex.test((val || '').replace(/\s/g, '')), {
      message: 'Aadhar must be exactly 12 digits',
    })
    .transform((val) => val.replace(/\s/g, '')),
  class: z.enum(
    ['Class X', 'Class XI/+2 First Year', 'Class XII/+2 Second Year'],
    { message: 'Please select your class' }
  ),
  dateOfBirth: requiredDateOfBirthSchema,
  informationAccurate: requiredChecked('Please confirm that your information is accurate'),
  consent: requiredChecked('You must agree to the terms and conditions'),
})


export const teamRegistrationSchema = z.object({
  teamName: teamNameSchema,
  schoolName: z.string().min(2, 'School / College name is required').max(200, 'School / College name is too long'),
  participant1: participantSchema,
  participant2: participantSchema,
  schoolAuthority: schoolAuthorityOptionalSchema,
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine(
  (data) =>
    data.participant1.email.trim().toLowerCase() !== data.participant2.email.trim().toLowerCase(),
  { message: 'Both participants must have different email addresses', path: ['participant2', 'email'] }
).refine((data) => data.participant1.aadhar !== data.participant2.aadhar, {
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

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address').regex(emailRegex, 'Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain uppercase, lowercase, and a number'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(passwordRegex, 'Password must contain uppercase, lowercase, and a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Profile completion: date of birth required; photo, address, school address optional
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

  dateOfBirth: requiredDateOfBirthSchema,
})

// Edit profile validation schema
export const editProfileSchema = z.object({
  name: participantFullNameSchema,
  gender: z.enum(['Male', 'Female', 'Other'], {
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
  dateOfBirth: requiredDateOfBirthSchema,
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

export type TeamCreationFormData = WithAccurateConsentBooleans<z.infer<typeof teamCreationSchema>>
export type P2RegistrationFormData = WithAccurateConsentBooleans<z.infer<typeof p2RegistrationSchema>>
export type P2RegistrationWithGoogleFormData = WithAccurateConsentBooleans<
  z.infer<typeof p2RegistrationWithGoogleSchema>
>
export type TeamRegistrationFormData = z.infer<typeof teamRegistrationSchema>
export type SignUpFormData = z.infer<typeof signUpSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ProfileCompletionFormData = z.infer<typeof profileCompletionSchema>
export type EditProfileFormData = z.infer<typeof editProfileSchema>
export type CreateAdminFormData = z.infer<typeof createAdminSchema>
export type InviteAdminFormData = z.infer<typeof inviteAdminSchema>

