-- Business Money Flow v2 compatibility hardening
-- Older posting RPCs predate paid_amount. Normalize fully paid income/expense
-- rows at the table boundary so legacy callers remain valid during rollout.

create or replace function private.sync_business_transaction_payment_progress()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.kind in ('income','expense') then
    if new.payment_status='paid' then
      new.paid_amount:=new.amount;
    elsif new.payment_status='unpaid' then
      new.paid_amount:=0;
      new.paid_at:=null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists business_transaction_payment_progress_sync on business_transactions;
create trigger business_transaction_payment_progress_sync
before insert or update of amount,payment_status,paid_amount
on business_transactions
for each row execute function private.sync_business_transaction_payment_progress();

-- Existing fully-paid rows are normalized explicitly for databases that applied
-- the first v2 migration before this compatibility patch.
update business_transactions
set paid_amount=amount
where kind in ('income','expense')
  and payment_status='paid'
  and paid_amount<>amount;

update business_transactions
set paid_amount=0,paid_at=null
where kind in ('income','expense')
  and payment_status='unpaid'
  and paid_amount<>0;
