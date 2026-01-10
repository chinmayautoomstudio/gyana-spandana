'use client'

import LoginForm from './LoginForm'
import { ErrorBoundary } from '@/components/debug/ErrorBoundary'

export default function LoginPage() {
  return (
    <ErrorBoundary onError={(e) => console.error(e)}>
      <LoginForm />
    </ErrorBoundary>
  )
}