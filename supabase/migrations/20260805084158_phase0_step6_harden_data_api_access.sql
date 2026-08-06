begin;

-- The Go API is the only public interface for application data. Keep the
-- browser-facing Data API closed by default, then grant only the two flows
-- that the Next.js app intentionally performs with a user session:
--   * create/read the caller's profile
--   * read the caller's master-resume metadata
-- Service-role and direct Postgres access are intentionally unaffected.

alter table public.jobs enable row level security;
alter table public.profiles enable row level security;
alter table public.resume_generation_attempts enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.user_generated_resume_drafts enable row level security;
alter table public.user_generated_resumes enable row level security;
alter table public.user_master_resumes enable row level security;

drop policy if exists "Enable read access for all users"
  on public.jobs;

drop policy if exists "Enable insert for users based on user_id"
  on public.profiles;

drop policy if exists "Enable users to view their own data only"
  on public.profiles;

drop policy if exists "Enable users to view their own data only"
  on public.user_master_resumes;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_master_resumes_select_own
  on public.user_master_resumes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Remove legacy blanket Data API grants, including privileges inherited from
-- PUBLIC. RLS remains enabled as a second, independent authorization layer.
revoke all privileges on all tables in schema public
  from public, anon, authenticated;

revoke all privileges on all sequences in schema public
  from public, anon, authenticated;

revoke execute on all functions in schema public
  from public, anon, authenticated;

-- Profile creation is intentionally column-limited so a signed-in user cannot
-- choose their plan, quota, Stripe state, or usage counters. Period dates use
-- trusted database defaults.
grant select on table public.profiles to authenticated;

grant insert (
  user_id,
  email,
  first_name,
  last_name
) on table public.profiles to authenticated;

grant select on table public.user_master_resumes to authenticated;

-- Match Supabase's secure Data API defaults for every future object. New
-- browser access must be explicitly granted alongside an RLS policy.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
