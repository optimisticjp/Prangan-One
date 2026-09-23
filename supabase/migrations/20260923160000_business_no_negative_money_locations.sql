-- Prevent new cash/bank/UPI records from becoming negative.
-- Existing historical gaps are left untouched and surfaced in the UI for correction.

create or replace function private.business_account_recorded_balance(target_account uuid)
returns numeric
language sql
security definer
set search_path=public,pg_temp
as $$
  select round(
    a.opening_balance
    + coalesce((
      select sum(le.amount)
      from business_ledger_entries le
      where le.account_id=a.id and le.bucket='account'
    ),0)
    + coalesce((
      select sum(case
        when sm.kind in ('advance','reimbursement','salary') then -sm.amount
        when sm.kind='advance_return' then sm.amount
        else 0
      end)
      from business_staff_money sm
      where sm.account_id=a.id
    ),0)
  ,2)
  from business_accounts a
  where a.id=target_account;
$$;

create or replace function private.assert_business_account_can_spend(
  target_account uuid,
  spend_amount numeric
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  current_balance numeric;
  account_name text;
begin
  if target_account is null or spend_amount is null or spend_amount<=0 then return; end if;

  select a.name
  into account_name
  from business_accounts a
  where a.id=target_account
  for update;

  if account_name is null then raise exception 'money_place_not_found'; end if;

  current_balance:=coalesce(private.business_account_recorded_balance(target_account),0);

  if current_balance + 0.005 < spend_amount then
    raise exception 'Not enough recorded money in %. Available ₹%. Record where the money came from or choose another money place.',
      account_name,
      trim(to_char(greatest(current_balance,0),'FM999999999999990.00'));
  end if;
end;
$$;

create or replace function private.guard_business_ledger_funds()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.bucket='account' and new.account_id is not null and new.amount<0 then
    perform private.assert_business_account_can_spend(new.account_id,abs(new.amount));
  end if;
  return new;
end;
$$;

drop trigger if exists business_ledger_funds_guard on business_ledger_entries;
create trigger business_ledger_funds_guard
before insert on business_ledger_entries
for each row execute function private.guard_business_ledger_funds();

create or replace function private.guard_business_staff_money_funds()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.account_id is not null and new.kind in ('advance','reimbursement','salary') then
    perform private.assert_business_account_can_spend(new.account_id,new.amount);
  end if;
  return new;
end;
$$;

drop trigger if exists business_staff_money_funds_guard on business_staff_money;
create trigger business_staff_money_funds_guard
before insert on business_staff_money
for each row execute function private.guard_business_staff_money_funds();

revoke execute on function private.business_account_recorded_balance(uuid) from public,anon,authenticated;
revoke execute on function private.assert_business_account_can_spend(uuid,numeric) from public,anon,authenticated;
revoke execute on function private.guard_business_ledger_funds() from public,anon,authenticated;
revoke execute on function private.guard_business_staff_money_funds() from public,anon,authenticated;
