-- Business onboarding must be approved by the Prangan One platform owner
-- before a usable Business Money workspace and business membership exist.

create or replace function private.is_platform_owner()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
      and m.society_id is null
  );
$$;

revoke execute on function private.is_platform_owner() from public, anon;
grant execute on function private.is_platform_owner() to authenticated;

create table if not exists business_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(trim(business_name)) between 2 and 120),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  requester_name text not null check (char_length(trim(requester_name)) between 1 and 120),
  requester_phone text,
  city text,
  business_type text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decision_note text,
  business_id uuid references businesses(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_onboarding_one_pending_per_user_idx
  on business_onboarding_requests (requester_user_id)
  where status = 'pending';

create index if not exists business_onboarding_status_created_idx
  on business_onboarding_requests (status, created_at desc);

alter table business_onboarding_requests enable row level security;

drop policy if exists business_onboarding_requests_select on business_onboarding_requests;
create policy business_onboarding_requests_select on business_onboarding_requests
for select
using (
  requester_user_id = (select auth.uid())
  or private.is_platform_owner()
);

revoke all on business_onboarding_requests from anon;
revoke insert, update, delete on business_onboarding_requests from authenticated;
grant select on business_onboarding_requests to authenticated;

create or replace function request_business_onboarding(
  target_name text,
  requester_name text,
  requester_phone text default null,
  requester_city text default null,
  target_business_type text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text;
  existing_request uuid;
  new_request uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(coalesce(target_name, ''))) < 2 then raise exception 'business_name_required'; end if;
  if char_length(trim(coalesce(requester_name, ''))) < 1 then raise exception 'requester_name_required'; end if;

  select lower(u.email) into current_email
  from auth.users u
  where u.id = auth.uid();

  if current_email is null then raise exception 'email_required'; end if;

  select r.id into existing_request
  from business_onboarding_requests r
  where r.requester_user_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc
  limit 1;

  if existing_request is not null then
    return existing_request;
  end if;

  insert into business_onboarding_requests (
    business_name, requester_user_id, requester_email, requester_name,
    requester_phone, city, business_type
  ) values (
    trim(target_name), auth.uid(), current_email, trim(requester_name),
    nullif(trim(coalesce(requester_phone, '')), ''),
    nullif(trim(coalesce(requester_city, '')), ''),
    nullif(trim(coalesce(target_business_type, '')), '')
  )
  returning id into new_request;

  return new_request;
end;
$$;

create or replace function get_my_business_onboarding()
returns table (
  request_id uuid,
  business_name text,
  requester_name text,
  requester_email text,
  requester_phone text,
  city text,
  business_type text,
  status text,
  decision_note text,
  business_id uuid,
  created_at timestamptz,
  decided_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  return query
  select
    r.id, r.business_name, r.requester_name, r.requester_email,
    r.requester_phone, r.city, r.business_type, r.status,
    r.decision_note, r.business_id, r.created_at, r.decided_at
  from business_onboarding_requests r
  where r.requester_user_id = auth.uid()
  order by r.created_at desc
  limit 1;
end;
$$;

create or replace function approve_business_onboarding(target_request uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req business_onboarding_requests%rowtype;
  new_business uuid;
  new_partner uuid;
begin
  if not private.is_platform_owner() then raise exception 'owner_only'; end if;

  select * into req
  from business_onboarding_requests
  where id = target_request
  for update;

  if req.id is null then raise exception 'request_not_found'; end if;
  if req.status = 'approved' and req.business_id is not null then return req.business_id; end if;
  if req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  insert into businesses (name, approval_mode, created_by)
  values (req.business_name, 'one_partner', req.requester_user_id)
  returning id into new_business;

  insert into business_partners (business_id, name, email, phone)
  values (new_business, req.requester_name, lower(req.requester_email), req.requester_phone)
  returning id into new_partner;

  insert into business_memberships (
    business_id, user_id, partner_id, email, display_name, role, status
  ) values (
    new_business, req.requester_user_id, new_partner, lower(req.requester_email),
    req.requester_name, 'admin', 'active'
  );

  insert into business_accounts (business_id, name, kind, opening_balance) values
    (new_business, 'Cash', 'cash', 0),
    (new_business, 'UPI', 'upi', 0);

  insert into business_categories (business_id, name, kind) values
    (new_business, 'Sales / Receipts', 'income'),
    (new_business, 'Purchase / Material', 'expense'),
    (new_business, 'Travel', 'expense'),
    (new_business, 'Food / Staff', 'expense'),
    (new_business, 'Rent', 'expense'),
    (new_business, 'Utilities', 'expense'),
    (new_business, 'Repairs', 'expense'),
    (new_business, 'Other', 'both');

  update business_onboarding_requests
  set status = 'approved',
      business_id = new_business,
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now(),
      decision_note = null
  where id = req.id;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    new_business, auth.uid(), 'business_onboarding_approved', 'business', new_business,
    jsonb_build_object('request_id', req.id, 'requester_user_id', req.requester_user_id)
  );

  return new_business;
end;
$$;

create or replace function reject_business_onboarding(
  target_request uuid,
  target_note text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req business_onboarding_requests%rowtype;
begin
  if not private.is_platform_owner() then raise exception 'owner_only'; end if;

  select * into req
  from business_onboarding_requests
  where id = target_request
  for update;

  if req.id is null then raise exception 'request_not_found'; end if;
  if req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  update business_onboarding_requests
  set status = 'rejected',
      decision_note = nullif(trim(coalesce(target_note, '')), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now()
  where id = req.id;
end;
$$;

-- Disable the original instant-create endpoint. This prevents an old browser
-- bundle or direct RPC call from bypassing the platform-owner approval step.
create or replace function create_business(
  target_name text,
  owner_name text,
  target_approval_mode text default 'one_partner',
  opening_cash numeric default 0
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'owner_approval_required';
end;
$$;

revoke execute on function request_business_onboarding(text, text, text, text, text) from public, anon;
revoke execute on function get_my_business_onboarding() from public, anon;
revoke execute on function approve_business_onboarding(uuid) from public, anon;
revoke execute on function reject_business_onboarding(uuid, text) from public, anon;
revoke execute on function create_business(text, text, text, numeric) from public, anon;

grant execute on function request_business_onboarding(text, text, text, text, text) to authenticated;
grant execute on function get_my_business_onboarding() to authenticated;
grant execute on function approve_business_onboarding(uuid) to authenticated;
grant execute on function reject_business_onboarding(uuid, text) to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;
