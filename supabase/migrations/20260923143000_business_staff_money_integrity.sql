-- Business staff-money integrity hardening.
-- A staff advance is business money held by that staff member. Settlement can
-- consume held money and personal dues, so every later spend/reimbursement
-- must calculate against the post-settlement position.

create or replace function private.enforce_business_staff_money_scope()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not exists (
    select 1 from business_staff s
    where s.id=new.staff_id and s.business_id=new.business_id
  ) then
    raise exception 'staff_not_in_business';
  end if;

  if new.account_id is not null and not exists (
    select 1 from business_accounts a
    where a.id=new.account_id and a.business_id=new.business_id and a.active
  ) then
    raise exception 'account_not_in_business';
  end if;

  if new.category_id is not null and not exists (
    select 1 from business_categories c
    where c.id=new.category_id and c.business_id=new.business_id and c.active
  ) then
    raise exception 'category_not_in_business';
  end if;

  return new;
end;
$$;

drop trigger if exists business_staff_money_scope_guard on business_staff_money;
create trigger business_staff_money_scope_guard
before insert or update of business_id,staff_id,account_id,category_id
on business_staff_money
for each row execute function private.enforce_business_staff_money_scope();

create or replace function record_business_staff_money(
  target_business uuid,
  target_staff uuid,
  target_kind text,
  target_amount numeric,
  target_account uuid default null,
  target_category uuid default null,
  target_counterparty text default null,
  target_note text default null,
  target_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  new_entry uuid;
  actor_staff uuid;
  advance_balance numeric:=0;
  due_balance numeric:=0;
begin
  if not exists (
    select 1 from business_staff s
    where s.id=target_staff and s.business_id=target_business and s.active
  ) then
    raise exception 'staff_not_in_business';
  end if;

  actor_staff:=private.business_staff_id(target_business);
  if not private.can_manage_business_team(target_business)
     and not (actor_staff=target_staff and target_kind in ('advance_expense','pocket_expense')) then
    raise exception 'not_allowed';
  end if;

  if target_kind not in ('advance','advance_expense','pocket_expense','reimbursement','salary','advance_return') then
    raise exception 'invalid_kind';
  end if;
  if target_amount is null or target_amount<=0 then
    raise exception 'invalid_amount';
  end if;

  if target_account is not null and not exists (
    select 1 from business_accounts a
    where a.id=target_account and a.business_id=target_business and a.active
  ) then
    raise exception 'account_not_in_business';
  end if;

  if target_category is not null and not exists (
    select 1 from business_categories c
    where c.id=target_category and c.business_id=target_business and c.active
  ) then
    raise exception 'category_not_in_business';
  end if;

  if target_kind in ('advance','reimbursement','salary','advance_return') then
    if target_account is null then raise exception 'account_required'; end if;
  else
    target_account:=null;
  end if;

  if target_kind in ('advance_expense','advance_return') then
    select
      coalesce(sum(amount) filter(where kind='advance'),0)
      - coalesce(sum(amount) filter(where kind='advance_expense'),0)
      - coalesce(sum(amount) filter(where kind='advance_return'),0)
      - coalesce(sum(amount) filter(where kind='settlement'),0)
    into advance_balance
    from business_staff_money
    where business_id=target_business and staff_id=target_staff;

    if advance_balance<target_amount then
      raise exception 'amount_exceeds_staff_advance_balance';
    end if;
  end if;

  if target_kind='reimbursement' then
    select
      coalesce(sum(amount) filter(where kind='pocket_expense'),0)
      - coalesce(sum(amount) filter(where kind='reimbursement'),0)
      - coalesce(sum(amount) filter(where kind='settlement'),0)
    into due_balance
    from business_staff_money
    where business_id=target_business and staff_id=target_staff;

    if due_balance<target_amount then
      raise exception 'reimbursement_exceeds_staff_due';
    end if;
  end if;

  insert into business_staff_money(
    business_id,staff_id,kind,amount,account_id,category_id,
    counterparty,note,occurred_at,created_by
  )
  values(
    target_business,target_staff,target_kind,round(target_amount,2),
    target_account,target_category,
    nullif(trim(coalesce(target_counterparty,'')),''),
    nullif(trim(coalesce(target_note,'')),''),
    coalesce(target_occurred_at,now()),auth.uid()
  )
  returning id into new_entry;

  return new_entry;
end;
$$;

revoke execute on function record_business_staff_money(uuid,uuid,text,numeric,uuid,uuid,text,text,timestamptz) from public,anon;
grant execute on function record_business_staff_money(uuid,uuid,text,numeric,uuid,uuid,text,text,timestamptz) to authenticated;

-- Recurring templates are also security-definer writes; validate optional
-- category ownership explicitly rather than relying on the foreign key alone.
create or replace function create_business_recurring_entry(
  target_business uuid,
  target_kind text,
  target_label text,
  target_amount numeric,
  target_account uuid default null,
  target_partner uuid default null,
  target_category uuid default null,
  target_counterparty text default null,
  target_note text default null,
  target_paid_by text default 'business',
  target_cadence text default 'monthly',
  target_next_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare new_id uuid;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_kind not in ('income','expense') or target_amount is null or target_amount<=0 then
    raise exception 'invalid_recurring_entry';
  end if;
  if char_length(trim(coalesce(target_label,'')))<1 then raise exception 'label_required'; end if;
  if target_cadence not in ('weekly','monthly') then raise exception 'invalid_cadence'; end if;

  if target_category is not null and not exists (
    select 1 from business_categories c
    where c.id=target_category and c.business_id=target_business and c.active
  ) then
    raise exception 'category_not_in_business';
  end if;

  if target_kind='income' or target_paid_by='business' then
    if target_account is null or not exists (
      select 1 from business_accounts a
      where a.id=target_account and a.business_id=target_business and a.active
    ) then
      raise exception 'account_required';
    end if;
    target_partner:=null;
  elsif target_paid_by='partner' then
    if target_partner is null or not exists (
      select 1 from business_partners p
      where p.id=target_partner and p.business_id=target_business and p.active
    ) then
      raise exception 'partner_required';
    end if;
    target_account:=null;
  else
    raise exception 'invalid_paid_by';
  end if;

  insert into business_recurring_entries(
    business_id,kind,label,amount,account_id,partner_id,category_id,
    counterparty,note,paid_by,cadence,next_date,created_by
  )
  values(
    target_business,target_kind,trim(target_label),round(target_amount,2),
    target_account,target_partner,target_category,
    nullif(trim(coalesce(target_counterparty,'')),''),
    nullif(trim(coalesce(target_note,'')),''),
    target_paid_by,target_cadence,target_next_date,auth.uid()
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function create_business_recurring_entry(uuid,text,text,numeric,uuid,uuid,uuid,text,text,text,text,date) from public,anon;
grant execute on function create_business_recurring_entry(uuid,text,text,numeric,uuid,uuid,uuid,text,text,text,text,date) to authenticated;
