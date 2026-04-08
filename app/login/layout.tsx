import { redirectAuthenticatedAwayFromAuthPages } from '@/lib/auth/redirect-if-logged-in'

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectAuthenticatedAwayFromAuthPages()
  return <>{children}</>
}
