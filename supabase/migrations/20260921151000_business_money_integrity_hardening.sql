-- Business workspace security and integrity hardening after advisor review.

-- Financial account opening balances are part of the ledger baseline. New
-- accounts can be added by an admin, but an existing opening balance must not
-- be silently rewritten by direct client table updates.
drop policy if exists business_accounts_update on business_accounts;

-- auth.uid() is wrapped in SELECT in table policies so Postgres can initialize
-- it once per statement instead of re-evaluating it for each candidate row.
drop policy if exists business_attachments_insert on business_attachments;
create policy business_attachments_insert on business_attachments for insert
with check (private.can_write_business(business_id) and uploaded_by = (select auth.uid()));

drop policy if exists business_attachments_delete on business_attachments;
create policy business_attachments_delete on business_attachments for delete
using (private.can_admin_business(business_id) or uploaded_by = (select auth.uid()));

-- SECURITY DEFINER RPCs are authenticated app endpoints, never anonymous
-- endpoints. PostgreSQL grants function EXECUTE to PUBLIC by default, so an
-- explicit revoke is required even when we later grant authenticated.
revoke execute on function claim_business_memberships() from public, anon;
revoke execute on function create_business(text, text, text, numeric) from public, anon;
revoke execute on function add_business_partner(uuid, text, text, text, numeric) from public, anon;
revoke execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) from public, anon;
revoke execute on function approve_business_transaction(uuid, text) from public, anon;
revoke execute on function reject_business_transaction(uuid, text) from public, anon;
revoke execute on function reverse_business_transaction(uuid, text) from public, anon;
revoke execute on function get_business_account_balances(uuid) from public, anon;
revoke execute on function get_business_partner_positions(uuid) from public, anon;
revoke execute on function close_business_day(uuid, numeric, text) from public, anon;
revoke execute on function reopen_business_day(uuid, text) from public, anon;

grant execute on function claim_business_memberships() to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;
grant execute on function add_business_partner(uuid, text, text, text, numeric) to authenticated;
grant execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function approve_business_transaction(uuid, text) to authenticated;
grant execute on function reject_business_transaction(uuid, text) to authenticated;
grant execute on function reverse_business_transaction(uuid, text) to authenticated;
grant execute on function get_business_account_balances(uuid) to authenticated;
grant execute on function get_business_partner_positions(uuid) to authenticated;
grant execute on function close_business_day(uuid, numeric, text) to authenticated;
grant execute on function reopen_business_day(uuid, text) to authenticated;

-- The private helpers are needed by authenticated RLS policies/RPCs, but have
-- no reason to be executable by an anonymous role.
revoke execute on function private.is_business_member(uuid) from public, anon;
revoke execute on function private.business_role(uuid) from public, anon;
revoke execute on function private.can_write_business(uuid) from public, anon;
revoke execute on function private.can_admin_business(uuid) from public, anon;
revoke execute on function private.can_approve_business(uuid) from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.business_role(uuid) to authenticated;
grant execute on function private.can_write_business(uuid) to authenticated;
grant execute on function private.can_admin_business(uuid) to authenticated;
grant execute on function private.can_approve_business(uuid) to authenticated;

-- Cover the foreign keys and lookup paths used frequently by the mobile
-- workspace. These keep partner/account/approval reads predictable as a
-- business ledger grows.
create index if not exists business_memberships_user_idx on business_memberships (user_id) where user_id is not null;
create index if not exists business_memberships_partner_idx on business_memberships (partner_id) where partner_id is not null;
create index if not exists business_transactions_account_idx on business_transactions (account_id) where account_id is not null;
create index if not exists business_transactions_to_account_idx on business_transactions (to_account_id) where to_account_id is not null;
create index if not exists business_transactions_partner_idx on business_transactions (partner_id) where partner_id is not null;
create index if not exists business_transactions_category_idx on business_transactions (category_id) where category_id is not null;
create index if not exists business_transactions_creator_idx on business_transactions (created_by);
create index if not exists business_transactions_reversed_tx_idx on business_transactions (reversed_transaction_id) where reversed_transaction_id is not null;
create index if not exists business_transactions_reversed_by_idx on business_transactions (reversed_by) where reversed_by is not null;
create index if not exists business_ledger_entries_transaction_idx on business_ledger_entries (transaction_id);
create index if not exists business_transaction_approvals_business_idx on business_transaction_approvals (business_id);
create index if not exists business_transaction_approvals_approver_idx on business_transaction_approvals (approver_user_id);
create index if not exists business_attachments_transaction_idx on business_attachments (transaction_id);
create index if not exists business_attachments_uploader_idx on business_attachments (uploaded_by);
create index if not exists business_day_closings_closed_by_idx on business_day_closings (closed_by);
create index if not exists business_activity_logs_actor_idx on business_activity_logs (actor_user_id);
create index if not exists businesses_created_by_idx on businesses (created_by);
