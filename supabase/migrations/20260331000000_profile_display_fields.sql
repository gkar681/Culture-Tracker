-- Run this in Supabase SQL Editor if these columns are missing.
-- Profiles row is created at sign-up (id = auth.users.id).

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists lab_name text,
  add column if not exists bio text;

comment on column public.profiles.display_name is 'User display name';
comment on column public.profiles.lab_name is 'Lab or group name';
comment on column public.profiles.bio is 'Short description / notes';
