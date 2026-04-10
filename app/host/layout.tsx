import { HostDashboardShell } from '@/components/host/HostDashboardShell'

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <HostDashboardShell>{children}</HostDashboardShell>
}
