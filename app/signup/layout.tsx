import { redirectAuthenticatedAwayFromAuthPages } from '@/lib/auth/redirect-if-logged-in'

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectAuthenticatedAwayFromAuthPages()
  return <>{children}</>
}
