begin;

-- Keep the database column aligned with the API and generated frontend types.
alter table public.profiles
  rename column resume_generation_limit to resume_generations_limit;

-- Existing users keep their current period. Missing or invalid periods are
-- initialised once; subsequent free periods are exact 30-day windows.
update public.profiles
set resume_usage_period_start = coalesce(
  resume_usage_period_start,
  created_at,
  now()
);

update public.profiles
set resume_usage_period_end = resume_usage_period_start + interval '30 days'
where resume_usage_period_end is null
   or resume_usage_period_end <= resume_usage_period_start;

alter table public.profiles
  alter column resume_usage_period_start set default now(),
  alter column resume_usage_period_start set not null,
  alter column resume_usage_period_end set default (now() + interval '30 days'),
  alter column resume_usage_period_end set not null,
  add column stripe_state_event_created_at bigint not null default 0,
  add column stripe_state_event_priority smallint not null default 0,
  add column stripe_last_event_id text;

alter table public.profiles
  add constraint profiles_resume_generations_used_nonnegative
    check (resume_generations_used >= 0) not valid,
  add constraint profiles_resume_generations_limit_positive
    check (resume_generations_limit > 0) not valid,
  add constraint profiles_resume_usage_period_valid
    check (resume_usage_period_end > resume_usage_period_start) not valid;

alter table public.profiles
  validate constraint profiles_resume_generations_used_nonnegative;

alter table public.profiles
  validate constraint profiles_resume_generations_limit_positive;

alter table public.profiles
  validate constraint profiles_resume_usage_period_valid;

-- This global constraint prevented two different users from having a draft
-- for the same Seek job. The existing per-user constraint is the correct one.
alter table public.user_generated_resume_drafts
  drop constraint if exists user_generated_resume_drafts_seek_job_id_key;

create table public.resume_generation_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  seek_job_id text not null,
  status text not null default 'reserved',
  model text not null,
  usage_period_start timestamp with time zone not null,
  result_json jsonb,
  token_usage jsonb,
  failure_code text,
  failure_detail text,
  attempt_count integer not null default 0,
  repair_attempted boolean not null default false,
  credit_charged boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  refunded_at timestamp with time zone,
  constraint resume_generation_attempts_status_check
    check (status in ('reserved', 'succeeded', 'refunded')),
  constraint resume_generation_attempts_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint resume_generation_attempts_terminal_state_check
    check (
      (status = 'reserved' and completed_at is null and refunded_at is null)
      or
      (status = 'succeeded' and result_json is not null and completed_at is not null and refunded_at is null)
      or
      (status = 'refunded' and completed_at is null and refunded_at is not null)
    )
);

create index resume_generation_attempts_user_created_idx
  on public.resume_generation_attempts (user_id, created_at desc);

create index resume_generation_attempts_user_status_created_idx
  on public.resume_generation_attempts (user_id, status, created_at);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  object_id text,
  event_created_at bigint not null,
  processed_at timestamp with time zone not null default now()
);

create index stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

alter table public.resume_generation_attempts enable row level security;
alter table public.stripe_webhook_events enable row level security;

-- These are internal ledgers. They are intentionally unavailable through the
-- browser-facing Data API; the Go service uses its direct database connection.
revoke all on table public.resume_generation_attempts from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant all on table public.resume_generation_attempts to service_role;
grant all on table public.stripe_webhook_events to service_role;

commit;
