-- =================================================================
-- Owner read-only support mode: close the real identity gap, and pin
-- every new support session to readonly.
-- =================================================================
-- This is a real, additive migration for a database that already has real
-- society data in it. It does NOT drop a single table and does NOT reset
-- anything. It is safe to run against production. Everything here is either
-- create-or-replace (functions), drop-if-exists-then-create (a trigger and
-- policies), or a plain grant, so re-running it is harmless.
--
-- What was actually wrong: private.owner_in_readonly_support() checks
-- owner_user_id = auth.uid() on impersonation_logs, but the real application
-- code that opens a support session (insertImpersonationLogReal in
-- src/lib/realData.ts) never wrote owner_user_id at all. Since that column is
-- nullable and NULL never equals anything in SQL, the database-level
-- read-only safeguard never once matched a real session - it has never
-- actually activated in production, even though the policy logic itself is
-- correct and was already tested. The old SQL isolation tests missed this
-- because they inserted owner_user_id by hand, taking a path the real app
-- never takes.
--
-- What this migration does:
--   1. Adds private.owner_can_write(), one shared "owner may write here now"
--      helper, so the owner-write condition lives in exactly one place.
--   2. Adds a before-insert trigger that sets owner_user_id from auth.uid()
--      server-side and forces every new session to mode 'readonly', so the
--      identity can't be null or forged no matter which code path inserts.
--   3. Adds the open_support_session / close_support_session RPCs the updated
--      client calls instead of a raw insert.
--   4. Rebuilds every write policy that lets the owner write so it goes
--      through owner_can_write - including the storage policies and the few
--      table policies that had the owner lumped into an undifferentiated role
--      list with no support-mode check at all.
--
-- Existing impersonation_logs rows are left exactly as they are, on purpose:
--   - Rows with a null owner_user_id (everything written before this fix)
--     stay null. We can't attribute an owner to them retroactively - the app
--     never recorded one - and they're harmless: a null owner_user_id never
--     matches auth.uid(), so such a row blocks nobody, which is the same as
--     before. No backfill is possible or needed.
--   - Rows with mode = 'write' from before write mode was removed stay valid
--     and readable. The mode check still permits 'write' precisely so these
--     don't break; only NEW sessions are pinned to readonly, by the trigger.
-- =================================================================

begin;

-- -----------------------------------------------------------------
-- 1. Shared owner-write helper
-- -----------------------------------------------------------------
create or replace function private.owner_can_write(target_society uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.has_role(target_society, array['owner'])
     and not private.owner_in_readonly_support(target_society);
$$;

revoke execute on function private.owner_can_write(uuid) from public;
grant execute on function private.owner_can_write(uuid) to authenticated;

-- -----------------------------------------------------------------
-- 2. Server-side identity + readonly enforcement on new sessions
-- -----------------------------------------------------------------
-- owner_user_id comes from auth.uid() itself, never from anything the browser
-- sends. mode is forced to readonly for every new session. A direct/trusted
-- connection (postgres/service_role, the manual bootstrap and migrations
-- themselves) is left alone, exactly like the other enforce_* triggers, so an
-- explicit historical row can still be written directly when that's intended.
create or replace function private.enforce_impersonation_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  new.owner_user_id := auth.uid();
  new.mode := 'readonly';
  return new;
end;
$$;

drop trigger if exists impersonation_logs_enforce_insert on impersonation_logs;
create trigger impersonation_logs_enforce_insert
  before insert on impersonation_logs
  for each row execute function private.enforce_impersonation_log_insert();

-- -----------------------------------------------------------------
-- 3. The real callable entry points the client uses
-- -----------------------------------------------------------------
create or replace function open_support_session(target_society uuid, given_reason text)
returns impersonation_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row impersonation_logs;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;
  if not private.has_role(target_society, array['owner']) then
    raise exception using errcode = 'P0001', message = 'only the platform owner can open a support session';
  end if;

  insert into impersonation_logs (society_id, owner_user_id, mode, reason)
  values (target_society, auth.uid(), 'readonly', given_reason)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function close_support_session(log_id uuid)
returns impersonation_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row impersonation_logs;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select * into v_row from impersonation_logs
  where id = log_id and owner_user_id = auth.uid();

  if v_row.id is null then
    raise exception using errcode = 'P0001', message = 'no support session found to close';
  end if;

  if v_row.exited_at is not null then
    -- Already closed, most likely a retry after the first close's response
    -- never made it back. Report the existing row rather than erroring.
    return v_row;
  end if;

  update impersonation_logs set exited_at = now()
  where id = log_id
  returning * into v_row;

  return v_row;
end;
$$;

-- -----------------------------------------------------------------
-- 4. Rebuild every owner-write policy to go through owner_can_write
-- -----------------------------------------------------------------
-- The behaviorally broken ones first: policies that had the owner combined
-- into one role list (or an owner branch with no support-mode check), which
-- meant a support session did not actually block the owner for these.

-- societies: owner is now its own branch, so support mode blocks the owner
-- editing the society's own row. society_admin unchanged.
drop policy if exists societies_update on societies;
create policy societies_update on societies for update
  using (private.has_role(id, array['society_admin']) or private.owner_can_write(id));

-- memberships: owner as its own guarded branch for insert/manage/delete.
drop policy if exists memberships_insert on memberships;
create policy memberships_insert on memberships for insert
  with check (
    private.has_role(society_id, array['society_admin'])
    or private.owner_can_write(society_id)
    or (role in ('resident_owner', 'resident_tenant') and user_id is null)
  );
drop policy if exists memberships_manage on memberships;
create policy memberships_manage on memberships for update
  using (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id))
  with check (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id));
drop policy if exists memberships_delete on memberships;
create policy memberships_delete on memberships for delete
  using (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id));

-- complaint_timeline: owner branch now respects read-only support mode.
drop policy if exists complaint_timeline_insert on complaint_timeline;
create policy complaint_timeline_insert on complaint_timeline for insert
  with check (exists (
    select 1 from complaints c
    where c.id = complaint_timeline.complaint_id
      and (
        (private.has_role(c.society_id, array['society_admin', 'committee_member']) and private.can_write(c.society_id))
        or (complaint_timeline.status = 'new' and c.flat_id = private.my_flat_id(c.society_id))
        or private.owner_can_write(c.society_id)
      )
  ));

-- event_expenses: owner branch now respects read-only support mode.
drop policy if exists event_expenses_insert on event_expenses;
create policy event_expenses_insert on event_expenses for insert
  with check (exists (select 1 from events e where e.id = event_id and ((private.has_role(e.society_id, array['society_admin', 'committee_member']) and private.can_write(e.society_id)) or private.owner_can_write(e.society_id))));

-- Storage: a structurally separate part of the schema the original
-- support-mode work never touched at all. The owner could change or delete a
-- society logo, a complaint photo, or a payment proof during a read-only
-- support session. Owner is now its own guarded branch on each.
drop policy if exists society_logos_insert on storage.objects;
create policy society_logos_insert on storage.objects for insert
  with check (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));
drop policy if exists society_logos_update on storage.objects;
create policy society_logos_update on storage.objects for update
  using (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));
drop policy if exists society_logos_delete on storage.objects;
create policy society_logos_delete on storage.objects for delete
  using (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));

drop policy if exists complaint_photos_insert on storage.objects;
create policy complaint_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'complaint-photos'
    and exists (
      select 1 from complaints c where c.id = (split_part(name, '/', 1))::uuid
        and (private.has_role(c.society_id, array['society_admin', 'committee_member']) or private.owner_can_write(c.society_id) or c.flat_id = private.my_flat_id(c.society_id))
    )
  );

drop policy if exists payment_proof_insert on storage.objects;
create policy payment_proof_insert on storage.objects for insert
  with check (
    bucket_id = 'payment-proof'
    and exists (
      select 1 from payments p where p.id = (split_part(name, '/', 1))::uuid
        and (private.has_role(p.society_id, array['society_admin', 'accountant']) or private.owner_can_write(p.society_id) or p.flat_id = private.my_flat_id(p.society_id))
    )
  );

-- The already-correct policies too, so the migrated database ends up
-- identical to a fresh schema.sql install: same behavior as before (owner
-- branch with the support-mode check), now expressed through the shared
-- owner_can_write helper instead of a copied inline condition.
drop policy if exists flats_insert on flats;
create policy flats_insert on flats for insert
  with check ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));
drop policy if exists flats_update on flats;
create policy flats_update on flats for update
  using ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists bills_insert on bills;
create policy bills_insert on bills for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));
drop policy if exists bills_update on bills;
create policy bills_update on bills for update
  using ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists payments_insert on payments;
create policy payments_insert on payments for insert
  with check (
    (
      private.can_write(society_id)
      and (
        private.has_role(society_id, array['society_admin', 'accountant'])
        or (flat_id = private.my_flat_id(society_id) and status = 'pending_confirmation')
      )
    )
    or private.owner_can_write(society_id)
  );
drop policy if exists payments_update on payments;
create policy payments_update on payments for update
  using ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists expenses_insert on expenses;
create policy expenses_insert on expenses for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists vendors_insert on vendors;
create policy vendors_insert on vendors for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
drop policy if exists vendors_update on vendors;
create policy vendors_update on vendors for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists complaints_insert on complaints;
create policy complaints_insert on complaints for insert
  with check (
    (
      private.can_write(society_id)
      and (
        private.has_role(society_id, array['society_admin', 'committee_member'])
        or (
          flat_id = private.my_flat_id(society_id)
          and (not private.is_tenant(society_id) or (select tenant_access from societies where id = society_id) != 'disabled')
        )
      )
    )
    or private.owner_can_write(society_id)
  );
drop policy if exists complaints_update on complaints;
create policy complaints_update on complaints for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists notices_insert on notices;
create policy notices_insert on notices for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
drop policy if exists notices_update on notices;
create policy notices_update on notices for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists documents_insert on documents;
create policy documents_insert on documents for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists polls_insert on polls;
create policy polls_insert on polls for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
drop policy if exists polls_update on polls;
create policy polls_update on polls for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists events_insert on events;
create policy events_insert on events for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists vehicles_insert on vehicles;
create policy vehicles_insert on vehicles for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists contacts_insert on contacts;
create policy contacts_insert on contacts for insert
  with check ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));

drop policy if exists adjustments_insert on adjustments;
create policy adjustments_insert on adjustments for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));

commit;

-- =================================================================
-- End of migration.
-- =================================================================
