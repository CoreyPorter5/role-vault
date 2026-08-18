begin;

-- Document credits replace the separate monthly resume and cover-letter
-- allowances. Promotional credits are spent before purchased credits, while
-- the product presents their sum as one simple balance.
alter table public.profiles
  add column document_credits_promotional integer not null default 6,
  add column document_credits_purchased integer not null default 0;

-- Preserve every existing user's unused allowance. Paid/trial allowance is
-- converted to non-expiring purchased credit; free allowance remains
-- promotional. The legacy fields remain temporarily for rollback and historic
-- subscription reconciliation, but generation no longer consumes them.
update public.profiles
set document_credits_promotional = case
      when plan in ('pro', 'trial') then 0
      else greatest(resume_generations_limit - resume_generations_used, 0)
         + greatest(cover_letter_generations_limit - cover_letter_generations_used, 0)
    end,
    document_credits_purchased = case
      when plan in ('pro', 'trial')
        then greatest(resume_generations_limit - resume_generations_used, 0)
           + greatest(cover_letter_generations_limit - cover_letter_generations_used, 0)
      else 0
    end;

alter table public.profiles
  add constraint profiles_document_credits_promotional_nonnegative
    check (document_credits_promotional >= 0),
  add constraint profiles_document_credits_purchased_nonnegative
    check (document_credits_purchased >= 0),
  add constraint profiles_document_credits_reasonable
    check (document_credits_promotional <= 10000000 and document_credits_purchased <= 10000000);

alter table public.resume_generation_attempts
  add column credit_bucket text;

alter table public.cover_letter_generation_attempts
  add column credit_bucket text;

-- Historic charged attempts predate the wallet. Assigning their current plan
-- bucket gives any in-flight reservation a deterministic restoration target.
update public.resume_generation_attempts as attempt
set credit_bucket = case when profile.plan in ('pro', 'trial') then 'purchased' else 'promotional' end
from public.profiles as profile
where profile.user_id = attempt.user_id
  and attempt.credit_charged = true;

update public.cover_letter_generation_attempts as attempt
set credit_bucket = case when profile.plan in ('pro', 'trial') then 'purchased' else 'promotional' end
from public.profiles as profile
where profile.user_id = attempt.user_id
  and attempt.credit_charged = true;

alter table public.resume_generation_attempts
  add constraint resume_generation_attempts_credit_bucket_check
    check (credit_bucket is null or credit_bucket in ('promotional', 'purchased')),
  add constraint resume_generation_attempts_charged_bucket_check
    check (not credit_charged or credit_bucket is not null);

alter table public.cover_letter_generation_attempts
  add constraint cover_letter_generation_attempts_credit_bucket_check
    check (credit_bucket is null or credit_bucket in ('promotional', 'purchased')),
  add constraint cover_letter_generation_attempts_charged_bucket_check
    check (not credit_charged or credit_bucket is not null);

create table public.document_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on update cascade on delete cascade,
  transaction_type text not null,
  credit_bucket text not null,
  delta integer not null,
  balance_after integer not null,
  document_type text,
  generation_id uuid,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_event_id text,
  pack_code text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint document_credit_transactions_type_check
    check (transaction_type in (
      'migration_grant',
      'signup_grant',
      'purchase',
      'generation_reservation',
      'generation_refund',
      'purchase_reversal',
      'admin_adjustment'
    )),
  constraint document_credit_transactions_bucket_check
    check (credit_bucket in ('promotional', 'purchased')),
  constraint document_credit_transactions_delta_nonzero
    check (delta <> 0),
  constraint document_credit_transactions_balance_nonnegative
    check (balance_after >= 0),
  constraint document_credit_transactions_document_type_check
    check (document_type is null or document_type in ('resume', 'cover_letter')),
  constraint document_credit_transactions_generation_shape_check
    check (
      (transaction_type in ('generation_reservation', 'generation_refund')
        and document_type is not null and generation_id is not null)
      or
      (transaction_type not in ('generation_reservation', 'generation_refund'))
    )
);

create unique index document_credit_transactions_generation_unique
  on public.document_credit_transactions (transaction_type, document_type, generation_id)
  where generation_id is not null;

create unique index document_credit_transactions_checkout_purchase_unique
  on public.document_credit_transactions (stripe_checkout_session_id)
  where transaction_type = 'purchase' and stripe_checkout_session_id is not null;

create index document_credit_transactions_user_created_idx
  on public.document_credit_transactions (user_id, created_at desc);

create table public.stripe_credit_purchases (
  checkout_session_id text primary key,
  purchase_id uuid not null unique,
  user_id uuid not null references public.profiles(user_id) on update cascade on delete cascade,
  stripe_event_id text not null unique,
  payment_intent_id text unique,
  customer_id text,
  pack_code text not null,
  credits_granted integer not null,
  credits_reversed integer not null default 0,
  amount_total bigint not null,
  currency text not null,
  status text not null default 'fulfilled',
  fulfilled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_credit_purchases_pack_check
    check (pack_code in ('credits_100', 'credits_250')),
  constraint stripe_credit_purchases_credits_positive
    check (credits_granted > 0),
  constraint stripe_credit_purchases_reversal_range
    check (credits_reversed >= 0 and credits_reversed <= credits_granted),
  constraint stripe_credit_purchases_amount_nonnegative
    check (amount_total >= 0),
  constraint stripe_credit_purchases_currency_check
    check (currency = lower(currency) and length(currency) = 3),
  constraint stripe_credit_purchases_status_check
    check (status in ('fulfilled', 'partially_reversed', 'reversed'))
);

create index stripe_credit_purchases_user_fulfilled_idx
  on public.stripe_credit_purchases (user_id, fulfilled_at desc);

-- Record the balances created by this migration so the ledger begins with a
-- complete, auditable opening position.
insert into public.document_credit_transactions (
  user_id,
  transaction_type,
  credit_bucket,
  delta,
  balance_after,
  metadata
)
select user_id,
       'migration_grant',
       'promotional',
       document_credits_promotional,
       document_credits_promotional + document_credits_purchased,
       jsonb_build_object('source', 'legacy_allowance_conversion')
from public.profiles
where document_credits_promotional > 0;

insert into public.document_credit_transactions (
  user_id,
  transaction_type,
  credit_bucket,
  delta,
  balance_after,
  metadata
)
select user_id,
       'migration_grant',
       'purchased',
       document_credits_purchased,
       document_credits_promotional + document_credits_purchased,
       jsonb_build_object('source', 'legacy_allowance_conversion')
from public.profiles
where document_credits_purchased > 0;

-- Profile creation is allowed through a tightly scoped authenticated insert.
-- This trigger records the trusted default welcome grant without exposing the
-- internal ledger to the browser-facing role.
create function public.record_initial_document_credit_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.document_credits_promotional > 0 then
    insert into public.document_credit_transactions (
      user_id,
      transaction_type,
      credit_bucket,
      delta,
      balance_after,
      metadata
    ) values (
      new.user_id,
      'signup_grant',
      'promotional',
      new.document_credits_promotional,
      new.document_credits_promotional + new.document_credits_purchased,
      jsonb_build_object('source', 'profile_default')
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_initial_document_credit_grant() from public, anon, authenticated;
grant execute on function public.record_initial_document_credit_grant() to service_role;

create trigger profiles_record_initial_document_credit_grant
after insert on public.profiles
for each row
execute function public.record_initial_document_credit_grant();

alter table public.document_credit_transactions enable row level security;
alter table public.stripe_credit_purchases enable row level security;

revoke all on table public.document_credit_transactions from public, anon, authenticated;
revoke all on table public.stripe_credit_purchases from public, anon, authenticated;
grant all on table public.document_credit_transactions to service_role;
grant all on table public.stripe_credit_purchases to service_role;

comment on column public.profiles.document_credits_promotional is
  'One-time promotional document credits. Consumed before purchased credits.';
comment on column public.profiles.document_credits_purchased is
  'Non-expiring document credits granted by completed one-time purchases.';

commit;
