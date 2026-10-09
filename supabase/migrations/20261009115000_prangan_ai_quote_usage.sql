-- Isolated AI beta usage ledger. This migration is intentionally NOT applied
-- to the live project until the Claude API key and spending limit are configured.
-- It stores only caller ids and timestamps, NEVER quotes or customer information.
create table if not exists public.prangan_ai_quote_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists prangan_ai_quote_usage_user_time
  on public.prangan_ai_quote_usage(user_id, created_at desc);

alter table public.prangan_ai_quote_usage enable row level security;
-- No table policies: browser clients cannot read or write raw usage records.
revoke all on public.prangan_ai_quote_usage from anon, authenticated;

-- A per-authenticated-user, transaction-serialized reservation. No service
-- role in the frontend or the Edge Function. Users can consume their own
-- quota, but cannot raise the daily maximum or impersonate another user.
create or replace function public.prangan_ai_reserve_quote()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  if (select count(*) from public.prangan_ai_quote_usage
      where user_id = caller and created_at > now() - interval '24 hours') >= 5 then
    return false;
  end if;
  insert into public.prangan_ai_quote_usage(user_id) values (caller);
  return true;
end;
$$;

revoke all on function public.prangan_ai_reserve_quote() from public, anon;
grant execute on function public.prangan_ai_reserve_quote() to authenticated;
