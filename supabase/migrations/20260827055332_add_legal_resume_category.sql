begin;

alter table public.jobs
  drop constraint if exists jobs_resume_category_check;
alter table public.jobs
  add constraint jobs_resume_category_check
  check (
    resume_category is null or resume_category = any (array[
      'technology_product_data'::text,
      'finance_accounting'::text,
      'sales_marketing'::text,
      'legal'::text,
      'human_resources_admin_operations'::text,
      'hospitality_retail_customer_service'::text,
      'general_professional_other'::text
    ])
  );

alter table public.resume_generation_attempts
  drop constraint if exists resume_generation_attempts_resume_category_check;
alter table public.resume_generation_attempts
  add constraint resume_generation_attempts_resume_category_check
  check (resume_category = any (array[
    'technology_product_data'::text,
    'finance_accounting'::text,
    'sales_marketing'::text,
    'legal'::text,
    'human_resources_admin_operations'::text,
    'hospitality_retail_customer_service'::text,
    'general_professional_other'::text
  ]));

alter table public.user_generated_resume_drafts
  drop constraint if exists user_generated_resume_drafts_resume_category_check;
alter table public.user_generated_resume_drafts
  add constraint user_generated_resume_drafts_resume_category_check
  check (resume_category = any (array[
    'technology_product_data'::text,
    'finance_accounting'::text,
    'sales_marketing'::text,
    'legal'::text,
    'human_resources_admin_operations'::text,
    'hospitality_retail_customer_service'::text,
    'general_professional_other'::text
  ]));

alter table public.user_generated_resumes
  drop constraint if exists user_generated_resumes_resume_category_check;
alter table public.user_generated_resumes
  add constraint user_generated_resumes_resume_category_check
  check (resume_category = any (array[
    'technology_product_data'::text,
    'finance_accounting'::text,
    'sales_marketing'::text,
    'legal'::text,
    'human_resources_admin_operations'::text,
    'hospitality_retail_customer_service'::text,
    'general_professional_other'::text
  ]));

commit;
