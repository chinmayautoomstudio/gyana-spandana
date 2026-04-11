-- One-time team rename tracking: null = rename still allowed; set when P1 uses rename.
alter table public.teams
  add column if not exists team_name_renamed_at timestamptz null;

comment on column public.teams.team_name_renamed_at is
  'Set when Participant 1 uses their one-time team rename; admins may clear to allow another rename.';
