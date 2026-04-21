alter table public.teams
add column if not exists is_eliminated boolean not null default false;
