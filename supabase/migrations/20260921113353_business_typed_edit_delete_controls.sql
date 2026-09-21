-- Managed edit/archive operations for Business Money.
-- UI requires typed EDIT/DELETE confirmation, while database functions enforce
-- authorization and preserve audit/history.

alter table businesses
  add column if not exists archived_at timestamptz;

create or replace function claim_business_memberships()
returns table (membership_id uuid, business_id uuid, business_name text, role text, partner_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;

  update business_memberships bm
     set user_id = auth.uid()
    from businesses b
   where bm.business_id = b.id
     and b.archived_at is null
     and bm.user_id is null
     and bm.status = 'active'
     and lower(bm.email) = current_email;

  return query
  select bm.id, bm.business_id, b.name, bm.role, bm.partner_id
  from business_memberships bm
  join businesses b on b.id = bm.business_id
  where bm.user_id = auth.uid()
    and bm.status = 'active'
    and b.archived_at is null
  order by b.name;
end;
$$;

create or replace function update_business_partner(
  target_partner uuid,
  partner_name text,
  partner_email text default null,
  partner_phone text default null,
  partner_ownership numeric default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p business_partners%rowtype;
  normalized_email text;
  existing_user uuid;
  member business_memberships%rowtype;
begin
  select * into p from business_partners where id = target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(partner_name,''))) < 1 then raise exception 'partner_name_required'; end if;
  if partner_ownership is not null and (partner_ownership < 0 or partner_ownership > 100) then raise exception 'invalid_ownership'; end if;

  normalized_email := nullif(lower(trim(coalesce(partner_email, ''))), '');
  select * into member from business_memberships where partner_id = p.id limit 1;

  if member.id is not null and member.role = 'admin' and normalized_email is null then
    raise exception 'admin_email_required';
  end if;

  if normalized_email is not null then
    select id into existing_user from auth.users where lower(email)=normalized_email limit 1;
  end if;

  update business_partners
  set name = trim(partner_name),
      email = normalized_email,
      phone = nullif(trim(coalesce(partner_phone,'')), ''),
      ownership_percent = partner_ownership
  where id = p.id;

  if member.id is not null then
    update business_memberships
    set email = coalesce(normalized_email, member.email),
        display_name = trim(partner_name),
        user_id = case when normalized_email is null then member.user_id else existing_user end,
        status = case when normalized_email is null then 'disabled' else 'active' end
    where id = member.id;
  elsif normalized_email is not null then
    insert into business_memberships (business_id,user_id,partner_id,email,display_name,role,status)
    values (p.business_id,existing_user,p.id,normalized_email,trim(partner_name),'partner','active');
  end if;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    p.business_id,auth.uid(),'partner_edited','partner',p.id,
    jsonb_build_object('old_name',p.name,'new_name',trim(partner_name),'old_email',p.email,'new_email',normalized_email)
  );
end;
$$;

create or replace function archive_business_partner(target_partner uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p business_partners%rowtype;
  member business_memberships%rowtype;
  active_admins int;
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;

  select * into member from business_memberships where partner_id=p.id and status='active' limit 1;
  if member.id is not null and member.role='admin' then
    select count(*) into active_admins
    from business_memberships
    where business_id=p.business_id and status='active' and role='admin';
    if active_admins <= 1 then raise exception 'last_admin_cannot_delete'; end if;
  end if;

  update business_partners set active=false where id=p.id;
  update business_memberships set status='disabled' where partner_id=p.id and status='active';

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (p.business_id,auth.uid(),'partner_deleted','partner',p.id,jsonb_build_object('name',p.name));
end;
$$;

create or replace function update_business_account(
  target_account uuid,
  target_name text,
  target_kind text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a business_accounts%rowtype;
  has_history boolean;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'account_name_required'; end if;
  if target_kind not in ('cash','bank','upi','wallet','other') then raise exception 'invalid_account_kind'; end if;

  select exists(
    select 1 from business_ledger_entries where account_id=a.id
    union all
    select 1 from business_day_closings where account_id=a.id
  ) into has_history;

  if has_history and target_kind <> a.kind then raise exception 'account_kind_locked_after_use'; end if;

  update business_accounts
  set name=trim(target_name), kind=target_kind
  where id=a.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    a.business_id,auth.uid(),'account_edited','account',a.id,
    jsonb_build_object('old_name',a.name,'new_name',trim(target_name),'old_kind',a.kind,'new_kind',target_kind)
  );
end;
$$;

create or replace function archive_business_account(target_account uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a business_accounts%rowtype;
  current_balance numeric;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;

  select a.opening_balance + coalesce(sum(le.amount),0)
  into current_balance
  from business_accounts a
  left join business_ledger_entries le on le.account_id=a.id
  where a.id=target_account
  group by a.id,a.opening_balance;

  if abs(coalesce(current_balance,0)) > 0.005 then raise exception 'account_balance_must_be_zero'; end if;

  update business_accounts set active=false where id=a.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (a.business_id,auth.uid(),'account_deleted','account',a.id,jsonb_build_object('name',a.name,'balance',current_balance));
end;
$$;

create or replace function add_business_category(
  target_business uuid,
  target_name text,
  target_kind text default 'expense'
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_id uuid;
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'category_name_required'; end if;
  if target_kind not in ('income','expense','both') then raise exception 'invalid_category_kind'; end if;

  insert into business_categories (business_id,name,kind)
  values (target_business,trim(target_name),target_kind)
  returning id into new_id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (target_business,auth.uid(),'category_added','category',new_id,jsonb_build_object('name',trim(target_name),'kind',target_kind));

  return new_id;
end;
$$;

create or replace function update_business_category(
  target_category uuid,
  target_name text,
  target_kind text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c business_categories%rowtype;
begin
  select * into c from business_categories where id=target_category for update;
  if c.id is null then raise exception 'category_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'category_name_required'; end if;
  if target_kind not in ('income','expense','both') then raise exception 'invalid_category_kind'; end if;

  update business_categories set name=trim(target_name), kind=target_kind where id=c.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    c.business_id,auth.uid(),'category_edited','category',c.id,
    jsonb_build_object('old_name',c.name,'new_name',trim(target_name),'old_kind',c.kind,'new_kind',target_kind)
  );
end;
$$;

create or replace function archive_business_category(target_category uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c business_categories%rowtype;
begin
  select * into c from business_categories where id=target_category for update;
  if c.id is null then raise exception 'category_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;

  update business_categories set active=false where id=c.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (c.business_id,auth.uid(),'category_deleted','category',c.id,jsonb_build_object('name',c.name));
end;
$$;

create or replace function edit_business_transaction_details(
  target_transaction uuid,
  target_counterparty text default null,
  target_note text default null,
  target_category uuid default null,
  target_due_date date default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare tx business_transactions%rowtype;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind='reversal' or tx.reversed_at is not null then raise exception 'transaction_locked'; end if;

  if target_category is not null and not exists(
    select 1 from business_categories
    where id=target_category and business_id=tx.business_id and active
  ) then raise exception 'invalid_category'; end if;

  update business_transactions
  set counterparty=nullif(trim(coalesce(target_counterparty,'')),''),
      note=nullif(trim(coalesce(target_note,'')),''),
      category_id=target_category,
      due_date=case when kind='expense' and payment_status='unpaid' then target_due_date else due_date end
  where id=tx.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    tx.business_id,auth.uid(),'transaction_edited','transaction',tx.id,
    jsonb_build_object(
      'old_counterparty',tx.counterparty,
      'new_counterparty',nullif(trim(coalesce(target_counterparty,'')),''),
      'old_note',tx.note,
      'new_note',nullif(trim(coalesce(target_note,'')),''),
      'old_category_id',tx.category_id,
      'new_category_id',target_category,
      'old_due_date',tx.due_date,
      'new_due_date',target_due_date
    )
  );
end;
$$;

create or replace function update_business_settings(
  target_business uuid,
  target_name text,
  target_approval_mode text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare b businesses%rowtype;
begin
  select * into b from businesses where id=target_business and archived_at is null for update;
  if b.id is null then raise exception 'business_not_found'; end if;
  if not private.can_admin_business(b.id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 2 then raise exception 'business_name_required'; end if;
  if target_approval_mode not in ('none','one_partner','all_partners') then raise exception 'invalid_approval_mode'; end if;

  update businesses
  set name=trim(target_name), approval_mode=target_approval_mode, updated_at=now()
  where id=b.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    b.id,auth.uid(),'business_edited','business',b.id,
    jsonb_build_object('old_name',b.name,'new_name',trim(target_name),'old_approval_mode',b.approval_mode,'new_approval_mode',target_approval_mode)
  );
end;
$$;

create or replace function archive_business(target_business uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare b businesses%rowtype;
begin
  select * into b from businesses where id=target_business and archived_at is null for update;
  if b.id is null then raise exception 'business_not_found'; end if;
  if not private.can_admin_business(b.id) then raise exception 'not_allowed'; end if;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (b.id,auth.uid(),'business_deleted','business',b.id,jsonb_build_object('name',b.name));

  update businesses set archived_at=now(), updated_at=now() where id=b.id;
  update business_memberships set status='disabled' where business_id=b.id and status='active';
end;
$$;

drop policy if exists businesses_update on businesses;

revoke execute on function update_business_partner(uuid,text,text,text,numeric) from public, anon;
revoke execute on function archive_business_partner(uuid) from public, anon;
revoke execute on function update_business_account(uuid,text,text) from public, anon;
revoke execute on function archive_business_account(uuid) from public, anon;
revoke execute on function add_business_category(uuid,text,text) from public, anon;
revoke execute on function update_business_category(uuid,text,text) from public, anon;
revoke execute on function archive_business_category(uuid) from public, anon;
revoke execute on function edit_business_transaction_details(uuid,text,text,uuid,date) from public, anon;
revoke execute on function update_business_settings(uuid,text,text) from public, anon;
revoke execute on function archive_business(uuid) from public, anon;

grant execute on function update_business_partner(uuid,text,text,text,numeric) to authenticated;
grant execute on function archive_business_partner(uuid) to authenticated;
grant execute on function update_business_account(uuid,text,text) to authenticated;
grant execute on function archive_business_account(uuid) to authenticated;
grant execute on function add_business_category(uuid,text,text) to authenticated;
grant execute on function update_business_category(uuid,text,text) to authenticated;
grant execute on function archive_business_category(uuid) to authenticated;
grant execute on function edit_business_transaction_details(uuid,text,text,uuid,date) to authenticated;
grant execute on function update_business_settings(uuid,text,text) to authenticated;
grant execute on function archive_business(uuid) to authenticated;
