'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy /register route. Registration is now a two-step flow:
 * 1. Sign up at /signup (email or Google)
 * 2. Create team at /team/create
 * P2 registers via /register/invite/[token]
 */
export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/signup')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ECF0F1]">
      <p className="text-gray-600">Redirecting to sign up...</p>
    </div>
  )
}
