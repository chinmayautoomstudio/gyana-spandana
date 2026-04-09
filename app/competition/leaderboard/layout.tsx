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
  return children
}
