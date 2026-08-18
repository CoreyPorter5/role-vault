begin;

alter table public.profiles
  add column job_classifications_used integer not null default 0,
  add column job_classifications_limit integer not null default 50,
  add column job_classification_period_start timestamp with time zone not null default now(),
  add column job_classification_period_end timestamp with time zone not null default (now() + interval '24 hours'),
  add constraint profiles_job_classifications_used_nonnegative
    check (job_classifications_used >= 0),
  add constraint profiles_job_classifications_limit_positive
    check (job_classifications_limit > 0),
  add constraint profiles_job_classification_period_valid
    check (job_classification_period_end > job_classification_period_start);

comment on column public.profiles.job_classifications_used is
  'AI job-classification claims consumed in the current rolling 24-hour period.';

comment on column public.profiles.job_classifications_limit is
  'Maximum AI job-classification claims allowed in one rolling 24-hour period.';

commit;
