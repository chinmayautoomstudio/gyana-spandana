export const PARTICIPANT_WITH_TEAM_SELECT = [
  'id',
  'user_id',
  'name',
  'email',
  'phone',
  'school_name',
  'is_participant1',
  'profile_completed',
  'profile_photo_url',
  'gender',
  'date_of_birth',
  'address',
  'school_address',
  'class',
  'aadhar',
  'created_at',
  'team_id',
  'email_verified',
  'phone_verified',
  'teams(team_name, team_code, created_at, status, p2_invited_email, authority_name, authority_email, authority_phone)',
].join(', ')

export type DashboardParticipantRow = {
  id: string
  user_id: string
  name: string
  email: string
  phone: string
  school_name: string
  is_participant1: boolean
  profile_completed: boolean
  profile_photo_url: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  school_address: string | null
  class: string | null
  aadhar: string | null
  created_at: string
  team_id: string | null
  email_verified?: boolean | null
  phone_verified?: boolean | null
  teams: {
    team_name: string
    team_code: string
    created_at: string
    status: string
    p2_invited_email: string | null
    authority_name: string | null
    authority_email: string | null
    authority_phone: string | null
  } | null
}

export type DashboardTeammateRow = {
  name: string
  email: string
  school_name: string
  is_participant1: boolean
}

/** Serializable subset passed from RSC to the dashboard client. */
export type DashboardInitialUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}
