'use client'

import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (pwd.length >= 8) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[^a-zA-Z\d]/.test(pwd)) score++

    const levels = [
      { label: 'Very Weak', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-orange-500' },
      { label: 'Fair', color: 'bg-yellow-500' },
      { label: 'Good', color: 'bg-blue-500' },
      { label: 'Strong', color: 'bg-green-500' },
    ]

    return {
      score: Math.min(score, 5),
      label: levels[Math.min(score - 1, 4)]?.label || '',
      color: levels[Math.min(score - 1, 4)]?.color || '',
    }
  }

  const { score, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', color)}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        {label && (
          <span className="text-xs font-medium text-gray-600">{label}</span>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Password must contain: uppercase, lowercase, and a number
      </div>
    </div>
  )
}

