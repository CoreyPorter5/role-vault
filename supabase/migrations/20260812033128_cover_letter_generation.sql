alter table public.profiles
  add column if not exists cover_letter_generations_used integer not null default 0,
  add column if not exists cover_letter_generations_limit integer not null default 3;

alter table public.profiles
  add constraint profiles_cover_letter_generations_used_nonnegative
    check (cover_letter_generations_used >= 0) not valid,
  add constraint profiles_cover_letter_generations_limit_positive
    check (cover_letter_generations_limit > 0) not valid;

alter table public.profiles
  validate constraint profiles_cover_letter_generations_used_nonnegative;

alter table public.profiles
  validate constraint profiles_cover_letter_generations_limit_positive;

create table public.cover_letter_generation_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  seek_job_id text not null,
  status text not null default 'reserved',
  model text not null,
  template_version text not null,
  usage_period_start timestamptz not null,
  result_json jsonb,
  token_usage jsonb,
  failure_code text,
  failure_detail text,
  attempt_count integer not null default 0,
  repair_attempted boolean not null default false,
  credit_charged boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz,
  constraint cover_letter_generation_attempts_user_job_fkey
    foreign key (user_id, seek_job_id)
    references public.jobs(user_id, seek_job_id)
    on delete cascade,
  constraint cover_letter_generation_attempts_status_check
    check (status in ('reserved', 'succeeded', 'refunded')),
  constraint cover_letter_generation_attempts_attempt_count_nonnegative
    check (attempt_count >= 0),
  constraint cover_letter_generation_attempts_template_version_not_blank
    check (length(btrim(template_version)) > 0),
  constraint cover_letter_generation_attempts_terminal_state_check
    check (
      (status = 'reserved' and completed_at is null and refunded_at is null)
      or (status = 'succeeded' and result_json is not null and completed_at is not null and refunded_at is null)
      or (status = 'refunded' and completed_at is null and refunded_at is not null)
    )
);

create index cover_letter_generation_attempts_user_created_idx
  on public.cover_letter_generation_attempts (user_id, created_at desc);

create index cover_letter_generation_attempts_user_status_created_idx
  on public.cover_letter_generation_attempts (user_id, status, created_at);

create index cover_letter_generation_attempts_user_job_idx
  on public.cover_letter_generation_attempts (user_id, seek_job_id);

create table public.user_generated_cover_letter_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  seek_job_id text not null,
  cover_letter_json jsonb not null,
  template_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint user_generated_cover_letter_drafts_user_job_unique
    unique (user_id, seek_job_id),
  constraint user_generated_cover_letter_drafts_user_job_fkey
    foreign key (user_id, seek_job_id)
    references public.jobs(user_id, seek_job_id)
    on delete cascade,
  constraint user_generated_cover_letter_drafts_template_version_not_blank
    check (length(btrim(template_version)) > 0)
);

create index user_generated_cover_letter_drafts_user_updated_idx
  on public.user_generated_cover_letter_drafts (user_id, updated_at desc);

create table public.user_generated_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  seek_job_id text not null,
  cover_letter_json jsonb not null,
  template_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_generated_cover_letters_user_job_unique
    unique (user_id, seek_job_id),
  constraint user_generated_cover_letters_user_job_fkey
    foreign key (user_id, seek_job_id)
    references public.jobs(user_id, seek_job_id)
    on delete cascade,
  constraint user_generated_cover_letters_template_version_not_blank
    check (length(btrim(template_version)) > 0)
);

create index user_generated_cover_letters_user_updated_idx
  on public.user_generated_cover_letters (user_id, updated_at desc);

alter table public.cover_letter_generation_attempts enable row level security;
alter table public.user_generated_cover_letter_drafts enable row level security;
alter table public.user_generated_cover_letters enable row level security;

revoke all on table public.cover_letter_generation_attempts from anon, authenticated;
revoke all on table public.user_generated_cover_letter_drafts from anon, authenticated;
revoke all on table public.user_generated_cover_letters from anon, authenticated;

grant all on table public.cover_letter_generation_attempts to service_role;
grant all on table public.user_generated_cover_letter_drafts to service_role;
grant all on table public.user_generated_cover_letters to service_role;
