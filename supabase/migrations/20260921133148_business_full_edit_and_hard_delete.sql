-- Simplified partner-first Business editing and hard-delete operations.
-- Authorized users can correct posted transaction fields directly. DELETE means physical deletion.

create or replace function update_business_transaction_full(
  target_transaction uuid,
  target_kind text,
  target_amount numeric,
  target_account uuid default null,
  target_to_account uuid default null,
  target_partner uuid default null,
  target_category uuid default null,
  target_counterparty text default null,
  target_note text default null,
  target_occurred_at timestamptz default now(),
  target_payment_status text default 'paid',
  target_paid_by text default 'business',
  target_due_date date default null,
  target_approval_status text default 'not_required'
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tx business_transactions%rowtype;
  account_value uuid := null;
  to_account_value uuid := null;
  partner_value uuid := null;
  paid_at_value timestamptz := null;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if target_kind not in ('income','expense','partner_capital','partner_advance','personal_expense','reimbursement','withdrawal','transfer','refund') then
    raise exception 'invalid_transaction_kind';
  end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;
  if target_approval_status not in ('not_required','pending','approved','rejected') then raise exception 'invalid_approval_status'; end if;
  if target_category is not null and not exists (
    select 1 from business_categories where id=target_category and business_id=tx.business_id
  ) then raise exception 'invalid_category'; end if;

  if target_kind='expense' then
    if target_payment_status not in ('unpaid','paid') then raise exception 'invalid_payment_status'; end if;
    if target_payment_status='paid' and target_paid_by not in ('business','partner') then raise exception 'invalid_paid_by'; end if;

    if target_payment_status='paid' and target_paid_by='business' then
      if target_account is null then raise exception 'account_required'; end if;
      if not exists (select 1 from business_accounts where id=target_account and business_id=tx.business_id) then raise exception 'invalid_account'; end if;
      account_value := target_account;
      paid_at_value := coalesce(target_occurred_at, now());
    elsif target_payment_status='paid' and target_paid_by='partner' then
      if target_partner is null then raise exception 'partner_required'; end if;
      if not exists (select 1 from business_partners where id=target_partner and business_id=tx.business_id) then raise exception 'invalid_partner'; end if;
      partner_value := target_partner;
      paid_at_value := coalesce(target_occurred_at, now());
    end if;
  else
    target_payment_status := 'paid';
    target_due_date := null;
    paid_at_value := coalesce(target_occurred_at, now());

    if target_kind in ('income','partner_capital','partner_advance','reimbursement','withdrawal','refund') then
      if target_account is null then raise exception 'account_required'; end if;
      if not exists (select 1 from business_accounts where id=target_account and business_id=tx.business_id) then raise exception 'invalid_account'; end if;
      account_value := target_account;
    end if;

    if target_kind='transfer' then
      if target_account is null or target_to_account is null or target_account=target_to_account then raise exception 'two_accounts_required'; end if;
      if not exists (select 1 from business_accounts where id=target_account and business_id=tx.business_id) then raise exception 'invalid_account'; end if;
      if not exists (select 1 from business_accounts where id=target_to_account and business_id=tx.business_id) then raise exception 'invalid_destination_account'; end if;
      account_value := target_account;
      to_account_value := target_to_account;
    end if;

    if target_kind in ('partner_capital','partner_advance','personal_expense','reimbursement','withdrawal') then
      if target_partner is null then raise exception 'partner_required'; end if;
      if not exists (select 1 from business_partners where id=target_partner and business_id=tx.business_id) then raise exception 'invalid_partner'; end if;
      partner_value := target_partner;
    end if;
  end if;

  delete from business_transaction_approvals where transaction_id=tx.id;
  delete from business_ledger_entries where transaction_id=tx.id;

  update business_transactions
  set kind=target_kind,
      amount=round(target_amount,2),
      account_id=account_value,
      to_account_id=to_account_value,
      partner_id=partner_value,
      category_id=target_category,
      counterparty=nullif(trim(coalesce(target_counterparty,'')),''),
      note=nullif(trim(coalesce(target_note,'')),''),
      approval_status=target_approval_status,
      payment_status=target_payment_status,
      due_date=case when target_kind='expense' and target_payment_status='unpaid' then target_due_date else null end,
      paid_at=case when target_kind='expense' and target_payment_status='unpaid' then null else paid_at_value end,
      occurred_at=coalesce(target_occurred_at,now()),
      reversed_transaction_id=null,
      supersedes_transaction_id=null,
      reversed_at=null,
      reversed_by=null
  where id=tx.id;

  if target_kind in ('income','refund') then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,round(target_amount,2));
  elsif target_kind='expense' and target_payment_status='paid' and target_paid_by='business' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,-round(target_amount,2));
  elsif target_kind='expense' and target_payment_status='paid' and target_paid_by='partner' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_due',partner_value,round(target_amount,2));
  elsif target_kind='partner_capital' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,round(target_amount,2));
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_capital',partner_value,round(target_amount,2));
  elsif target_kind='partner_advance' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,round(target_amount,2));
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_due',partner_value,round(target_amount,2));
  elsif target_kind='personal_expense' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_due',partner_value,round(target_amount,2));
  elsif target_kind='reimbursement' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,-round(target_amount,2));
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_due',partner_value,-round(target_amount,2));
  elsif target_kind='withdrawal' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount)
    values (tx.business_id,tx.id,'account',account_value,-round(target_amount,2));
    insert into business_ledger_entries (business_id,transaction_id,bucket,partner_id,amount)
    values (tx.business_id,tx.id,'partner_withdrawal',partner_value,round(target_amount,2));
  elsif target_kind='transfer' then
    insert into business_ledger_entries (business_id,transaction_id,bucket,account_id,amount) values
      (tx.business_id,tx.id,'account',account_value,-round(target_amount,2)),
      (tx.business_id,tx.id,'account',to_account_value,round(target_amount,2));
  end if;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (tx.business_id,auth.uid(),'transaction_edited','transaction',tx.id,jsonb_build_object('kind',target_kind,'amount',round(target_amount,2),'approval_status',target_approval_status));
end;
$$;

create or replace function hard_delete_business_transaction(target_transaction uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype; child_ids uuid[];
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(id),array[]::uuid[]) into child_ids from business_transactions where reversed_transaction_id=tx.id;
  delete from business_activity_logs where business_id=tx.business_id and entity_type='transaction' and (entity_id=tx.id or entity_id=any(child_ids));
  if cardinality(child_ids)>0 then delete from business_transactions where id=any(child_ids); end if;
  update business_transactions set reversed_transaction_id=null where reversed_transaction_id=tx.id;
  delete from business_transactions where id=tx.id;
end;
$$;

create or replace function update_business_account_full(target_account uuid,target_name text,target_kind text,target_opening_balance numeric)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a business_accounts%rowtype;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,'')))<1 then raise exception 'account_name_required'; end if;
  if target_kind not in ('cash','bank','upi','wallet','other') then raise exception 'invalid_account_kind'; end if;
  update business_accounts set name=trim(target_name),kind=target_kind,opening_balance=round(coalesce(target_opening_balance,0),2) where id=a.id;
end;
$$;

create or replace function hard_delete_business_account(target_account uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a business_accounts%rowtype; tx_ids uuid[];
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(distinct t.id),array[]::uuid[]) into tx_ids from business_transactions t
  where t.business_id=a.business_id and (t.account_id=a.id or t.to_account_id=a.id or exists (select 1 from business_ledger_entries le where le.transaction_id=t.id and le.account_id=a.id));
  if cardinality(tx_ids)>0 then
    update business_transactions set reversed_transaction_id=null where reversed_transaction_id=any(tx_ids);
    delete from business_activity_logs where business_id=a.business_id and entity_type='transaction' and entity_id=any(tx_ids);
    delete from business_transactions where id=any(tx_ids);
  end if;
  delete from business_day_closings where account_id=a.id;
  delete from business_activity_logs where business_id=a.business_id and entity_type='account' and entity_id=a.id;
  delete from business_accounts where id=a.id;
end;
$$;

create or replace function update_business_partner_full(
  target_partner uuid,partner_name text,partner_email text default null,partner_phone text default null,
  partner_ownership numeric default null,member_role text default 'partner',member_status text default 'active'
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p business_partners%rowtype; normalized_email text; existing_user uuid; member business_memberships%rowtype;
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(partner_name,'')))<1 then raise exception 'partner_name_required'; end if;
  if partner_ownership is not null and (partner_ownership<0 or partner_ownership>100) then raise exception 'invalid_ownership'; end if;
  if member_role not in ('admin','partner','bookkeeper','viewer') then raise exception 'invalid_role'; end if;
  if member_status not in ('active','disabled') then raise exception 'invalid_status'; end if;
  normalized_email := nullif(lower(trim(coalesce(partner_email,''))),'');
  if normalized_email is not null then select id into existing_user from auth.users where lower(email)=normalized_email limit 1; end if;
  update business_partners set name=trim(partner_name),email=normalized_email,phone=nullif(trim(coalesce(partner_phone,'')),''),ownership_percent=partner_ownership,active=true where id=p.id;
  select * into member from business_memberships where partner_id=p.id limit 1;
  if normalized_email is null then
    if member.id is not null then delete from business_memberships where id=member.id; end if;
  elsif member.id is null then
    insert into business_memberships (business_id,user_id,partner_id,email,display_name,role,status)
    values (p.business_id,existing_user,p.id,normalized_email,trim(partner_name),member_role,member_status);
  else
    update business_memberships set user_id=existing_user,email=normalized_email,display_name=trim(partner_name),role=member_role,status=member_status where id=member.id;
  end if;
end;
$$;

create or replace function hard_delete_business_partner(target_partner uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p business_partners%rowtype; tx_ids uuid[];
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(distinct t.id),array[]::uuid[]) into tx_ids from business_transactions t
  where t.business_id=p.business_id and (t.partner_id=p.id or exists (select 1 from business_ledger_entries le where le.transaction_id=t.id and le.partner_id=p.id));
  if cardinality(tx_ids)>0 then
    update business_transactions set reversed_transaction_id=null where reversed_transaction_id=any(tx_ids);
    delete from business_activity_logs where business_id=p.business_id and entity_type='transaction' and entity_id=any(tx_ids);
    delete from business_transactions where id=any(tx_ids);
  end if;
  delete from business_memberships where partner_id=p.id;
  delete from business_activity_logs where business_id=p.business_id and entity_type='partner' and entity_id=p.id;
  delete from business_partners where id=p.id;
end;
$$;

create or replace function hard_delete_business_category(target_category uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c business_categories%rowtype;
begin
  select * into c from business_categories where id=target_category for update;
  if c.id is null then raise exception 'category_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  delete from business_activity_logs where business_id=c.business_id and entity_type='category' and entity_id=c.id;
  delete from business_categories where id=c.id;
end;
$$;

create or replace function update_business_day_closing(
  target_closing uuid,target_account uuid,target_close_date date,target_expected numeric,target_counted numeric,target_note text default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c business_day_closings%rowtype;
begin
  select * into c from business_day_closings where id=target_closing for update;
  if c.id is null then raise exception 'closing_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  if not exists (select 1 from business_accounts where id=target_account and business_id=c.business_id and kind='cash') then raise exception 'cash_account_required'; end if;
  update business_day_closings set account_id=target_account,close_date=target_close_date,expected_balance=round(target_expected,2),counted_balance=round(target_counted,2),difference=round(target_counted-target_expected,2),note=nullif(trim(coalesce(target_note,'')),'') where id=c.id;
end;
$$;

create or replace function hard_delete_business_day_closing(target_closing uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c business_day_closings%rowtype;
begin
  select * into c from business_day_closings where id=target_closing for update;
  if c.id is null then raise exception 'closing_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  delete from business_activity_logs where business_id=c.business_id and entity_type='day_closing' and entity_id=c.id;
  delete from business_day_closings where id=c.id;
end;
$$;

create or replace function hard_delete_business(target_business uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  delete from business_transaction_approvals where business_id=target_business;
  delete from business_attachments where business_id=target_business;
  delete from business_ledger_entries where business_id=target_business;
  delete from business_day_closings where business_id=target_business;
  update business_transactions set reversed_transaction_id=null where business_id=target_business;
  delete from business_transactions where business_id=target_business;
  delete from business_memberships where business_id=target_business;
  delete from business_partners where business_id=target_business;
  delete from business_categories where business_id=target_business;
  delete from business_accounts where business_id=target_business;
  delete from business_activity_logs where business_id=target_business;
  delete from businesses where id=target_business;
end;
$$;

revoke execute on function update_business_transaction_full(uuid,text,numeric,uuid,uuid,uuid,uuid,text,text,timestamptz,text,text,date,text) from public, anon;
revoke execute on function hard_delete_business_transaction(uuid) from public, anon;
revoke execute on function update_business_account_full(uuid,text,text,numeric) from public, anon;
revoke execute on function hard_delete_business_account(uuid) from public, anon;
revoke execute on function update_business_partner_full(uuid,text,text,text,numeric,text,text) from public, anon;
revoke execute on function hard_delete_business_partner(uuid) from public, anon;
revoke execute on function hard_delete_business_category(uuid) from public, anon;
revoke execute on function update_business_day_closing(uuid,uuid,date,numeric,numeric,text) from public, anon;
revoke execute on function hard_delete_business_day_closing(uuid) from public, anon;
revoke execute on function hard_delete_business(uuid) from public, anon;

grant execute on function update_business_transaction_full(uuid,text,numeric,uuid,uuid,uuid,uuid,text,text,timestamptz,text,text,date,text) to authenticated;
grant execute on function hard_delete_business_transaction(uuid) to authenticated;
grant execute on function update_business_account_full(uuid,text,text,numeric) to authenticated;
grant execute on function hard_delete_business_account(uuid) to authenticated;
grant execute on function update_business_partner_full(uuid,text,text,text,numeric,text,text) to authenticated;
grant execute on function hard_delete_business_partner(uuid) to authenticated;
grant execute on function hard_delete_business_category(uuid) to authenticated;
grant execute on function update_business_day_closing(uuid,uuid,date,numeric,numeric,text) to authenticated;
grant execute on function hard_delete_business_day_closing(uuid) to authenticated;
grant execute on function hard_delete_business(uuid) to authenticated;
