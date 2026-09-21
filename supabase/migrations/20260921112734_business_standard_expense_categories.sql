-- Standardize Business Money expense categories for existing and future businesses.

do $$
declare
  r record;
  target_id uuid;
begin
  for r in
    select c.id, c.business_id, c.name
    from business_categories c
    where c.name in (
      'Purchase / Material',
      'Food / Staff',
      'Rent',
      'Utilities',
      'Repairs',
      'Travel',
      'Other'
    )
  loop
    select c2.id into target_id
    from business_categories c2
    where c2.business_id = r.business_id
      and c2.name = case r.name
        when 'Purchase / Material' then 'Purchase / Inventory'
        when 'Food / Staff' then 'Food / Staff Welfare'
        when 'Rent' then 'Rent / Warehouse'
        when 'Utilities' then 'Utilities / Internet'
        when 'Repairs' then 'Repairs / Maintenance'
        when 'Travel' then 'Travel / Conveyance'
        when 'Other' then 'Other / Miscellaneous'
      end
    limit 1;

    if target_id is null then
      update business_categories
      set name = case r.name
        when 'Purchase / Material' then 'Purchase / Inventory'
        when 'Food / Staff' then 'Food / Staff Welfare'
        when 'Rent' then 'Rent / Warehouse'
        when 'Utilities' then 'Utilities / Internet'
        when 'Repairs' then 'Repairs / Maintenance'
        when 'Travel' then 'Travel / Conveyance'
        when 'Other' then 'Other / Miscellaneous'
      end,
      kind = 'expense'
      where id = r.id;
    else
      update business_transactions
      set category_id = target_id
      where category_id = r.id;

      update business_categories
      set active = false
      where id = r.id;
    end if;
  end loop;
end $$;

insert into business_categories (business_id, name, kind)
select b.id, v.name, 'expense'
from businesses b
cross join (values
  ('Ad Spend / Marketing'),
  ('Courier / Shipping'),
  ('Packaging Material'),
  ('Purchase / Inventory'),
  ('Salaries / Contractor'),
  ('Legal / Professional Fees'),
  ('Food / Staff Welfare'),
  ('Rent / Warehouse'),
  ('Utilities / Internet'),
  ('Software / Subscriptions'),
  ('Repairs / Maintenance'),
  ('Travel / Conveyance'),
  ('Printing / Stationery'),
  ('Payment Gateway / Bank Charges'),
  ('Other / Miscellaneous')
) as v(name)
where not exists (
  select 1
  from business_categories c
  where c.business_id = b.id
    and c.name = v.name
);

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
    (new_business, 'Ad Spend / Marketing', 'expense'),
    (new_business, 'Courier / Shipping', 'expense'),
    (new_business, 'Packaging Material', 'expense'),
    (new_business, 'Purchase / Inventory', 'expense'),
    (new_business, 'Salaries / Contractor', 'expense'),
    (new_business, 'Legal / Professional Fees', 'expense'),
    (new_business, 'Food / Staff Welfare', 'expense'),
    (new_business, 'Rent / Warehouse', 'expense'),
    (new_business, 'Utilities / Internet', 'expense'),
    (new_business, 'Software / Subscriptions', 'expense'),
    (new_business, 'Repairs / Maintenance', 'expense'),
    (new_business, 'Travel / Conveyance', 'expense'),
    (new_business, 'Printing / Stationery', 'expense'),
    (new_business, 'Payment Gateway / Bank Charges', 'expense'),
    (new_business, 'Other / Miscellaneous', 'expense');

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
