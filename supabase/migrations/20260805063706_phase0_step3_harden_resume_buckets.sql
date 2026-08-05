-- Resume uploads are DOCX-only in the application. Mirror that boundary in
-- Storage so direct or accidentally misconfigured clients cannot bypass it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'master-resume',
    'master-resume',
    false,
    5242880,
    array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
  ),
  (
    'generated_resumes',
    'generated_resumes',
    false,
    5242880,
    array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
