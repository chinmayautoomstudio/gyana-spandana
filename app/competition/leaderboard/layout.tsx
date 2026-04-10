import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Competition Leaderboard | GYANA SPARDHA',
  description:
    'View live team rankings for the GYANA SPARDHA Odisha quiz competition. Scores update in real time.',
}

export default function CompetitionLeaderboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-24 text-gray-900 md:pt-32">
      {children}
    </div>
  )
}
