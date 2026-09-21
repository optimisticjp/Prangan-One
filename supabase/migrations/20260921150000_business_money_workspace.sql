-- Business workspace: partner-led daily money tracking, approvals and cash closing.
-- Kept fully separate from housing-society tables and roles.

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  currency text not null default 'INR' check (currency = 'INR'),
  approval_mode text not null default 'one_partner' check (approval_mode in ('none','one_partner','all_partners')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_partners (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text,
  phone text,
  ownership_percent numeric(6,3) check (ownership_percent is null or (ownership_percent >= 0 and ownership_percent <= 100)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create table if not exists business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  partner_id uuid references business_partners(id) on delete set null,
  email text not null,
  display_name text not null,
  role text not null check (role in ('admin','partner','bookkeeper','viewer')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id)
);

create table if not exists business_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null check (kind in ('cash','bank','upi','wallet','other')),
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists business_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null default 'expense' check (kind in ('income','expense','both')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists business_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('income','expense','partner_capital','partner_advance','personal_expense','reimbursement','withdrawal','transfer','refund','reversal')),
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid references business_accounts(id) on delete restrict,
  to_account_id uuid references business_accounts(id) on delete restrict,
  partner_id uuid references business_partners(id) on delete restrict,
  category_id uuid references business_categories(id) on delete set null,
  counterparty text,
  note text,
  approval_status text not null default 'not_required' check (approval_status in ('not_required','pending','approved','rejected')),
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reversed_transaction_id uuid references business_transactions(id) on delete restrict,
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id)
);

create index if not exists business_transactions_business_occurred_idx on business_transactions (business_id, occurred_at desc);
create index if not exists business_transactions_business_approval_idx on business_transactions (business_id, approval_status, occurred_at desc);

create table if not exists business_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  bucket text not null check (bucket in ('account','partner_capital','partner_due','partner_withdrawal')),
  account_id uuid references business_accounts(id) on delete restrict,
  partner_id uuid references business_partners(id) on delete restrict,
  amount numeric(14,2) not null check (amount <> 0),
  created_at timestamptz not null default now(),
  check (
    (bucket = 'account' and account_id is not null and partner_id is null)
    or (bucket <> 'account' and partner_id is not null and account_id is null)
  )
);

create index if not exists business_ledger_entries_account_idx on business_ledger_entries (business_id, account_id);
create index if not exists business_ledger_entries_partner_idx on business_ledger_entries (business_id, partner_id);

create table if not exists business_transaction_approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected')),
  note text,
  decided_at timestamptz not null default now(),
  unique (transaction_id, approver_user_id)
);

create table if not exists business_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists business_day_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  account_id uuid not null references business_accounts(id) on delete restrict,
  close_date date not null default current_date,
  expected_balance numeric(14,2) not null,
  counted_balance numeric(14,2) not null,
  difference numeric(14,2) not null,
  note text,
  closed_by uuid not null references auth.users(id),
  closed_at timestamptz not null default now(),
  unique (business_id, account_id, close_date)
);

create table if not exists business_activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_activity_logs_business_created_idx on business_activity_logs (business_id, created_at desc);

create or replace function private.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from business_memberships bm
    where bm.business_id = target_business and bm.user_id = auth.uid() and bm.status = 'active'
  )
$$;

create or replace function private.business_role(target_business uuid)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select bm.role from business_memberships bm
  where bm.business_id = target_business and bm.user_id = auth.uid() and bm.status = 'active'
  limit 1
$$;

create or replace function private.can_write_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) in ('admin','partner','bookkeeper'), false)
$$;

create or replace function private.can_admin_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) = 'admin', false)
$$;

create or replace function private.can_approve_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) in ('admin','partner'), false)
$$;

alter table businesses enable row level security;
alter table business_partners enable row level security;
alter table business_memberships enable row level security;
alter table business_accounts enable row level security;
alter table business_categories enable row level security;
alter table business_transactions enable row level security;
alter table business_ledger_entries enable row level security;
alter table business_transaction_approvals enable row level security;
alter table business_attachments enable row level security;
alter table business_day_closings enable row level security;
alter table business_activity_logs enable row level security;

create policy businesses_select on businesses for select using (private.is_business_member(id));
create policy businesses_update on businesses for update using (private.can_admin_business(id)) with check (private.can_admin_business(id));
create policy business_partners_select on business_partners for select using (private.is_business_member(business_id));
create policy business_partners_insert on business_partners for insert with check (private.can_admin_business(business_id));
create policy business_partners_update on business_partners for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_memberships_select on business_memberships for select using (private.is_business_member(business_id));
create policy business_memberships_insert on business_memberships for insert with check (private.can_admin_business(business_id));
create policy business_memberships_update on business_memberships for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_accounts_select on business_accounts for select using (private.is_business_member(business_id));
create policy business_accounts_insert on business_accounts for insert with check (private.can_admin_business(business_id));
create policy business_accounts_update on business_accounts for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_categories_select on business_categories for select using (private.is_business_member(business_id));
create policy business_categories_insert on business_categories for insert with check (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false));
create policy business_categories_update on business_categories for update using (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false)) with check (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false));
create policy business_transactions_select on business_transactions for select using (private.is_business_member(business_id));
create policy business_ledger_entries_select on business_ledger_entries for select using (private.is_business_member(business_id));
create policy business_transaction_approvals_select on business_transaction_approvals for select using (private.is_business_member(business_id));
create policy business_attachments_select on business_attachments for select using (private.is_business_member(business_id));
create policy business_attachments_insert on business_attachments for insert with check (private.can_write_business(business_id) and uploaded_by = auth.uid());
create policy business_attachments_delete on business_attachments for delete using (private.can_admin_business(business_id) or uploaded_by = auth.uid());
create policy business_day_closings_select on business_day_closings for select using (private.is_business_member(business_id));
create policy business_activity_logs_select on business_activity_logs for select using (private.is_business_member(business_id));

grant select, insert, update, delete on businesses, business_partners, business_memberships, business_accounts, business_categories, business_transactions, business_ledger_entries, business_transaction_approvals, business_attachments, business_day_closings, business_activity_logs to authenticated;
revoke all on businesses, business_partners, business_memberships, business_accounts, business_categories, business_transactions, business_ledger_entries, business_transaction_approvals, business_attachments, business_day_closings, business_activity_logs from anon;

create or replace function claim_business_memberships()
returns table (membership_id uuid, business_id uuid, business_name text, role text, partner_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;
  update business_memberships bm
     set user_id = auth.uid()
   where bm.user_id is null and bm.status = 'active' and lower(bm.email) = current_email;
  return query
  select bm.id, bm.business_id, b.name, bm.role, bm.partner_id
  from business_memberships bm join businesses b on b.id = bm.business_id
  where bm.user_id = auth.uid() and bm.status = 'active'
  order by b.name;
end;
$$;

create or replace function create_business(
  target_name text, owner_name text, target_approval_mode text default 'one_partner', opening_cash numeric default 0
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_business uuid; new_partner uuid; current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(target_name)) < 2 then raise exception 'business_name_required'; end if;
  if char_length(trim(owner_name)) < 1 then raise exception 'owner_name_required'; end if;
  if target_approval_mode not in ('none','one_partner','all_partners') then raise exception 'invalid_approval_mode'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;

  insert into businesses (name, approval_mode, created_by)
  values (trim(target_name), target_approval_mode, auth.uid()) returning id into new_business;
  insert into business_partners (business_id, name, email)
  values (new_business, trim(owner_name), current_email) returning id into new_partner;
  insert into business_memberships (business_id, user_id, partner_id, email, display_name, role)
  values (new_business, auth.uid(), new_partner, current_email, trim(owner_name), 'admin');
  insert into business_accounts (business_id, name, kind, opening_balance) values
    (new_business, 'Cash', 'cash', coalesce(opening_cash, 0)),
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
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (new_business, auth.uid(), 'business_created', 'business', new_business, jsonb_build_object('name', trim(target_name)));
  return new_business;
end;
$$;

create or replace function add_business_partner(
  target_business uuid, partner_name text, partner_email text default null,
  partner_phone text default null, partner_ownership numeric default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_partner uuid; normalized_email text; existing_user uuid;
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(partner_name)) < 1 then raise exception 'partner_name_required'; end if;
  if partner_ownership is not null and (partner_ownership < 0 or partner_ownership > 100) then raise exception 'invalid_ownership'; end if;
  normalized_email := nullif(lower(trim(coalesce(partner_email, ''))), '');
  if normalized_email is not null then
    select id into existing_user from auth.users where lower(email) = normalized_email limit 1;
  end if;
  insert into business_partners (business_id, name, email, phone, ownership_percent)
  values (target_business, trim(partner_name), normalized_email, nullif(trim(coalesce(partner_phone, '')), ''), partner_ownership)
  returning id into new_partner;
  if normalized_email is not null then
    insert into business_memberships (business_id, user_id, partner_id, email, display_name, role)
    values (target_business, existing_user, new_partner, normalized_email, trim(partner_name), 'partner');
  end if;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (target_business, auth.uid(), 'partner_added', 'partner', new_partner, jsonb_build_object('name', trim(partner_name)));
  return new_partner;
end;
$$;

create or replace function post_business_transaction(
  target_business uuid, target_kind text, target_amount numeric,
  target_account uuid default null, target_to_account uuid default null,
  target_partner uuid default null, target_category uuid default null,
  target_counterparty text default null, target_note text default null,
  target_occurred_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_tx uuid; mode text; approval text := 'not_required'; eligible_approvers int := 0; due_balance numeric := 0;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_kind not in ('income','expense','partner_capital','partner_advance','personal_expense','reimbursement','withdrawal','transfer','refund') then raise exception 'invalid_transaction_kind'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;

  if target_account is not null and not exists (select 1 from business_accounts where id = target_account and business_id = target_business and active) then raise exception 'invalid_account'; end if;
  if target_to_account is not null and not exists (select 1 from business_accounts where id = target_to_account and business_id = target_business and active) then raise exception 'invalid_destination_account'; end if;
  if target_partner is not null and not exists (select 1 from business_partners where id = target_partner and business_id = target_business and active) then raise exception 'invalid_partner'; end if;
  if target_category is not null and not exists (select 1 from business_categories where id = target_category and business_id = target_business and active) then raise exception 'invalid_category'; end if;

  if target_kind in ('income','expense','partner_capital','partner_advance','reimbursement','withdrawal','refund') and target_account is null then raise exception 'account_required'; end if;
  if target_kind = 'transfer' and (target_account is null or target_to_account is null or target_account = target_to_account) then raise exception 'two_accounts_required'; end if;
  if target_kind in ('partner_capital','partner_advance','personal_expense','reimbursement','withdrawal') and target_partner is null then raise exception 'partner_required'; end if;

  if target_kind = 'reimbursement' then
    select coalesce(sum(le.amount), 0) into due_balance
      from business_ledger_entries le
     where le.business_id = target_business and le.partner_id = target_partner and le.bucket = 'partner_due';
    if due_balance < target_amount then raise exception 'reimbursement_exceeds_due'; end if;
  end if;

  if target_kind in ('expense','personal_expense') then
    select approval_mode into mode from businesses where id = target_business;
    select count(*) into eligible_approvers
      from business_memberships bm
     where bm.business_id = target_business and bm.status = 'active'
       and bm.user_id is not null and bm.user_id <> auth.uid()
       and bm.role in ('admin','partner');
    if mode <> 'none' and eligible_approvers > 0 then approval := 'pending'; end if;
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, occurred_at, created_by
  ) values (
    target_business, target_kind, round(target_amount, 2), target_account, target_to_account, target_partner, target_category,
    nullif(trim(coalesce(target_counterparty, '')), ''), nullif(trim(coalesce(target_note, '')), ''), approval,
    coalesce(target_occurred_at, now()), auth.uid()
  ) returning id into new_tx;

  if target_kind in ('income','refund') then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
  elsif target_kind = 'expense' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
  elsif target_kind = 'partner_capital' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_capital', target_partner, target_amount);
  elsif target_kind = 'partner_advance' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, target_amount);
  elsif target_kind = 'personal_expense' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, target_amount);
  elsif target_kind = 'reimbursement' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, -target_amount);
  elsif target_kind = 'withdrawal' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_withdrawal', target_partner, target_amount);
  elsif target_kind = 'transfer' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount) values
      (target_business, new_tx, 'account', target_account, -target_amount),
      (target_business, new_tx, 'account', target_to_account, target_amount);
  end if;

  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (target_business, auth.uid(), 'transaction_posted', 'transaction', new_tx, jsonb_build_object('kind', target_kind, 'amount', target_amount, 'approval_status', approval));
  return new_tx;
end;
$$;

create or replace function approve_business_transaction(target_transaction uuid, target_note text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype; mode text; approved_count int; required_count int; final_status text;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_approve_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.created_by = auth.uid() then raise exception 'creator_cannot_self_approve'; end if;
  if tx.approval_status not in ('pending','approved') then raise exception 'transaction_not_pending'; end if;

  insert into business_transaction_approvals (business_id, transaction_id, approver_user_id, decision, note)
  values (tx.business_id, tx.id, auth.uid(), 'approved', nullif(trim(coalesce(target_note, '')), ''))
  on conflict (transaction_id, approver_user_id)
  do update set decision = 'approved', note = excluded.note, decided_at = now();

  select approval_mode into mode from businesses where id = tx.business_id;
  select count(*) into approved_count from business_transaction_approvals where transaction_id = tx.id and decision = 'approved';
  select count(*) into required_count
    from business_memberships bm
   where bm.business_id = tx.business_id and bm.status = 'active' and bm.user_id is not null
     and bm.user_id <> tx.created_by and bm.role in ('admin','partner');

  final_status := case
    when mode = 'one_partner' and approved_count >= 1 then 'approved'
    when mode = 'all_partners' and approved_count >= required_count then 'approved'
    else 'pending'
  end;
  update business_transactions set approval_status = final_status where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_approved', 'transaction', tx.id, jsonb_build_object('status', final_status));
  return final_status;
end;
$$;

create or replace function reject_business_transaction(target_transaction uuid, target_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_approve_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.created_by = auth.uid() then raise exception 'creator_cannot_self_approve'; end if;
  if tx.approval_status <> 'pending' then raise exception 'transaction_not_pending'; end if;

  insert into business_transaction_approvals (business_id, transaction_id, approver_user_id, decision, note)
  values (tx.business_id, tx.id, auth.uid(), 'rejected', nullif(trim(coalesce(target_note, '')), ''))
  on conflict (transaction_id, approver_user_id)
  do update set decision = 'rejected', note = excluded.note, decided_at = now();
  update business_transactions set approval_status = 'rejected' where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_rejected', 'transaction', tx.id, jsonb_build_object('note', target_note));
end;
$$;

create or replace function reverse_business_transaction(target_transaction uuid, target_reason text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype; reversal_id uuid;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind = 'reversal' or tx.reversed_at is not null then raise exception 'already_reversed'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 3 then raise exception 'reversal_reason_required'; end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, occurred_at, created_by, reversed_transaction_id
  ) values (
    tx.business_id, 'reversal', tx.amount, tx.account_id, tx.to_account_id, tx.partner_id, tx.category_id,
    tx.counterparty, trim(target_reason), 'not_required', now(), auth.uid(), tx.id
  ) returning id into reversal_id;

  insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, partner_id, amount)
  select business_id, reversal_id, bucket, account_id, partner_id, -amount
    from business_ledger_entries where transaction_id = tx.id;
  update business_transactions set reversed_at = now(), reversed_by = auth.uid() where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_reversed', 'transaction', tx.id, jsonb_build_object('reversal_id', reversal_id, 'reason', trim(target_reason)));
  return reversal_id;
end;
$$;

create or replace function get_business_account_balances(target_business uuid)
returns table (account_id uuid, name text, kind text, balance numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select a.id, a.name, a.kind,
         round(a.opening_balance + coalesce(sum(le.amount) filter (where le.bucket = 'account'), 0), 2)
    from business_accounts a
    left join business_ledger_entries le on le.account_id = a.id and le.business_id = a.business_id
   where a.business_id = target_business and a.active
   group by a.id, a.name, a.kind, a.opening_balance
   order by case a.kind when 'cash' then 1 when 'bank' then 2 when 'upi' then 3 else 4 end, a.name;
end;
$$;

create or replace function get_business_partner_positions(target_business uuid)
returns table (
  partner_id uuid, name text, capital numeric, advances numeric, personal_expenses numeric,
  reimbursements numeric, outstanding_due numeric, withdrawals numeric
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select p.id, p.name,
    coalesce(sum(t.amount) filter (where t.kind = 'partner_capital' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'partner_advance' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'personal_expense' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'reimbursement' and t.reversed_at is null), 0)::numeric,
    (coalesce(sum(t.amount) filter (where t.kind in ('partner_advance','personal_expense') and t.reversed_at is null), 0)
      - coalesce(sum(t.amount) filter (where t.kind = 'reimbursement' and t.reversed_at is null), 0))::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'withdrawal' and t.reversed_at is null), 0)::numeric
  from business_partners p
  left join business_transactions t on t.partner_id = p.id and t.business_id = p.business_id
  where p.business_id = target_business and p.active
  group by p.id, p.name
  order by p.created_at;
end;
$$;

create or replace function close_business_day(target_account uuid, target_counted numeric, target_note text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare account_row business_accounts%rowtype; expected numeric; new_close uuid;
begin
  select * into account_row from business_accounts where id = target_account;
  if account_row.id is null or account_row.kind <> 'cash' then raise exception 'cash_account_required'; end if;
  if not private.can_write_business(account_row.business_id) then raise exception 'not_allowed'; end if;
  if target_counted is null then raise exception 'counted_balance_required'; end if;
  if exists (
    select 1 from business_day_closings
    where business_id = account_row.business_id and account_id = target_account and close_date = current_date
  ) then raise exception 'day_already_closed'; end if;

  select account_row.opening_balance + coalesce(sum(le.amount), 0) into expected
    from business_ledger_entries le
   where le.business_id = account_row.business_id and le.account_id = target_account and le.bucket = 'account';

  insert into business_day_closings (business_id, account_id, expected_balance, counted_balance, difference, note, closed_by)
  values (account_row.business_id, target_account, round(expected,2), round(target_counted,2), round(target_counted - expected,2), nullif(trim(coalesce(target_note,'')),''), auth.uid())
  returning id into new_close;

  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (account_row.business_id, auth.uid(), 'day_closed', 'day_closing', new_close, jsonb_build_object('expected', expected, 'counted', target_counted));
  return new_close;
end;
$$;

create or replace function reopen_business_day(target_closing uuid, target_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c business_day_closings%rowtype;
begin
  select * into c from business_day_closings where id = target_closing;
  if c.id is null then raise exception 'closing_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_reason,''))) < 3 then raise exception 'reason_required'; end if;
  delete from business_day_closings where id = c.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (c.business_id, auth.uid(), 'day_reopened', 'day_closing', c.id, jsonb_build_object('reason', trim(target_reason), 'close_date', c.close_date));
end;
$$;

grant execute on function claim_business_memberships() to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;
grant execute on function add_business_partner(uuid, text, text, text, numeric) to authenticated;
grant execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function approve_business_transaction(uuid, text) to authenticated;
grant execute on function reject_business_transaction(uuid, text) to authenticated;
grant execute on function reverse_business_transaction(uuid, text) to authenticated;
grant execute on function get_business_account_balances(uuid) to authenticated;
grant execute on function get_business_partner_positions(uuid) to authenticated;
grant execute on function close_business_day(uuid, numeric, text) to authenticated;
grant execute on function reopen_business_day(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-proofs', 'business-proofs', false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy business_proofs_select on storage.objects for select
using (bucket_id = 'business-proofs' and private.is_business_member((split_part(name, '/', 1))::uuid));
create policy business_proofs_insert on storage.objects for insert
with check (bucket_id = 'business-proofs' and private.can_write_business((split_part(name, '/', 1))::uuid));
create policy business_proofs_delete on storage.objects for delete
using (bucket_id = 'business-proofs' and private.can_write_business((split_part(name, '/', 1))::uuid));
