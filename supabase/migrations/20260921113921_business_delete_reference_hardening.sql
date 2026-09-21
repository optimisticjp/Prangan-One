-- Keep partner deletion financially safe: do not hide an unsettled partner.
create or replace function archive_business_partner(target_partner uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p business_partners%rowtype;
  member business_memberships%rowtype;
  active_admins int;
  partner_due numeric := 0;
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;

  select coalesce(pp.outstanding_due,0)
    into partner_due
  from get_business_partner_positions(p.business_id) pp
  where pp.partner_id=p.id;

  if abs(coalesce(partner_due,0)) > 0.005 then
    raise exception 'partner_balance_must_be_zero';
  end if;

  select * into member from business_memberships where partner_id=p.id and status='active' limit 1;
  if member.id is not null and member.role='admin' then
    select count(*) into active_admins
    from business_memberships
    where business_id=p.business_id and status='active' and role='admin';
    if active_admins <= 1 then raise exception 'last_admin_cannot_delete'; end if;
  end if;

  update business_partners set active=false where id=p.id;
  update business_memberships set status='disabled' where partner_id=p.id and status='active';

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (p.business_id,auth.uid(),'partner_deleted','partner',p.id,jsonb_build_object('name',p.name));
end;
$$;

revoke execute on function archive_business_partner(uuid) from public, anon;
grant execute on function archive_business_partner(uuid) to authenticated;
