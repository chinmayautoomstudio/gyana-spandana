import { getCachedSupabaseUser } from '@/lib/dashboard/cached-auth'
import {
  PARTICIPANT_WITH_TEAM_SELECT,
  type DashboardParticipantRow,
  type DashboardInitialUser,
} from '@/lib/dashboard/dashboard-types'
import { updateExamStatuses } from '@/lib/utils/examScheduler'
import { getAvailableExams } from '@/app/actions/exam'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

type DashboardPageProps = {
  searchParams: Promise<{ invitation_sent?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams
  const initialShowInvitationBanner = sp.invitation_sent === '1'
  const { supabase, user } = await getCachedSupabaseUser()

  if (!user) {
    return null
  }

  await updateExamStatuses(supabase)

  const { data: participantRaw } = await supabase
            .from('participants')
            .select(PARTICIPANT_WITH_TEAM_SELECT)
    .eq('user_id', user.id)
    .maybeSingle()

        const participant = participantRaw as DashboardParticipantRow | null
        if (!participant) {
    return null
        }

        const teammatePromise =
          participant.team_id != null
            ? supabase
                .from('participants')
                .select('name, email, school_name, is_participant1')
                .eq('team_id', participant.team_id)
          .neq('user_id', user.id)
                .maybeSingle()
      : Promise.resolve({
          data: null as {
            name: string
            email: string
            school_name: string
            is_participant1: boolean
          } | null,
        })

  const [teammateRes, availableExams] = await Promise.all([teammatePromise, getAvailableExams()])

  const initialUser: DashboardInitialUser = {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as Record<string, unknown>,
  }

  return (
    <DashboardClient
      initialUser={initialUser}
      initialParticipant={participant}
      initialTeammate={teammateRes.data ?? null}
      initialAvailableExamsCount={availableExams.length}
      initialShowInvitationBanner={initialShowInvitationBanner}
    />
  )
}
