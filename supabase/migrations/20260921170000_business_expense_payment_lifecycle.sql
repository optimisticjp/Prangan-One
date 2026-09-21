-- Business expense lifecycle: an expense can be recorded before it is paid.
-- Approval and payment are independent. Unpaid expenses do not move any
-- business account or partner balance until they are marked paid.

alter table business_transactions
  add column if not exists payment_status text not null default 'paid',
  add column if not exists due_date date,
  add column if not exists paid_at timestamptz;

update business_transactions
set paid_at = coalesce(paid_at, occurred_at)
where kind in ('expense','personal_expense')
  and payment_status = 'paid'
  and paid_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_transactions_payment_status_check'
  ) then
    alter table business_transactions
      add constraint business_transactions_payment_status_check
      check (payment_status in ('unpaid','paid'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'business_expense_payment_shape_check'
  ) then
    alter table business_transactions
      add constraint business_expense_payment_shape_check
      check (
        kind <> 'expense'
        or (
          (payment_status = 'unpaid' and account_id is null and partner_id is null)
          or
          (payment_status = 'paid' and (
            (account_id is not null and partner_id is null)
            or
            (account_id is null and partner_id is not null)
          ))
        )
      );
  end if;
end $$;

create index if not exists business_transactions_unpaid_expense_idx
  on business_transactions (business_id, due_date, occurred_at desc)
  where kind = 'expense' and payment_status = 'unpaid' and reversed_at is null;

create or replace function record_business_expense(
  target_business uuid,
  target_amount numeric,
  target_payment_status text default 'paid',
  target_paid_by text default 'business',
  target_account uuid default null,
  target_partner uuid default null,
  target_category uuid default null,
  target_counterparty text default null,
  target_note text default null,
  target_due_date date default null,
  target_occurred_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_tx uuid;
  mode text;
  approval text := 'not_required';
  eligible_approvers int := 0;
  account_value uuid := null;
  partner_value uuid := null;
  paid_at_value timestamptz := null;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;
  if target_payment_status not in ('unpaid','paid') then raise exception 'invalid_payment_status'; end if;
  if target_payment_status = 'paid' and target_paid_by not in ('business','partner') then raise exception 'invalid_paid_by'; end if;

  if target_category is not null and not exists (
    select 1 from business_categories
    where id = target_category and business_id = target_business and active
  ) then raise exception 'invalid_category'; end if;

  if target_payment_status = 'paid' and target_paid_by = 'business' then
    if target_account is null then raise exception 'account_required'; end if;
    if not exists (
      select 1 from business_accounts
      where id = target_account and business_id = target_business and active
    ) then raise exception 'invalid_account'; end if;
    account_value := target_account;
    paid_at_value := coalesce(target_occurred_at, now());
  elsif target_payment_status = 'paid' and target_paid_by = 'partner' then
    if target_partner is null then raise exception 'partner_required'; end if;
    if not exists (
      select 1 from business_partners
      where id = target_partner and business_id = target_business and active
    ) then raise exception 'invalid_partner'; end if;
    partner_value := target_partner;
    paid_at_value := coalesce(target_occurred_at, now());
  end if;

  select approval_mode into mode
  from businesses
  where id = target_business;

  select count(*) into eligible_approvers
  from business_memberships bm
  where bm.business_id = target_business
    and bm.status = 'active'
    and bm.user_id is not null
    and bm.user_id <> auth.uid()
    and bm.role in ('admin','partner');

  if mode <> 'none' and eligible_approvers > 0 then
    approval := 'pending';
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, partner_id, category_id,
    counterparty, note, approval_status, payment_status, due_date, paid_at,
    occurred_at, created_by
  ) values (
    target_business, 'expense', round(target_amount, 2), account_value, partner_value, target_category,
    nullif(trim(coalesce(target_counterparty, '')), ''),
    nullif(trim(coalesce(target_note, '')), ''),
    approval, target_payment_status, target_due_date, paid_at_value,
    coalesce(target_occurred_at, now()), auth.uid()
  ) returning id into new_tx;

  if target_payment_status = 'paid' and target_paid_by = 'business' then
    insert into business_ledger_entries (
      business_id, transaction_id, bucket, account_id, amount
    ) values (
      target_business, new_tx, 'account', account_value, -target_amount
    );
  elsif target_payment_status = 'paid' and target_paid_by = 'partner' then
    insert into business_ledger_entries (
      business_id, transaction_id, bucket, partner_id, amount
    ) values (
      target_business, new_tx, 'partner_due', partner_value, target_amount
    );
  end if;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    target_business, auth.uid(), 'expense_recorded', 'transaction', new_tx,
    jsonb_build_object(
      'amount', target_amount,
      'payment_status', target_payment_status,
      'paid_by', case when target_payment_status = 'paid' then target_paid_by else null end,
      'approval_status', approval
    )
  );

  return new_tx;
end;
$$;

create or replace function mark_business_expense_paid(
  target_transaction uuid,
  target_paid_by text,
  target_account uuid default null,
  target_partner uuid default null,
  target_paid_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tx business_transactions%rowtype;
begin
  select * into tx
  from business_transactions
  where id = target_transaction
  for update;

  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if tx.kind <> 'expense' then raise exception 'expense_required'; end if;
  if tx.reversed_at is not null then raise exception 'transaction_reversed'; end if;
  if tx.payment_status <> 'unpaid' then raise exception 'expense_already_paid'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if target_paid_by not in ('business','partner') then raise exception 'invalid_paid_by'; end if;

  if target_paid_by = 'business' then
    if target_account is null then raise exception 'account_required'; end if;
    if not exists (
      select 1 from business_accounts
      where id = target_account and business_id = tx.business_id and active
    ) then raise exception 'invalid_account'; end if;

    insert into business_ledger_entries (
      business_id, transaction_id, bucket, account_id, amount
    ) values (
      tx.business_id, tx.id, 'account', target_account, -tx.amount
    );

    update business_transactions
    set payment_status = 'paid',
        account_id = target_account,
        partner_id = null,
        paid_at = coalesce(target_paid_at, now())
    where id = tx.id;
  else
    if target_partner is null then raise exception 'partner_required'; end if;
    if not exists (
      select 1 from business_partners
      where id = target_partner and business_id = tx.business_id and active
    ) then raise exception 'invalid_partner'; end if;

    insert into business_ledger_entries (
      business_id, transaction_id, bucket, partner_id, amount
    ) values (
      tx.business_id, tx.id, 'partner_due', target_partner, tx.amount
    );

    update business_transactions
    set payment_status = 'paid',
        partner_id = target_partner,
        account_id = null,
        paid_at = coalesce(target_paid_at, now())
    where id = tx.id;
  end if;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    tx.business_id, auth.uid(), 'expense_marked_paid', 'transaction', tx.id,
    jsonb_build_object(
      'paid_by', target_paid_by,
      'account_id', target_account,
      'partner_id', target_partner
    )
  );
end;
$$;

create or replace function get_business_partner_positions(target_business uuid)
returns table (
  partner_id uuid, name text, capital numeric, advances numeric, personal_expenses numeric,
  reimbursements numeric, outstanding_due numeric, withdrawals numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;

  return query
  select p.id, p.name,
    coalesce(sum(t.amount) filter (
      where t.kind = 'partner_capital' and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'partner_advance' and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where (
        t.kind = 'personal_expense'
        or (t.kind = 'expense' and t.payment_status = 'paid' and t.account_id is null)
      ) and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'reimbursement' and t.reversed_at is null
    ), 0)::numeric,
    (
      coalesce(sum(t.amount) filter (
        where (
          t.kind = 'partner_advance'
          or t.kind = 'personal_expense'
          or (t.kind = 'expense' and t.payment_status = 'paid' and t.account_id is null)
        ) and t.reversed_at is null
      ), 0)
      - coalesce(sum(t.amount) filter (
        where t.kind = 'reimbursement' and t.reversed_at is null
      ), 0)
    )::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'withdrawal' and t.reversed_at is null
    ), 0)::numeric
  from business_partners p
  left join business_transactions t
    on t.partner_id = p.id and t.business_id = p.business_id
  where p.business_id = target_business and p.active
  group by p.id, p.name
  order by p.created_at;
end;
$$;

revoke execute on function record_business_expense(uuid, numeric, text, text, uuid, uuid, uuid, text, text, date, timestamptz) from public, anon;
revoke execute on function mark_business_expense_paid(uuid, text, uuid, uuid, timestamptz) from public, anon;
grant execute on function record_business_expense(uuid, numeric, text, text, uuid, uuid, uuid, text, text, date, timestamptz) to authenticated;
grant execute on function mark_business_expense_paid(uuid, text, uuid, uuid, timestamptz) to authenticated;
