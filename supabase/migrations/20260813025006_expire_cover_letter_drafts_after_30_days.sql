create index if not exists user_generated_cover_letter_drafts_expires_idx
  on public.user_generated_cover_letter_drafts (expires_at);

select cron.schedule(
  'delete-expired-cover-letter-drafts',
  '17 * * * *',
  $$delete from public.user_generated_cover_letter_drafts where expires_at <= now()$$
);
