-- Allow users to edit posted transaction amounts without rewriting history.
-- The old transaction is reversed and a linked replacement is posted.

alter table business_transactions
  add column if not exists supersedes_transaction_id uuid references business_transactions(id) on delete set null;

create index if not exists business_transactions_supersedes_idx
  on business_transactions (supersedes_transaction_id)
  where supersedes_transaction_id is not null;

create or replace function edit_business_transaction_amount(
  target_transaction uuid,
  target_amount numeric
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tx business_transactions%rowtype;
  new_tx uuid;
  reversal_id uuid;
  approval text := 'not_required';
  mode text;
  eligible_approvers int := 0;
  due_balance numeric := 0;
begin
  select * into tx
  from business_transactions
  where id = target_transaction
  for update;

  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind = 'reversal' or tx.reversed_at is not null then raise exception 'transaction_locked'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;

  target_amount := round(target_amount, 2);
  if target_amount = tx.amount then return tx.id; end if;

  reversal_id := reverse_business_transaction(
    tx.id,
    'Amount edited from ' || tx.amount::text || ' to ' || target_amount::text
  );

  if tx.kind = 'reimbursement' then
    select coalesce(sum(le.amount), 0)
    into due_balance
    from business_ledger_entries le
    where le.business_id = tx.business_id
      and le.partner_id = tx.partner_id
      and le.bucket = 'partner_due';

    if due_balance < target_amount then
      raise exception 'reimbursement_exceeds_due';
    end if;
  end if;

  if tx.kind in ('expense','personal_expense') then
    select approval_mode into mode
    from businesses
    where id = tx.business_id;

    select count(*) into eligible_approvers
    from business_memberships bm
    where bm.business_id = tx.business_id
      and bm.status = 'active'
      and bm.user_id is not null
      and bm.user_id <> auth.uid()
      and bm.role in ('admin','partner');

    if mode <> 'none' and eligible_approvers > 0 then
      approval := 'pending';
    end if;
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, payment_status, due_date, paid_at,
    occurred_at, created_by, supersedes_transaction_id
  ) values (
    tx.business_id, tx.kind, target_amount, tx.account_id, tx.to_account_id, tx.partner_id, tx.category_id,
    tx.counterparty, tx.note, approval, tx.payment_status, tx.due_date, tx.paid_at,
    tx.occurred_at, auth.uid(), tx.id
  )
  returning id into new_tx;

  insert into business_ledger_entries (
    business_id, transaction_id, bucket, account_id, partner_id, amount
  )
  select
    le.business_id,
    new_tx,
    le.bucket,
    le.account_id,
    le.partner_id,
    round((le.amount / tx.amount) * target_amount, 2)
  from business_ledger_entries le
  where le.transaction_id = tx.id;

  insert into business_attachments (
    business_id, transaction_id, storage_path, file_name, mime_type, uploaded_by
  )
  select
    a.business_id, new_tx, a.storage_path, a.file_name, a.mime_type, a.uploaded_by
  from business_attachments a
  where a.transaction_id = tx.id;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    tx.business_id, auth.uid(), 'transaction_amount_edited', 'transaction', new_tx,
    jsonb_build_object(
      'old_transaction_id', tx.id,
      'reversal_id', reversal_id,
      'old_amount', tx.amount,
      'new_amount', target_amount,
      'approval_status', approval
    )
  );

  return new_tx;
end;
$$;

revoke execute on function edit_business_transaction_amount(uuid,numeric) from public, anon;
grant execute on function edit_business_transaction_amount(uuid,numeric) to authenticated;
