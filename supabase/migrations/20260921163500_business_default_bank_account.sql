-- Business workspaces start with Cash + Bank. UPI remains an optional
-- account type that a business admin can add later if useful.

create or replace function approve_business_onboarding(target_request uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req business_onboarding_requests%rowtype;
  new_business uuid;
  new_partner uuid;
begin
  if not private.is_platform_owner() then raise exception 'owner_only'; end if;

  select * into req
  from business_onboarding_requests
  where id = target_request
  for update;

  if req.id is null then raise exception 'request_not_found'; end if;
  if req.status = 'approved' and req.business_id is not null then return req.business_id; end if;
  if req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  insert into businesses (name, approval_mode, created_by)
  values (req.business_name, 'one_partner', req.requester_user_id)
  returning id into new_business;

  insert into business_partners (business_id, name, email, phone)
  values (new_business, req.requester_name, lower(req.requester_email), req.requester_phone)
  returning id into new_partner;

  insert into business_memberships (
    business_id, user_id, partner_id, email, display_name, role, status
  ) values (
    new_business, req.requester_user_id, new_partner, lower(req.requester_email),
    req.requester_name, 'admin', 'active'
  );

  insert into business_accounts (business_id, name, kind, opening_balance) values
    (new_business, 'Cash', 'cash', 0),
    (new_business, 'Bank', 'bank', 0);

  insert into business_categories (business_id, name, kind) values
    (new_business, 'Sales / Receipts', 'income'),
    (new_business, 'Purchase / Material', 'expense'),
    (new_business, 'Travel', 'expense'),
    (new_business, 'Food / Staff', 'expense'),
    (new_business, 'Rent', 'expense'),
    (new_business, 'Utilities', 'expense'),
    (new_business, 'Repairs', 'expense'),
    (new_business, 'Other', 'both');

  update business_onboarding_requests
  set status = 'approved',
      business_id = new_business,
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now(),
      decision_note = null
  where id = req.id;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    new_business, auth.uid(), 'business_onboarding_approved', 'business', new_business,
    jsonb_build_object('request_id', req.id, 'requester_user_id', req.requester_user_id)
  );

  return new_business;
end;
$$;

revoke execute on function approve_business_onboarding(uuid) from public, anon;
grant execute on function approve_business_onboarding(uuid) to authenticated;
