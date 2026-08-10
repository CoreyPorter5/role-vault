begin;

alter table public.jobs
  add column resume_category text,
  add column resume_category_source text,
  add column resume_category_confidence double precision,
  add column resume_category_status text not null default 'unclassified',
  add column resume_category_classifier_model text,
  add column resume_category_classifier_version integer,
  add column resume_category_failure_code text,
  add column resume_category_started_at timestamp with time zone,
  add column resume_category_resolved_at timestamp with time zone;

alter table public.jobs
  add constraint jobs_resume_category_check
    check (
      resume_category is null
      or resume_category in (
        'technology_product_data',
        'finance_accounting',
        'sales_marketing',
        'human_resources_admin_operations',
        'hospitality_retail_customer_service',
        'general_professional_other'
      )
    ),
  add constraint jobs_resume_category_source_check
    check (resume_category_source is null or resume_category_source in ('ai', 'user')),
  add constraint jobs_resume_category_confidence_check
    check (
      resume_category_confidence is null
      or (resume_category_confidence >= 0 and resume_category_confidence <= 1)
    ),
  add constraint jobs_resume_category_status_check
    check (resume_category_status in ('unclassified', 'classifying', 'classified', 'failed')),
  add constraint jobs_resume_category_classifier_version_positive
    check (resume_category_classifier_version is null or resume_category_classifier_version > 0),
  add constraint jobs_resume_category_state_check
    check (
      (
        resume_category_status = 'unclassified'
        and resume_category is null
        and resume_category_source is null
        and resume_category_started_at is null
        and resume_category_resolved_at is null
      )
      or
      (
        resume_category_status = 'classifying'
        and resume_category is null
        and resume_category_source is null
        and resume_category_started_at is not null
        and resume_category_resolved_at is null
      )
      or
      (
        resume_category_status = 'classified'
        and resume_category is not null
        and resume_category_source is not null
        and resume_category_resolved_at is not null
        and resume_category_failure_code is null
      )
      or
      (
        resume_category_status = 'failed'
        and resume_category is null
        and resume_category_source is null
        and resume_category_resolved_at is not null
        and resume_category_failure_code is not null
      )
    );

alter table public.resume_generation_attempts
  add column resume_category text,
  add column profile_version integer,
  add column template_version text;

alter table public.user_generated_resume_drafts
  add column resume_category text,
  add column profile_version integer,
  add column template_version text;

alter table public.user_generated_resumes
  add column resume_category text,
  add column profile_version integer,
  add column template_version text;

-- All historical generated data used the original technology-focused profile
-- and the original Seek Sync ATS skeleton.
update public.resume_generation_attempts
set resume_category = 'technology_product_data',
    profile_version = 1,
    template_version = 'technology_product_data_v1';

update public.user_generated_resume_drafts
set resume_category = 'technology_product_data',
    profile_version = 1,
    template_version = 'technology_product_data_v1';

update public.user_generated_resumes
set resume_category = 'technology_product_data',
    profile_version = 1,
    template_version = 'technology_product_data_v1';

alter table public.resume_generation_attempts
  alter column resume_category set not null,
  alter column profile_version set not null,
  alter column template_version set not null,
  add constraint resume_generation_attempts_resume_category_check
    check (
      resume_category in (
        'technology_product_data',
        'finance_accounting',
        'sales_marketing',
        'human_resources_admin_operations',
        'hospitality_retail_customer_service',
        'general_professional_other'
      )
    ),
  add constraint resume_generation_attempts_profile_version_positive
    check (profile_version > 0),
  add constraint resume_generation_attempts_template_version_not_blank
    check (length(btrim(template_version)) > 0);

alter table public.user_generated_resume_drafts
  alter column resume_category set not null,
  alter column profile_version set not null,
  alter column template_version set not null,
  add constraint user_generated_resume_drafts_resume_category_check
    check (
      resume_category in (
        'technology_product_data',
        'finance_accounting',
        'sales_marketing',
        'human_resources_admin_operations',
        'hospitality_retail_customer_service',
        'general_professional_other'
      )
    ),
  add constraint user_generated_resume_drafts_profile_version_positive
    check (profile_version > 0),
  add constraint user_generated_resume_drafts_template_version_not_blank
    check (length(btrim(template_version)) > 0);

alter table public.user_generated_resumes
  alter column resume_category set not null,
  alter column profile_version set not null,
  alter column template_version set not null,
  add constraint user_generated_resumes_resume_category_check
    check (
      resume_category in (
        'technology_product_data',
        'finance_accounting',
        'sales_marketing',
        'human_resources_admin_operations',
        'hospitality_retail_customer_service',
        'general_professional_other'
      )
    ),
  add constraint user_generated_resumes_profile_version_positive
    check (profile_version > 0),
  add constraint user_generated_resumes_template_version_not_blank
    check (length(btrim(template_version)) > 0);

commit;
