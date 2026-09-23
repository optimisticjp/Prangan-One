-- Business Money Flow v2
-- Distinguishes business-money custody from personal money owed, adds open
-- receivables/payables with partial settlement, amount-based reviews, recurring
-- entries, and safe staff/partner settlement.

alter table business_accounts
  add column if not exists custodian_partner_id uuid references business_partners(id) on delete set null;
create index if not exists business_accounts_custodian_partner_idx
  on business_accounts (business_id,custodian_partner_id) where custodian_partner_id is not null;

alter table businesses
  add column if not exists approval_one_above numeric(14,2),
  add column if not exists approval_all_above numeric(14,2);
update businesses set
  approval_one_above=case when approval_mode='none' then null else 0 end,
  approval_all_above=case when approval_mode='all_partners' then 0 else null end
where approval_one_above is null and approval_all_above is null;
alter table businesses drop constraint if exists businesses_review_threshold_check;
alter table businesses add constraint businesses_review_threshold_check check (
  approval_one_above is null or (
    approval_one_above>=0 and
    (approval_all_above is null or approval_all_above>=approval_one_above)
  )
);

alter table business_transactions
  add column if not exists approval_rule text not null default 'not_required',
  add column if not exists paid_amount numeric(14,2) not null default 0;
alter table business_transactions drop constraint if exists business_transactions_approval_rule_check;
alter table business_transactions add constraint business_transactions_approval_rule_check
  check (approval_rule in ('not_required','one_partner','all_partners'));
update business_transactions t set approval_rule=case
  when t.approval_status='not_required' then 'not_required'
  when b.approval_mode='all_partners' then 'all_partners'
  else 'one_partner' end
from businesses b where b.id=t.business_id;
update business_transactions set paid_amount=case when payment_status='paid' then amount else 0 end;
alter table business_transactions drop constraint if exists business_transactions_payment_status_check;
alter table business_transactions add constraint business_transactions_payment_status_check
  check (payment_status in ('unpaid','partial','paid'));
alter table business_transactions drop constraint if exists business_expense_payment_shape_check;
alter table business_transactions drop constraint if exists business_transaction_payment_progress_check;
alter table business_transactions add constraint business_transaction_payment_progress_check check (
  kind not in ('income','expense') or (
    paid_amount>=0 and paid_amount<=amount and
    ((payment_status='unpaid' and paid_amount=0)
      or (payment_status='partial' and paid_amount>0 and paid_amount<amount)
      or (payment_status='paid' and paid_amount=amount))
  )
);

create table if not exists business_transaction_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  amount numeric(14,2) not null check (amount>0),
  direction text not null check (direction in ('in','out')),
  account_id uuid references business_accounts(id) on delete restrict,
  partner_id uuid references business_partners(id) on delete restrict,
  note text,
  is_initial boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (
    (direction='in' and account_id is not null and partner_id is null)
    or (direction='out' and num_nonnulls(account_id,partner_id)=1)
  )
);
create index if not exists business_transaction_payments_tx_idx on business_transaction_payments(transaction_id,occurred_at);
create index if not exists business_transaction_payments_business_idx on business_transaction_payments(business_id,occurred_at desc);
create unique index if not exists business_transaction_payments_initial_idx on business_transaction_payments(transaction_id) where is_initial;
alter table business_transaction_payments enable row level security;
drop policy if exists business_transaction_payments_select on business_transaction_payments;
create policy business_transaction_payments_select on business_transaction_payments for select
  using (private.is_business_member(business_id));
grant select on business_transaction_payments to authenticated;
revoke all on business_transaction_payments from anon;

insert into business_transaction_payments(
  business_id,transaction_id,amount,direction,account_id,partner_id,note,is_initial,occurred_at,created_by
)
select t.business_id,t.id,t.amount,
  case when t.kind='income' then 'in' else 'out' end,
  t.account_id,case when t.kind='expense' then t.partner_id else null end,
  'Opening payment history',true,coalesce(t.paid_at,t.occurred_at),t.created_by
from business_transactions t
where t.kind in ('income','expense') and t.payment_status='paid'
  and ((t.kind='income' and t.account_id is not null)
    or (t.kind='expense' and num_nonnulls(t.account_id,t.partner_id)=1))
on conflict do nothing;

create or replace function private.enforce_business_account_custodian()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.custodian_partner_id is not null and not exists(
    select 1 from business_partners p
    where p.id=new.custodian_partner_id and p.business_id=new.business_id and p.active
  ) then raise exception 'invalid_account_custodian'; end if;
  return new;
end $$;
drop trigger if exists business_account_custodian_guard on business_accounts;
create trigger business_account_custodian_guard before insert or update of business_id,custodian_partner_id
on business_accounts for each row execute function private.enforce_business_account_custodian();

create or replace function record_business_income(
  target_business uuid,target_amount numeric,target_payment_status text default 'paid',
  target_account uuid default null,target_category uuid default null,
  target_counterparty text default null,target_note text default null,
  target_due_date date default null,target_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_tx uuid; paid numeric:=0;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_amount is null or target_amount<=0 then raise exception 'invalid_amount'; end if;
  if target_payment_status not in ('unpaid','paid') then raise exception 'invalid_payment_status'; end if;
  if target_category is not null and not exists(select 1 from business_categories where id=target_category and business_id=target_business and active) then raise exception 'invalid_category'; end if;
  if target_payment_status='paid' then
    if target_account is null or not exists(select 1 from business_accounts where id=target_account and business_id=target_business and active) then raise exception 'account_required'; end if;
    paid:=round(target_amount,2);
  elsif nullif(trim(coalesce(target_counterparty,'')),'') is null then
    raise exception 'counterparty_required_for_receivable';
  end if;
  insert into business_transactions(
    business_id,kind,amount,paid_amount,account_id,category_id,counterparty,note,
    approval_status,approval_rule,payment_status,due_date,paid_at,occurred_at,created_by
  ) values(
    target_business,'income',round(target_amount,2),paid,
    case when target_payment_status='paid' then target_account else null end,target_category,
    nullif(trim(coalesce(target_counterparty,'')),''),nullif(trim(coalesce(target_note,'')),''),
    'not_required','not_required',target_payment_status,
    case when target_payment_status='unpaid' then target_due_date else null end,
    case when target_payment_status='paid' then coalesce(target_occurred_at,now()) else null end,
    coalesce(target_occurred_at,now()),auth.uid()
  ) returning id into new_tx;
  if target_payment_status='paid' then
    insert into business_ledger_entries(business_id,transaction_id,bucket,account_id,amount)
      values(target_business,new_tx,'account',target_account,round(target_amount,2));
    insert into business_transaction_payments(business_id,transaction_id,amount,direction,account_id,is_initial,occurred_at,created_by)
      values(target_business,new_tx,round(target_amount,2),'in',target_account,true,coalesce(target_occurred_at,now()),auth.uid());
  end if;
  insert into business_activity_logs(business_id,actor_user_id,action,entity_type,entity_id,detail)
    values(target_business,auth.uid(),'income_recorded','transaction',new_tx,jsonb_build_object('amount',target_amount,'payment_status',target_payment_status));
  return new_tx;
end $$;

create or replace function record_business_expense(
  target_business uuid,target_amount numeric,target_payment_status text default 'paid',
  target_paid_by text default 'business',target_account uuid default null,target_partner uuid default null,
  target_category uuid default null,target_counterparty text default null,target_note text default null,
  target_due_date date default null,target_occurred_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_tx uuid; approval text:='not_required'; rule text:='not_required'; eligible int:=0; one_above numeric; all_above numeric; acc uuid:=null; partner uuid:=null; paid numeric:=0;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_amount is null or target_amount<=0 then raise exception 'invalid_amount'; end if;
  if target_payment_status not in ('unpaid','paid') then raise exception 'invalid_payment_status'; end if;
  if target_category is not null and not exists(select 1 from business_categories where id=target_category and business_id=target_business and active) then raise exception 'invalid_category'; end if;
  if target_payment_status='paid' and target_paid_by='business' then
    if target_account is null or not exists(select 1 from business_accounts where id=target_account and business_id=target_business and active) then raise exception 'account_required'; end if;
    acc:=target_account; paid:=round(target_amount,2);
  elsif target_payment_status='paid' and target_paid_by='partner' then
    if target_partner is null or not exists(select 1 from business_partners where id=target_partner and business_id=target_business and active) then raise exception 'partner_required'; end if;
    partner:=target_partner; paid:=round(target_amount,2);
  elsif target_payment_status='paid' then raise exception 'invalid_paid_by'; end if;

  select approval_one_above,approval_all_above into one_above,all_above from businesses where id=target_business;
  if one_above is not null and target_amount>one_above then
    rule:=case when all_above is not null and target_amount>all_above then 'all_partners' else 'one_partner' end;
  end if;
  select count(*) into eligible from business_memberships
   where business_id=target_business and status='active' and user_id is not null and user_id<>auth.uid() and role in ('admin','partner');
  if rule<>'not_required' and eligible>0 then approval:='pending'; end if;

  insert into business_transactions(
    business_id,kind,amount,paid_amount,account_id,partner_id,category_id,counterparty,note,
    approval_status,approval_rule,payment_status,due_date,paid_at,occurred_at,created_by
  ) values(
    target_business,'expense',round(target_amount,2),paid,acc,partner,target_category,
    nullif(trim(coalesce(target_counterparty,'')),''),nullif(trim(coalesce(target_note,'')),''),
    approval,rule,target_payment_status,case when target_payment_status='unpaid' then target_due_date else null end,
    case when target_payment_status='paid' then coalesce(target_occurred_at,now()) else null end,
    coalesce(target_occurred_at,now()),auth.uid()
  ) returning id into new_tx;
  if target_payment_status='paid' and acc is not null then
    insert into business_ledger_entries(business_id,transaction_id,bucket,account_id,amount)
      values(target_business,new_tx,'account',acc,-round(target_amount,2));
    insert into business_transaction_payments(business_id,transaction_id,amount,direction,account_id,is_initial,occurred_at,created_by)
      values(target_business,new_tx,round(target_amount,2),'out',acc,true,coalesce(target_occurred_at,now()),auth.uid());
  elsif target_payment_status='paid' and partner is not null then
    insert into business_ledger_entries(business_id,transaction_id,bucket,partner_id,amount)
      values(target_business,new_tx,'partner_due',partner,round(target_amount,2));
    insert into business_transaction_payments(business_id,transaction_id,amount,direction,partner_id,is_initial,occurred_at,created_by)
      values(target_business,new_tx,round(target_amount,2),'out',partner,true,coalesce(target_occurred_at,now()),auth.uid());
  end if;
  insert into business_activity_logs(business_id,actor_user_id,action,entity_type,entity_id,detail)
    values(target_business,auth.uid(),'expense_recorded','transaction',new_tx,jsonb_build_object('amount',target_amount,'payment_status',target_payment_status,'approval_rule',rule));
  return new_tx;
end $$;

create or replace function settle_business_transaction(
  target_transaction uuid,target_amount numeric,target_account uuid default null,target_partner uuid default null,
  target_paid_at timestamptz default now(),target_note text default null
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare tx business_transactions%rowtype; remaining numeric; new_paid numeric; new_status text;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if tx.kind not in ('income','expense') or tx.reversed_at is not null then raise exception 'open_transaction_required'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  remaining:=round(tx.amount-tx.paid_amount,2);
  if target_amount is null or target_amount<=0 or target_amount>remaining then raise exception 'invalid_settlement_amount'; end if;
  if tx.kind='income' then
    if target_account is null or target_partner is not null or not exists(select 1 from business_accounts where id=target_account and business_id=tx.business_id and active) then raise exception 'account_required'; end if;
    insert into business_ledger_entries(business_id,transaction_id,bucket,account_id,amount) values(tx.business_id,tx.id,'account',target_account,round(target_amount,2));
    insert into business_transaction_payments(business_id,transaction_id,amount,direction,account_id,note,occurred_at,created_by)
      values(tx.business_id,tx.id,round(target_amount,2),'in',target_account,nullif(trim(coalesce(target_note,'')),''),coalesce(target_paid_at,now()),auth.uid());
  else
    if num_nonnulls(target_account,target_partner)<>1 then raise exception 'one_payment_source_required'; end if;
    if target_account is not null then
      if not exists(select 1 from business_accounts where id=target_account and business_id=tx.business_id and active) then raise exception 'invalid_account'; end if;
      insert into business_ledger_entries(business_id,transaction_id,bucket,account_id,amount) values(tx.business_id,tx.id,'account',target_account,-round(target_amount,2));
      insert into business_transaction_payments(business_id,transaction_id,amount,direction,account_id,note,occurred_at,created_by)
        values(tx.business_id,tx.id,round(target_amount,2),'out',target_account,nullif(trim(coalesce(target_note,'')),''),coalesce(target_paid_at,now()),auth.uid());
    else
      if not exists(select 1 from business_partners where id=target_partner and business_id=tx.business_id and active) then raise exception 'invalid_partner'; end if;
      insert into business_ledger_entries(business_id,transaction_id,bucket,partner_id,amount) values(tx.business_id,tx.id,'partner_due',target_partner,round(target_amount,2));
      insert into business_transaction_payments(business_id,transaction_id,amount,direction,partner_id,note,occurred_at,created_by)
        values(tx.business_id,tx.id,round(target_amount,2),'out',target_partner,nullif(trim(coalesce(target_note,'')),''),coalesce(target_paid_at,now()),auth.uid());
    end if;
  end if;
  new_paid:=round(tx.paid_amount+target_amount,2);
  new_status:=case when new_paid>=tx.amount then 'paid' else 'partial' end;
  update business_transactions set paid_amount=new_paid,payment_status=new_status,
    paid_at=case when new_status='paid' then coalesce(target_paid_at,now()) else null end where id=tx.id;
  insert into business_activity_logs(business_id,actor_user_id,action,entity_type,entity_id,detail)
    values(tx.business_id,auth.uid(),case when tx.kind='income' then 'receivable_collected' else 'expense_paid' end,'transaction',tx.id,
      jsonb_build_object('amount',target_amount,'payment_status',new_status,'remaining',round(tx.amount-new_paid,2)));
  return new_status;
end $$;

create or replace function mark_business_expense_paid(
  target_transaction uuid,target_paid_by text,target_account uuid default null,target_partner uuid default null,target_paid_at timestamptz default now()
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare tx business_transactions%rowtype; remaining numeric;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null or tx.kind<>'expense' then raise exception 'expense_required'; end if;
  remaining:=round(tx.amount-tx.paid_amount,2);
  if remaining<=0 then raise exception 'expense_already_paid'; end if;
  if target_paid_by='business' then perform settle_business_transaction(tx.id,remaining,target_account,null,target_paid_at,'Paid in full');
  elsif target_paid_by='partner' then perform settle_business_transaction(tx.id,remaining,null,target_partner,target_paid_at,'Paid in full by partner');
  else raise exception 'invalid_paid_by'; end if;
end $$;

create or replace function edit_business_transaction_details(
  target_transaction uuid,target_counterparty text default null,target_note text default null,
  target_category uuid default null,target_due_date date default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare tx business_transactions%rowtype;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if target_category is not null and not exists(select 1 from business_categories where id=target_category and business_id=tx.business_id and active) then raise exception 'invalid_category'; end if;
  update business_transactions set
    counterparty=nullif(trim(coalesce(target_counterparty,'')),''),
    note=nullif(trim(coalesce(target_note,'')),''),
    category_id=target_category,
    due_date=case when kind in ('income','expense') and payment_status<>'paid' then target_due_date else null end
  where id=tx.id;
  insert into business_activity_logs(business_id,actor_user_id,action,entity_type,entity_id,detail)
    values(tx.business_id,auth.uid(),'transaction_details_edited','transaction',tx.id,'{}'::jsonb);
end $$;

create or replace function add_business_account_v2(
  target_business uuid,target_name text,target_kind text,target_opening_balance numeric default 0,target_custodian_partner uuid default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,'')))<1 then raise exception 'account_name_required'; end if;
  if target_kind not in ('cash','bank','upi','wallet','other') then raise exception 'invalid_account_kind'; end if;
  if target_custodian_partner is not null and not exists(select 1 from business_partners where id=target_custodian_partner and business_id=target_business and active) then raise exception 'invalid_account_custodian'; end if;
  insert into business_accounts(business_id,name,kind,opening_balance,custodian_partner_id)
    values(target_business,trim(target_name),target_kind,round(coalesce(target_opening_balance,0),2),target_custodian_partner)
    returning id into new_id;
  return new_id;
end $$;

create or replace function update_business_account_v2(
  target_account uuid,target_name text,target_kind text,target_opening_balance numeric,target_custodian_partner uuid default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a business_accounts%rowtype;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null or not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;
  if target_kind not in ('cash','bank','upi','wallet','other') then raise exception 'invalid_account_kind'; end if;
  if target_custodian_partner is not null and not exists(select 1 from business_partners where id=target_custodian_partner and business_id=a.business_id and active) then raise exception 'invalid_account_custodian'; end if;
  update business_accounts set name=trim(target_name),kind=target_kind,opening_balance=round(coalesce(target_opening_balance,0),2),custodian_partner_id=target_custodian_partner where id=a.id;
end $$;

create or replace function settle_business_partner_money(
  target_partner uuid,target_held_account uuid,target_destination_account uuid default null,
  target_reimburse numeric default 0,target_return numeric default 0,target_note text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p business_partners%rowtype; held numeric; due numeric;
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null or not private.can_write_business(p.business_id) then raise exception 'not_allowed'; end if;
  if not exists(select 1 from business_accounts a where a.id=target_held_account and a.business_id=p.business_id and a.active and a.custodian_partner_id=p.id) then raise exception 'partner_held_account_required'; end if;
  select balance into held from get_business_account_balances(p.business_id) where account_id=target_held_account;
  select outstanding_due into due from get_business_partner_positions(p.business_id) where partner_id=p.id;
  target_reimburse:=round(coalesce(target_reimburse,0),2); target_return:=round(coalesce(target_return,0),2);
  if target_reimburse<0 or target_return<0 or target_reimburse+target_return<=0 then raise exception 'settlement_amount_required'; end if;
  if target_reimburse>coalesce(due,0) then raise exception 'reimbursement_exceeds_due'; end if;
  if target_reimburse+target_return>coalesce(held,0) then raise exception 'settlement_exceeds_held_money'; end if;
  if target_reimburse>0 then
    perform post_business_transaction(p.business_id,'reimbursement',target_reimburse,target_held_account,null,p.id,null,null,coalesce(nullif(trim(coalesce(target_note,'')),''),'Partner settlement from held business money'),now());
  end if;
  if target_return>0 then
    if target_destination_account is null or target_destination_account=target_held_account then raise exception 'destination_account_required'; end if;
    perform post_business_transaction(p.business_id,'transfer',target_return,target_held_account,target_destination_account,null,null,null,coalesce(nullif(trim(coalesce(target_note,'')),''),'Partner returned business money'),now());
  end if;
  insert into business_activity_logs(business_id,actor_user_id,action,entity_type,entity_id,detail)
    values(p.business_id,auth.uid(),'partner_money_settled','partner',p.id,jsonb_build_object('reimbursed',target_reimburse,'returned',target_return));
end $$;

create or replace function get_business_partner_positions(target_business uuid)
returns table(partner_id uuid,name text,capital numeric,advances numeric,personal_expenses numeric,reimbursements numeric,outstanding_due numeric,withdrawals numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query select p.id,p.name,
    coalesce((select sum(le.amount) from business_ledger_entries le where le.business_id=target_business and le.partner_id=p.id and le.bucket='partner_capital'),0)::numeric,
    coalesce((select sum(t.amount) from business_transactions t where t.business_id=target_business and t.partner_id=p.id and t.kind='partner_advance' and t.reversed_at is null),0)::numeric,
    (coalesce((select sum(bp.amount) from business_transaction_payments bp join business_transactions bt on bt.id=bp.transaction_id where bp.business_id=target_business and bp.partner_id=p.id and bp.direction='out' and bt.kind='expense' and bt.reversed_at is null),0)
     +coalesce((select sum(t.amount) from business_transactions t where t.business_id=target_business and t.partner_id=p.id and t.kind='personal_expense' and t.reversed_at is null),0))::numeric,
    coalesce((select sum(t.amount) from business_transactions t where t.business_id=target_business and t.partner_id=p.id and t.kind='reimbursement' and t.reversed_at is null),0)::numeric,
    coalesce((select sum(le.amount) from business_ledger_entries le where le.business_id=target_business and le.partner_id=p.id and le.bucket='partner_due'),0)::numeric,
    coalesce((select sum(le.amount) from business_ledger_entries le where le.business_id=target_business and le.partner_id=p.id and le.bucket='partner_withdrawal'),0)::numeric
  from business_partners p where p.business_id=target_business and p.active order by p.created_at;
end $$;

alter table business_staff_money drop constraint if exists business_staff_money_kind_check;
alter table business_staff_money add constraint business_staff_money_kind_check
  check(kind in ('advance','advance_expense','pocket_expense','reimbursement','salary','advance_return','settlement'));

drop function if exists get_business_staff_positions(uuid);
create function get_business_staff_positions(target_business uuid)
returns table(staff_id uuid,name text,title text,salary_amount numeric,salary_period text,advance_received numeric,advance_spent numeric,advance_returned numeric,settled_from_held numeric,advance_balance numeric,pocket_expenses numeric,reimbursements numeric,outstanding_due numeric,salary_paid numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not private.is_business_member(target_business) and private.business_staff_id(target_business) is null then raise exception 'not_allowed'; end if;
  return query select s.id,s.name,s.title,s.salary_amount,s.salary_period,
    coalesce(sum(m.amount) filter(where m.kind='advance'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='advance_expense'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='advance_return'),0)::numeric,
    coalesce(sum(m.amount) filter(where m.kind='settlement'),0)::numeric,
    (coalesce(sum(m.amount) filter(where m.kind='advance'),0)-coalesce(sum(m.amount) filter(where m.kind='advance_expense'),0)-coalesce(sum(m.amount) filter(where m.kind='advance_return'),0)-coalesce(sum(m.amount) filter(where m.kind='settlement'),0))::numeric,
    coalesce(sum(m.amount) filter(where m.kind='pocket_expense'),0)::numeric,
    (coalesce(sum(m.amount) filter(where m.kind='reimbursement'),0)+coalesce(sum(m.amount) filter(where m.kind='settlement'),0))::numeric,
    (coalesce(sum(m.amount) filter(where m.kind='pocket_expense'),0)-coalesce(sum(m.amount) filter(where m.kind='reimbursement'),0)-coalesce(sum(m.amount) filter(where m.kind='settlement'),0))::numeric,
    coalesce(sum(m.amount) filter(where m.kind='salary'),0)::numeric
  from business_staff s left join business_staff_money m on m.staff_id=s.id and m.business_id=s.business_id
  where s.business_id=target_business and (private.can_manage_business_team(target_business) or s.id=private.business_staff_id(target_business))
  group by s.id,s.name,s.title,s.salary_amount,s.salary_period,s.created_at order by s.created_at;
end $$;

create or replace function settle_business_staff_money(
  target_staff uuid,target_offset numeric default 0,target_return_account uuid default null,
  target_return_amount numeric default 0,target_note text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s business_staff%rowtype; held numeric; due numeric;
begin
  select * into s from business_staff where id=target_staff for update;
  if s.id is null or not private.can_manage_business_team(s.business_id) then raise exception 'not_allowed'; end if;
  select advance_balance,outstanding_due into held,due from get_business_staff_positions(s.business_id) where staff_id=s.id;
  target_offset:=round(coalesce(target_offset,0),2); target_return_amount:=round(coalesce(target_return_amount,0),2);
  if target_offset<0 or target_return_amount<0 or target_offset+target_return_amount<=0 then raise exception 'settlement_amount_required'; end if;
  if target_offset>least(coalesce(held,0),coalesce(due,0)) then raise exception 'staff_offset_exceeds_available'; end if;
  if target_return_amount>coalesce(held,0)-target_offset then raise exception 'staff_return_exceeds_held_money'; end if;
  if target_offset>0 then
    insert into business_staff_money(business_id,staff_id,kind,amount,note,occurred_at,created_by)
      values(s.business_id,s.id,'settlement',target_offset,coalesce(nullif(trim(coalesce(target_note,'')),''),'Pocket expense settled from business money held'),now(),auth.uid());
  end if;
  if target_return_amount>0 then
    if target_return_account is null or not exists(select 1 from business_accounts where id=target_return_account and business_id=s.business_id and active) then raise exception 'return_account_required'; end if;
    insert into business_staff_money(business_id,staff_id,kind,amount,account_id,note,occurred_at,created_by)
      values(s.business_id,s.id,'advance_return',target_return_amount,target_return_account,coalesce(nullif(trim(coalesce(target_note,'')),''),'Unused business money returned'),now(),auth.uid());
  end if;
end $$;

create or replace function update_business_settings_v2(
 target_business uuid,target_name text,target_approval_one_above numeric default null,target_approval_all_above numeric default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare legacy text;
begin
 if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
 if char_length(trim(coalesce(target_name,'')))<2 then raise exception 'business_name_required'; end if;
 if target_approval_one_above is not null and target_approval_one_above<0 then raise exception 'invalid_review_threshold'; end if;
 if target_approval_all_above is not null and (target_approval_one_above is null or target_approval_all_above<target_approval_one_above) then raise exception 'invalid_all_partners_threshold'; end if;
 legacy:=case when target_approval_one_above is null then 'none' when target_approval_one_above=0 and target_approval_all_above=0 then 'all_partners' else 'one_partner' end;
 update businesses set name=trim(target_name),approval_mode=legacy,approval_one_above=target_approval_one_above,approval_all_above=target_approval_all_above,updated_at=now() where id=target_business;
end $$;

create or replace function approve_business_transaction(target_transaction uuid,target_note text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare tx business_transactions%rowtype; approved_count int; required_count int; final_status text;
begin
 select * into tx from business_transactions where id=target_transaction for update;
 if tx.id is null then raise exception 'transaction_not_found'; end if;
 if not private.can_approve_business(tx.business_id) then raise exception 'not_allowed'; end if;
 if tx.created_by=auth.uid() then raise exception 'creator_cannot_self_approve'; end if;
 if tx.approval_status not in ('pending','approved') or tx.approval_rule='not_required' then raise exception 'transaction_not_pending'; end if;
 insert into business_transaction_approvals(business_id,transaction_id,approver_user_id,decision,note)
 values(tx.business_id,tx.id,auth.uid(),'approved',nullif(trim(coalesce(target_note,'')),''))
 on conflict(transaction_id,approver_user_id) do update set decision='approved',note=excluded.note,decided_at=now();
 select count(*) into approved_count from business_transaction_approvals where transaction_id=tx.id and decision='approved';
 select count(*) into required_count from business_memberships where business_id=tx.business_id and status='active' and user_id is not null and user_id<>tx.created_by and role in ('admin','partner');
 final_status:=case when tx.approval_rule='one_partner' and approved_count>=1 then 'approved' when tx.approval_rule='all_partners' and approved_count>=required_count then 'approved' else 'pending' end;
 update business_transactions set approval_status=final_status where id=tx.id;
 return final_status;
end $$;

create table if not exists business_recurring_entries(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references businesses(id) on delete cascade,
 kind text not null check(kind in ('income','expense')),label text not null check(char_length(trim(label)) between 1 and 120),
 amount numeric(14,2) not null check(amount>0),account_id uuid references business_accounts(id) on delete cascade,
 partner_id uuid references business_partners(id) on delete cascade,category_id uuid references business_categories(id) on delete set null,
 counterparty text,note text,paid_by text not null default 'business' check(paid_by in ('business','partner')),
 cadence text not null check(cadence in ('weekly','monthly')),next_date date not null,active boolean not null default true,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index if not exists business_recurring_entries_due_idx on business_recurring_entries(business_id,active,next_date);
alter table business_recurring_entries enable row level security;
drop policy if exists business_recurring_entries_select on business_recurring_entries;
create policy business_recurring_entries_select on business_recurring_entries for select using(private.is_business_member(business_id));
grant select on business_recurring_entries to authenticated; revoke all on business_recurring_entries from anon;

create or replace function create_business_recurring_entry(
 target_business uuid,target_kind text,target_label text,target_amount numeric,target_account uuid default null,
 target_partner uuid default null,target_category uuid default null,target_counterparty text default null,target_note text default null,
 target_paid_by text default 'business',target_cadence text default 'monthly',target_next_date date default current_date
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
 if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
 if target_kind not in ('income','expense') or target_amount is null or target_amount<=0 then raise exception 'invalid_recurring_entry'; end if;
 if target_cadence not in ('weekly','monthly') then raise exception 'invalid_cadence'; end if;
 if target_kind='income' or target_paid_by='business' then
   if target_account is null or not exists(select 1 from business_accounts where id=target_account and business_id=target_business and active) then raise exception 'account_required'; end if;
 elsif target_partner is null or not exists(select 1 from business_partners where id=target_partner and business_id=target_business and active) then raise exception 'partner_required'; end if;
 insert into business_recurring_entries(business_id,kind,label,amount,account_id,partner_id,category_id,counterparty,note,paid_by,cadence,next_date,created_by)
 values(target_business,target_kind,trim(target_label),round(target_amount,2),target_account,target_partner,target_category,nullif(trim(coalesce(target_counterparty,'')),''),nullif(trim(coalesce(target_note,'')),''),target_paid_by,target_cadence,target_next_date,auth.uid())
 returning id into new_id; return new_id;
end $$;

create or replace function delete_business_recurring_entry(target_entry uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r business_recurring_entries%rowtype;
begin select * into r from business_recurring_entries where id=target_entry;
 if r.id is null or not private.can_write_business(r.business_id) then raise exception 'not_allowed'; end if;
 delete from business_recurring_entries where id=r.id;
end $$;

create or replace function post_business_recurring_entry(target_entry uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r business_recurring_entries%rowtype; new_tx uuid;
begin
 select * into r from business_recurring_entries where id=target_entry for update;
 if r.id is null or not r.active or not private.can_write_business(r.business_id) then raise exception 'not_allowed'; end if;
 if r.kind='income' then
   new_tx:=record_business_income(r.business_id,r.amount,'paid',r.account_id,r.category_id,r.counterparty,coalesce(r.note,r.label),null,now());
 else
   new_tx:=record_business_expense(r.business_id,r.amount,'paid',r.paid_by,case when r.paid_by='business' then r.account_id else null end,case when r.paid_by='partner' then r.partner_id else null end,r.category_id,r.counterparty,coalesce(r.note,r.label),null,now());
 end if;
 update business_recurring_entries set next_date=case when cadence='weekly' then next_date+7 else (next_date+interval '1 month')::date end where id=r.id;
 return new_tx;
end $$;

revoke execute on function record_business_income(uuid,numeric,text,uuid,uuid,text,text,date,timestamptz) from public,anon;
revoke execute on function settle_business_transaction(uuid,numeric,uuid,uuid,timestamptz,text) from public,anon;
revoke execute on function edit_business_transaction_details(uuid,text,text,uuid,date) from public,anon;
revoke execute on function add_business_account_v2(uuid,text,text,numeric,uuid) from public,anon;
revoke execute on function update_business_account_v2(uuid,text,text,numeric,uuid) from public,anon;
revoke execute on function settle_business_partner_money(uuid,uuid,uuid,numeric,numeric,text) from public,anon;
revoke execute on function get_business_staff_positions(uuid) from public,anon;
revoke execute on function settle_business_staff_money(uuid,numeric,uuid,numeric,text) from public,anon;
revoke execute on function update_business_settings_v2(uuid,text,numeric,numeric) from public,anon;
revoke execute on function create_business_recurring_entry(uuid,text,text,numeric,uuid,uuid,uuid,text,text,text,text,date) from public,anon;
revoke execute on function delete_business_recurring_entry(uuid) from public,anon;
revoke execute on function post_business_recurring_entry(uuid) from public,anon;

grant execute on function record_business_income(uuid,numeric,text,uuid,uuid,text,text,date,timestamptz) to authenticated;
grant execute on function settle_business_transaction(uuid,numeric,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function edit_business_transaction_details(uuid,text,text,uuid,date) to authenticated;
grant execute on function add_business_account_v2(uuid,text,text,numeric,uuid) to authenticated;
grant execute on function update_business_account_v2(uuid,text,text,numeric,uuid) to authenticated;
grant execute on function settle_business_partner_money(uuid,uuid,uuid,numeric,numeric,text) to authenticated;
grant execute on function get_business_staff_positions(uuid) to authenticated;
grant execute on function settle_business_staff_money(uuid,numeric,uuid,numeric,text) to authenticated;
grant execute on function update_business_settings_v2(uuid,text,numeric,numeric) to authenticated;
grant execute on function create_business_recurring_entry(uuid,text,text,numeric,uuid,uuid,uuid,text,text,text,text,date) to authenticated;
grant execute on function delete_business_recurring_entry(uuid) to authenticated;
grant execute on function post_business_recurring_entry(uuid) to authenticated;


-- Hard-delete compatibility for partner references introduced by partial payments.
create or replace function hard_delete_business_partner(target_partner uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p business_partners%rowtype; tx_ids uuid[];
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;
  select coalesce(array_agg(distinct t.id),array[]::uuid[]) into tx_ids
  from business_transactions t
  where t.business_id=p.business_id and (
    t.partner_id=p.id
    or exists(select 1 from business_ledger_entries le where le.transaction_id=t.id and le.partner_id=p.id)
    or exists(select 1 from business_transaction_payments bp where bp.transaction_id=t.id and bp.partner_id=p.id)
  );
  if cardinality(tx_ids)>0 then
    update business_transactions set reversed_transaction_id=null where reversed_transaction_id=any(tx_ids);
    delete from business_activity_logs where business_id=p.business_id and entity_type='transaction' and entity_id=any(tx_ids);
    delete from business_transactions where id=any(tx_ids);
  end if;
  delete from business_memberships where partner_id=p.id;
  delete from business_activity_logs where business_id=p.business_id and entity_type='partner' and entity_id=p.id;
  delete from business_partners where id=p.id;
end $$;
revoke execute on function hard_delete_business_partner(uuid) from public,anon;
grant execute on function hard_delete_business_partner(uuid) to authenticated;
