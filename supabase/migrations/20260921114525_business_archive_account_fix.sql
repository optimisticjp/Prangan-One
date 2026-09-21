create or replace function archive_business_account(target_account uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  acct business_accounts%rowtype;
  current_balance numeric;
begin
  select * into acct from business_accounts where id=target_account for update;
  if acct.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(acct.business_id) then raise exception 'not_allowed'; end if;

  select ba.opening_balance + coalesce(sum(le.amount),0)
  into current_balance
  from business_accounts ba
  left join business_ledger_entries le on le.account_id=ba.id
  where ba.id=target_account
  group by ba.id,ba.opening_balance;

  if abs(coalesce(current_balance,0)) > 0.005 then raise exception 'account_balance_must_be_zero'; end if;

  update business_accounts set active=false where id=acct.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (acct.business_id,auth.uid(),'account_deleted','account',acct.id,jsonb_build_object('name',acct.name,'balance',current_balance));
end;
$$;

revoke execute on function archive_business_account(uuid) from public, anon;
grant execute on function archive_business_account(uuid) to authenticated;
