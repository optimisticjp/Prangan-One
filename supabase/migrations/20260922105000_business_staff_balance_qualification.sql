-- Qualify staff-aware account-balance aggregation for PostgreSQL fresh installs.
create or replace function get_business_account_balances(target_business uuid)
returns table(account_id uuid,name text,kind text,balance numeric)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select a.id,a.name,a.kind,round(a.opening_balance+coalesce(le.delta,0)+coalesce(sm.delta,0),2)
  from business_accounts a
  left join (
    select le0.account_id,sum(le0.amount) as delta
    from business_ledger_entries le0
    where le0.business_id=target_business and le0.bucket='account'
    group by le0.account_id
  ) le on le.account_id=a.id
  left join (
    select sm0.account_id,
      sum(case
        when sm0.kind in ('advance','reimbursement','salary') then -sm0.amount
        when sm0.kind='advance_return' then sm0.amount
        else 0
      end) as delta
    from business_staff_money sm0
    where sm0.business_id=target_business and sm0.account_id is not null
    group by sm0.account_id
  ) sm on sm.account_id=a.id
  where a.business_id=target_business and a.active
  order by case a.kind when 'cash' then 1 when 'bank' then 2 when 'upi' then 3 else 4 end,a.name;
end $$;

revoke execute on function get_business_account_balances(uuid) from public,anon;
grant execute on function get_business_account_balances(uuid) to authenticated;
