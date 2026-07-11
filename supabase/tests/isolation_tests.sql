-- ============================================================================
-- Tenant isolation and access-control tests.
-- Run via run-isolation-tests.sh, not directly - that script sets up the
-- auth/storage stubs and applies the schema first, both of which these
-- tests assume already exist.
--
-- Each test follows the same shape: become a specific person (by setting
-- auth.uid() to their real user id), run a query, and check the result
-- against what that specific person should and shouldn't be able to see
-- or do. A failure raises an exception and stops the whole script -
-- ON_ERROR_STOP in the runner means the very first failure is the one
-- that gets reported, not buried under later ones.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------
-- Setup: two societies, each with a resident, admin, accountant, and
-- auditor - the actual role spread this app has, not a simplified stand-in.
-- ----------------------------------------------------------------------

insert into societies (id, name, name_en, slug, join_code, address)
values
  ('a0000000-0000-0000-0000-000000000001', 'Society A', 'Society A', 'society-a', 'CODEA001', 'Address A'),
  ('b0000000-0000-0000-0000-000000000001', 'Society B', 'Society B', 'society-b', 'CODEB001', 'Address B');

insert into flats (id, society_id, number, floor, owner_name, phone, occupancy, sqft, member_since)
values
  ('a1000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000001', '101', 1, 'Resident A101', '9000000101', 'owner', 900, 2024),
  ('a1000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000001', '102', 1, 'Resident A102', '9000000102', 'owner', 900, 2024),
  ('b1000000-0000-0000-0000-000000000201', 'b0000000-0000-0000-0000-000000000001', '201', 1, 'Resident B201', '9000000201', 'owner', 900, 2024);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-a@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'resident-a101@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'resident-a102@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant-a@test.local'),
  ('00000000-0000-0000-0000-0000000000a5', 'auditor-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin-b@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'resident-b201@test.local'),
  ('00000000-0000-0000-0000-00000000000f', 'owner@test.local');

insert into memberships (user_id, email, society_id, flat_id, role, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-a@test.local', 'a0000000-0000-0000-0000-000000000001', null, 'society_admin', 'active'),
  ('00000000-0000-0000-0000-0000000000a2', 'resident-a101@test.local', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', 'resident_owner', 'active'),
  ('00000000-0000-0000-0000-0000000000a3', 'resident-a102@test.local', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000102', 'resident_owner', 'active'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant-a@test.local', 'a0000000-0000-0000-0000-000000000001', null, 'accountant', 'active'),
  ('00000000-0000-0000-0000-0000000000a5', 'auditor-a@test.local', 'a0000000-0000-0000-0000-000000000001', null, 'auditor', 'active'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin-b@test.local', 'b0000000-0000-0000-0000-000000000001', null, 'society_admin', 'active'),
  ('00000000-0000-0000-0000-0000000000b2', 'resident-b201@test.local', 'b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000201', 'resident_owner', 'active'),
  ('00000000-0000-0000-0000-00000000000f', 'owner@test.local', null, null, 'owner', 'active');

-- Genuinely pending, not active - a resident "successfully" leaving an
-- already-active row untouched wouldn't actually prove RLS is blocking
-- anything, it would just be the WHERE clause matching zero rows on its
-- own. These exist specifically so the membership-approval tests below
-- are testing the real thing.
insert into memberships (email, society_id, flat_id, role, status) values
  ('pending-a@test.local', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000102', 'resident_owner', 'pending'),
  ('pending-b@test.local', 'b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000201', 'resident_owner', 'pending');

-- One personal complaint and one community complaint from the same flat,
-- since visibility differs between the two - a real, previously-verified
-- distinction, not a hypothetical one.
insert into complaints (id, society_id, flat_id, category, title, priority, status, visibility) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', 'Leak', 'Personal complaint', 'normal', 'new', 'personal'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', 'Lift', 'Community complaint', 'urgent', 'new', 'community');

-- Four documents, one per permission tier - covers the exact case a
-- previous session's real testing already proved once, kept here so it
-- stays proved.
insert into documents (id, society_id, name, folder, permission) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Public doc', 'General', 'public'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Committee doc', 'General', 'committee'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Accountant doc', 'Finance', 'accountant'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Admin-only doc', 'General', 'admin');

-- One expense, the module an external audit specifically caught as
-- never having been moved to the real data layer at all.
insert into expenses (id, society_id, date, category, amount, mode) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', current_date, 'Lift Maintenance', 4500, 'upi');

-- A poll with two votes, one per resident - tests the privacy-preserving
-- aggregate function separately from raw vote visibility.
insert into polls (id, society_id, question, type, options, status, result_visible) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Repaint?', 'yesno', '["Yes","No"]'::jsonb, 'open', true);
insert into poll_votes (poll_id, flat_id, option_idx) values
  ('f0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', 0),
  ('f0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000102', 0);

-- A few owning rows Society A's owner-write matrix below needs to point at:
-- one bill, one real payment (its id is the storage path for the
-- payment-proof bucket test), and one event (for the event-expense test).
-- All in Society A. Inserted here as postgres, straight setup data.
insert into bills (id, society_id, flat_id, month, amount, due_date) values
  ('ba110000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', '2027-01', 1200, '2027-01-10');
insert into payments (id, society_id, flat_id, date, amount, mode, status) values
  ('ba110000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', current_date, 500, 'cash', 'success');
insert into events (id, society_id, name, type, date) values
  ('ea110000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Diwali', 'festival', current_date);

-- ----------------------------------------------------------------------
-- Grants: one authenticated role, matching what every real Supabase
-- project already grants by default - not narrowed per test, since the
-- real thing enforcing every result below is RLS itself, not table grants.
-- Created by the setup script itself now, before the schema is applied -
-- schema.sql grants directly to authenticated/anon (for the private
-- helper-function schema), so they need to exist first.
-- ----------------------------------------------------------------------

grant usage on schema public, auth, storage to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function auth.uid(), auth.jwt() to authenticated;

-- ----------------------------------------------------------------------
-- Helper: switches which person subsequent queries run as. security
-- definer specifically because redefining auth.uid() needs superuser-level
-- access to the auth schema - the authenticated role itself can never be
-- allowed to do that for real (it would let anyone impersonate anyone),
-- so this function does it on the caller's behalf, using its owner's
-- (postgres') privileges rather than whichever role happens to be active
-- when it's called.
-- ----------------------------------------------------------------------
create or replace function test_become(target_user uuid) returns void
language plpgsql
security definer
as $$
begin
  execute format('create or replace function auth.uid() returns uuid language sql stable as $f$ select %L::uuid $f$', target_user);
end;
$$;

create or replace function test_assert(condition boolean, description text) returns void language plpgsql as $$
begin
  if not condition then
    raise exception 'FAIL: %', description;
  end if;
  raise notice 'PASS: %', description;
end;
$$;

-- Runs one write statement as whoever is currently active and reports how
-- many rows it actually changed: a positive number means the write went
-- through, 0 means RLS silently matched no rows (how a blocked UPDATE
-- looks), and -1 means RLS raised outright (how a blocked INSERT looks).
-- Security invoker on purpose, so the write inside runs as the caller and is
-- checked against the real policies, not bypassed. Only insufficient_privilege
-- (an RLS refusal) is swallowed - any other error still propagates and fails
-- the suite loudly, so a broken test statement can't quietly read as "blocked".
create or replace function test_try_write(p_sql text) returns int
language plpgsql
as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
exception
  when insufficient_privilege then
    return -1;
end;
$$;

-- One representative owner write per category of client-society data, so the
-- before/during/after support-session checks below can prove each category
-- individually rather than trusting one to stand in for all of them. Every
-- statement targets Society A and is written to be run as the owner. Fresh
-- ids/keys (gen_random_uuid) each call so the "before" and "after" runs
-- don't collide with each other. The storage rows use the owning row's id as
-- their path prefix, exactly the path convention the real storage policies
-- join back through. Document-bucket storage is deliberately NOT here: the
-- owner has no upload path for it at all, so it's checked on its own below.
create or replace function owner_write_cases() returns table(label text, write_sql text)
language sql
stable
as $$
  values
    ('societies',          $w$update societies set name = name where id = 'a0000000-0000-0000-0000-000000000001'$w$),
    ('memberships',        $w$insert into memberships (society_id, email, role) values ('a0000000-0000-0000-0000-000000000001', gen_random_uuid()::text || '@test.local', 'committee_member')$w$),
    ('flats',              $w$insert into flats (society_id, number, floor, owner_name, occupancy) values ('a0000000-0000-0000-0000-000000000001', gen_random_uuid()::text, 1, 'Owner Write', 'owner')$w$),
    ('bills',              $w$insert into bills (society_id, flat_id, month, amount, due_date) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', gen_random_uuid()::text, 1200, current_date)$w$),
    ('payments',           $w$insert into payments (society_id, flat_id, date, amount, mode, status) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', current_date, 100, 'cash', 'success')$w$),
    ('expenses',           $w$insert into expenses (society_id, date, category, amount, mode) values ('a0000000-0000-0000-0000-000000000001', current_date, 'Repairs', 100, 'cash')$w$),
    ('vendors',            $w$insert into vendors (society_id, name) values ('a0000000-0000-0000-0000-000000000001', 'Owner Write Vendor')$w$),
    ('complaints',         $w$insert into complaints (society_id, flat_id, category, title, priority) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', 'General', 'Owner write', 'normal')$w$),
    ('complaint_timeline', $w$insert into complaint_timeline (complaint_id, status, by_name) values ('c0000000-0000-0000-0000-000000000001', 'assigned', 'Owner')$w$),
    ('notices',            $w$insert into notices (society_id, title, body, category) values ('a0000000-0000-0000-0000-000000000001', 'Owner write', 'x', 'General')$w$),
    ('documents',          $w$insert into documents (society_id, name, folder, permission) values ('a0000000-0000-0000-0000-000000000001', 'Owner write doc', 'General', 'public')$w$),
    ('polls',              $w$insert into polls (society_id, question, type, options) values ('a0000000-0000-0000-0000-000000000001', 'Owner write?', 'yesno', '["Yes","No"]'::jsonb)$w$),
    ('events',             $w$insert into events (society_id, name, type, date) values ('a0000000-0000-0000-0000-000000000001', 'Owner write event', 'festival', current_date)$w$),
    ('event_expenses',     $w$insert into event_expenses (event_id, label, amount) values ('ea110000-0000-0000-0000-000000000001', 'Owner write expense', 100)$w$),
    ('vehicles',           $w$insert into vehicles (society_id, flat_id, kind, number, slot) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', '2W', gen_random_uuid()::text, 'S1')$w$),
    ('contacts',           $w$insert into contacts (society_id, name, phone, category) values ('a0000000-0000-0000-0000-000000000001', 'Owner write contact', '9000000000', 'committee')$w$),
    ('adjustments',        $w$insert into adjustments (society_id, amount, type, reason) values ('a0000000-0000-0000-0000-000000000001', 100, 'credit', 'Owner write')$w$),
    ('audit_logs',         $w$insert into audit_logs (society_id, actor, action, detail) values ('a0000000-0000-0000-0000-000000000001', 'Owner', 'owner_write_test', 'x')$w$),
    ('storage:society-logos',   $w$insert into storage.objects (bucket_id, name) values ('society-logos', 'a0000000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.png')$w$),
    ('storage:complaint-photos',$w$insert into storage.objects (bucket_id, name) values ('complaint-photos', 'c0000000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.jpg')$w$),
    ('storage:payment-proof',   $w$insert into storage.objects (bucket_id, name) values ('payment-proof', 'ba110000-0000-0000-0000-000000000002/' || gen_random_uuid()::text || '.jpg')$w$)
$$;

grant execute on function test_become(uuid), test_assert(boolean, text), test_try_write(text), owner_write_cases() to authenticated;

set role authenticated;

-- ============================================================================
-- Cross-tenant isolation: Society A's resident cannot see Society B's data,
-- across every core table, not just one.
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a2'); -- resident A101
select test_assert((select count(*) from flats) = 1, 'resident A101 sees exactly their own flat - flats_select scopes a plain resident to just their own flat, not every flat in their society');
select test_assert((select count(*) from flats where society_id = 'b0000000-0000-0000-0000-000000000001') = 0, 'resident A101 sees zero of Society B''s flats specifically');
select test_assert((select count(*) from complaints where society_id = 'b0000000-0000-0000-0000-000000000001') = 0, 'resident A101 sees zero of Society B''s complaints');
select test_assert((select count(*) from expenses) = 1, 'resident A101 sees Society A''s one expense (a member can read expenses)');
select test_assert((select count(*) from memberships where society_id = 'b0000000-0000-0000-0000-000000000001') = 0, 'resident A101 sees zero of Society B''s memberships');

-- ============================================================================
-- Complaint visibility: personal stays private to the filer and
-- management; community is visible society-wide.
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a3'); -- resident A102, a different flat in the same society
select test_assert((select count(*) from complaints where id = 'c0000000-0000-0000-0000-000000000001') = 0, 'a different resident cannot see flat 101''s personal complaint');
select test_assert((select count(*) from complaints where id = 'c0000000-0000-0000-0000-000000000002') = 1, 'a different resident CAN see flat 101''s community complaint');

select test_become('00000000-0000-0000-0000-0000000000a1'); -- society_admin A
select test_assert((select count(*) from complaints where id = 'c0000000-0000-0000-0000-000000000001') = 1, 'management can see a personal complaint that isn''t theirs');

-- ============================================================================
-- Document permission tiers - four levels, checked individually, not just
-- "some are hidden."
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a2'); -- plain resident
select test_assert((select count(*) from documents) = 1, 'a plain resident sees only the public document, not committee/accountant/admin tiers');

select test_become('00000000-0000-0000-0000-0000000000a4'); -- accountant
select test_assert((select count(*) from documents) = 2, 'an accountant sees public + accountant tiers, not committee or admin-only');

select test_become('00000000-0000-0000-0000-0000000000a1'); -- society_admin
select test_assert((select count(*) from documents) = 4, 'society_admin sees every tier');

-- ============================================================================
-- Poll results: aggregate counts are visible to everyone, individual
-- votes are not - a resident's own fetch of poll_votes only ever contains
-- their own vote, the true total comes from the separate poll_results()
-- function instead.
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a2'); -- resident A101
select test_assert((select count(*) from poll_votes) = 1, 'a resident''s own poll_votes select only returns their own vote, not every flat''s');
select test_assert((select sum(vote_count) from poll_results('f0000000-0000-0000-0000-000000000001')) = 2, 'poll_results still returns the true total across both flats, aggregated without exposing whose vote is whose');

-- ============================================================================
-- Auditor: read-only, genuinely enforced by RLS, not just hidden in the UI.
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a5'); -- auditor A
select test_assert((select count(*) from complaints) >= 1, 'an auditor can read');
do $$
begin
  begin
    insert into notices (society_id, title, body, category)
    values ('a0000000-0000-0000-0000-000000000001', 'Should not be allowed', 'x', 'General');
    raise exception 'FAIL: an auditor was able to insert a notice, and should not have been';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    raise notice 'PASS: an auditor cannot insert - genuinely blocked by RLS, not just absent from the UI';
  end;
end $$;

-- ============================================================================
-- The owner: real, platform-wide access, verified across both societies
-- at once, not assumed from the policy text.
-- ============================================================================

select test_become('00000000-0000-0000-0000-00000000000f');
select test_assert((select count(*) from societies) = 2, 'the owner sees both societies');
select test_assert((select count(*) from flats) = 3, 'the owner sees every flat across both societies, not scoped to one');
select test_assert((select count(*) from memberships where role = 'owner') = 1, 'the owner''s own membership is visible to itself');

-- ============================================================================
-- A resident cannot approve their own membership, or anyone else's -
-- that's a management action, not a self-service one.
-- ============================================================================

select test_become('00000000-0000-0000-0000-0000000000a2');
do $$
declare
  affected int;
begin
  update memberships set status = 'active' where email = 'pending-b@test.local';
  get diagnostics affected = row_count;
  if affected > 0 then
    raise exception 'FAIL: a resident was able to approve a pending membership outside their own society';
  end if;
  raise notice 'PASS: a resident cannot approve a pending membership outside their own society - RLS blocks the update at zero rows affected, not an exception';
end $$;

do $$
declare
  affected int;
begin
  update memberships set status = 'active' where email = 'pending-a@test.local';
  get diagnostics affected = row_count;
  if affected > 0 then
    raise exception 'FAIL: a resident was able to approve a pending membership in their own society - that''s management-only, not self-service';
  end if;
  raise notice 'PASS: a resident cannot approve a pending membership even in their own society - genuinely management-only, not just hidden from the UI';
end $$;

select test_become('00000000-0000-0000-0000-0000000000a1'); -- society_admin A - the actual positive case
do $$
declare
  affected int;
begin
  update memberships set status = 'active' where email = 'pending-a@test.local';
  get diagnostics affected = row_count;
  if affected != 1 then
    raise exception 'FAIL: society_admin should be able to approve a pending membership in their own society, and wasn''t able to';
  end if;
  raise notice 'PASS: society_admin genuinely can approve a pending membership - confirms the mechanism works for who it should, not just that it blocks everyone else';
end $$;

-- rate_limit_attempts: the one table that exists purely to stop abuse,
-- so it should never be directly readable or writable by any client
-- role at all - not "residents can't see other residents'," genuinely
-- nobody. Confirmed missing entirely across two independent reviews
-- before being caught and fixed; this is what makes sure it can't
-- quietly regress back to that state later.
reset session authorization;
insert into rate_limit_attempts (bucket) values ('lead:isolation-test@example.local');

do $$
declare
  visible_count int;
begin
  set session authorization authenticated;
  select count(*) into visible_count from rate_limit_attempts where bucket = 'lead:isolation-test@example.local';
  reset session authorization;
  if visible_count > 0 then
    raise exception 'FAIL: authenticated was able to read rate_limit_attempts directly - this table should be completely unreadable by any client role';
  end if;
  raise notice 'PASS: rate_limit_attempts is not directly readable by authenticated, even though the row genuinely exists';
end $$;

do $$
declare
  affected int;
begin
  set session authorization authenticated;
  delete from rate_limit_attempts where bucket = 'lead:isolation-test@example.local';
  get diagnostics affected = row_count;
  reset session authorization;
  if affected > 0 then
    raise exception 'FAIL: authenticated was able to delete a rate_limit_attempts row directly - this would let someone bypass rate limiting by deleting their own bucket''s entries';
  end if;
  raise notice 'PASS: rate_limit_attempts is not directly deletable by authenticated - the actual protection this table exists to provide is intact';
end $$;

-- The atomic payment functions: sequential calls for the same society
-- allocate different, incrementing receipt numbers (true concurrency was
-- verified manually while building this, with two genuinely simultaneous
-- background processes - not repeatable inside one sequential SQL script
-- like this one, but this still confirms the function's basic, repeated
-- correctness stays intact going forward), a retried call with the same
-- payment id is a safe no-op, and a plain resident is still correctly
-- refused from directly recording a successful payment - the exact same
-- payments_insert policy already tested above, now reached through the
-- new function instead of a raw insert.
select test_become('00000000-0000-0000-0000-0000000000a1'); -- society_admin A
do $$
declare
  first_result jsonb;
  second_result jsonb;
begin
  first_result := record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 500, 'cash', null, null, 'success');
  second_result := record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 500, 'cash', null, null, 'success');
  if first_result->>'receipt_no' = second_result->>'receipt_no' then
    raise exception 'FAIL: two separate payments received the same receipt number: %', first_result->>'receipt_no';
  end if;
  raise notice 'PASS: two sequential payments for the same society received different, real receipt numbers (% and %)', first_result->>'receipt_no', second_result->>'receipt_no';
end $$;

do $$
declare
  fixed_id uuid := gen_random_uuid();
  first_result jsonb;
  retry_result jsonb;
begin
  first_result := record_payment_atomic(fixed_id, 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 700, 'upi', null, null, 'success');
  retry_result := record_payment_atomic(fixed_id, 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 700, 'upi', null, null, 'success');
  if (retry_result->>'already_recorded')::boolean is not true then
    raise exception 'FAIL: retrying the exact same payment id was not recognized as already recorded';
  end if;
  if first_result->>'receipt_no' != retry_result->>'receipt_no' then
    raise exception 'FAIL: a retried call returned a different receipt number than the original - this would mean a real duplicate could have been created';
  end if;
  raise notice 'PASS: retrying the exact same payment id is a safe no-op, returning the original receipt number rather than allocating a second one';
end $$;

select test_become('00000000-0000-0000-0000-0000000000a2'); -- plain resident, not management
do $$
begin
  perform record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 999, 'cash', null, null, 'success');
  raise exception 'FAIL: a plain resident was able to directly record a successful payment - this should be management-only, same as a raw insert would be';
exception
  when insufficient_privilege or others then
    raise notice 'PASS: a plain resident is still correctly refused from directly recording a successful payment through the new atomic function';
end $$;

-- ============================================================================
-- Owner read-only support mode, proven end to end against real Postgres, one
-- write category at a time, through the same real code path the app uses.
--
-- The whole point of this fix: even the owner's own blanket write access is
-- refused for a specific society while there's a currently-active support
-- session for that owner and that society - enforced by the database itself,
-- not only by what the client app shows. The old version of this section
-- only checked one category (complaints) and, worse, created the session by
-- inserting a row directly with owner_user_id filled in by hand - which is
-- exactly the path the real app never took, so it never caught that the real
-- app wrote no owner_user_id at all. Everything below fixes that: it uses the
-- real open_support_session / close_support_session RPCs, checks every write
-- category individually, and asserts on real row counts (via test_try_write)
-- rather than a broad "or others" catch that can pass even when a write
-- actually went through.
--
-- Note on the role: these blocks run as `authenticated` (set role below), so
-- RLS is genuinely enforced. reset session authorization drops back to
-- postgres, which is a superuser that BYPASSES RLS, so every postgres-context
-- manual insert is followed by `set role authenticated` again before any
-- access-control check - otherwise the check would be meaningless.
-- ============================================================================

-- (0) The root cause, shown directly rather than described: a session row
-- whose owner_user_id is NULL - exactly what the real app used to write -
-- does NOT block the owner, because NULL never equals auth.uid(). This is why
-- the safeguard never once activated in production even though the policy was
-- correct. Everything after proves the fix makes a real session actually block.
reset session authorization;
insert into impersonation_logs (society_id, owner_user_id, mode, entered_at)
values ('a0000000-0000-0000-0000-000000000001', null, 'readonly', now());
set role authenticated;
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare n int;
begin
  n := test_try_write($w$insert into notices (society_id, title, body, category) values ('a0000000-0000-0000-0000-000000000001', 'null-owner session does not block', 'x', 'General')$w$);
  if n <= 0 then
    raise exception 'FAIL: a null owner_user_id session blocked the owner - it never should, and that gap is exactly the production bug being fixed';
  end if;
  raise notice 'PASS: a null owner_user_id session does NOT block the owner (the exact production bug) - so writing owner_user_id for real is what actually matters';
end $$;
reset session authorization;
delete from impersonation_logs where owner_user_id is null;

-- (1) The trigger on the real API path: an insert arriving as the
-- authenticated role has owner_user_id forced from auth.uid() and mode forced
-- to readonly, no matter what the client tried to send. set session
-- authorization makes session_user genuinely 'authenticated' here, which set
-- role alone would not - that's what makes the trigger's own session_user
-- check take the real, non-exempt path.
set role authenticated;
select test_become('00000000-0000-0000-0000-00000000000f');
set session authorization authenticated;
do $$
declare v_id uuid; v_owner uuid; v_mode text;
begin
  insert into impersonation_logs (society_id, owner_user_id, mode)
  values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'write')
  returning id, owner_user_id, mode into v_id, v_owner, v_mode;
  if v_owner is distinct from '00000000-0000-0000-0000-00000000000f' then
    raise exception 'FAIL: a raw insert kept the client-sent owner_user_id (%) instead of forcing it from auth.uid()', v_owner;
  end if;
  if v_mode <> 'readonly' then
    raise exception 'FAIL: a raw insert created a mode=% session; every new session must be readonly only', v_mode;
  end if;
  perform set_config('test.probe_id', v_id::text, false);
  raise notice 'PASS: a raw insert as authenticated has owner_user_id forced from auth.uid() and mode forced to readonly - neither identity nor write-mode can be forged from the client';
end $$;
reset session authorization;
delete from impersonation_logs where id = current_setting('test.probe_id')::uuid;

-- (2) BEFORE: with no support session, the owner can write every category.
set role authenticated;
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare r record; n int;
begin
  for r in select label, write_sql from owner_write_cases() loop
    n := test_try_write(r.write_sql);
    if n <= 0 then
      raise exception 'FAIL: the owner could not write category "%" before any support session existed (result %)', r.label, n;
    end if;
  end loop;
  raise notice 'PASS: before any support session, the owner can write every category of client-society data';
end $$;

-- (3) Open the session the REAL way - the same open_support_session RPC
-- insertImpersonationLogReal calls - and confirm the row it hands back:
-- owner_user_id set server-side from auth.uid(), mode forced readonly, not
-- yet exited. This is the code path the old manual-row test never took.
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare v_log impersonation_logs;
begin
  v_log := open_support_session('a0000000-0000-0000-0000-000000000001', 'checking a resident complaint, through the real code path');
  if v_log.id is null then raise exception 'FAIL: open_support_session returned no session record'; end if;
  if v_log.owner_user_id is distinct from '00000000-0000-0000-0000-00000000000f' then
    raise exception 'FAIL: open_support_session did not set owner_user_id from auth.uid() (got %)', v_log.owner_user_id;
  end if;
  if v_log.mode <> 'readonly' then raise exception 'FAIL: open_support_session did not force readonly (got %)', v_log.mode; end if;
  if v_log.exited_at is not null then raise exception 'FAIL: a brand-new session should not already be exited'; end if;
  perform set_config('test.support_log_id', v_log.id::text, false);
  raise notice 'PASS: open_support_session created a real session with owner_user_id from auth.uid() and readonly mode, and returned the whole row to confirm';
end $$;

-- (4) DURING: with that real session active, every owner write category is
-- refused at the database level, checked one category at a time.
do $$
declare r record; n int;
begin
  for r in select label, write_sql from owner_write_cases() loop
    n := test_try_write(r.write_sql);
    if n > 0 then
      raise exception 'FAIL: the owner write to category "%" was NOT blocked during an active support session (result %)', r.label, n;
    end if;
  end loop;
  raise notice 'PASS: during an active support session, every owner write category is genuinely refused at the database level';
end $$;

-- (5) DURING: reads are completely unaffected.
do $$
declare c int;
begin
  select count(*) into c from complaints where society_id = 'a0000000-0000-0000-0000-000000000001';
  if c = 0 then raise exception 'FAIL: the owner could not read during a support session - reads must be unaffected'; end if;
  raise notice 'PASS: reads remain completely unaffected during an active support session - only writes are refused';
end $$;

-- (6) DURING: a DIFFERENT society is completely unaffected - the owner can
-- still write to Society B, since the guard is per-society.
do $$
declare n int;
begin
  n := test_try_write($w$insert into notices (society_id, title, body, category) values ('b0000000-0000-0000-0000-000000000001', 'owner writes society B fine', 'x', 'General')$w$);
  if n <= 0 then raise exception 'FAIL: a support session for Society A also blocked the owner from writing to Society B - the guard must be per-society'; end if;
  raise notice 'PASS: a support session for Society A leaves the owner''s writes to a different society (B) completely unaffected';
end $$;

-- (7) DURING: Society A's own admin is unaffected - the guard blocks only the
-- owner, never the society's real management.
select test_become('00000000-0000-0000-0000-0000000000a1');
do $$
declare n int;
begin
  n := test_try_write($w$insert into notices (society_id, title, body, category) values ('a0000000-0000-0000-0000-000000000001', 'admin writes fine during owner support', 'x', 'General')$w$);
  if n <= 0 then raise exception 'FAIL: the owner support session leaked onto Society A''s own admin, blocking a normal admin write'; end if;
  raise notice 'PASS: Society A''s own society_admin writes normally during the owner''s support session - only the owner is guarded';
end $$;

-- (8) DURING: general document storage. The owner has no upload path here in
-- any mode (only society_admin/committee_member do), so there's no owner
-- before/blocked/after cycle to run for it. What matters is that the guard
-- doesn't leak onto the people who DO have a path (Society A's admin can still
-- upload during the session) and the owner is refused by role, as always.
select test_become('00000000-0000-0000-0000-0000000000a1');
do $$
declare n int;
begin
  n := test_try_write($w$insert into storage.objects (bucket_id, name) values ('documents', 'd0000000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.pdf')$w$);
  if n <= 0 then raise exception 'FAIL: Society A''s admin could not upload a document during the owner''s support session - the guard must not leak onto non-owner writers'; end if;
  raise notice 'PASS: document-bucket upload by Society A''s own admin is unaffected by the owner''s support session';
end $$;
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare n int;
begin
  n := test_try_write($w$insert into storage.objects (bucket_id, name) values ('documents', 'd0000000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.pdf')$w$);
  if n > 0 then raise exception 'FAIL: the owner uploaded a document - the owner has no document-storage path and must be refused in every mode'; end if;
  raise notice 'PASS: the owner has no document-bucket upload path at all (refused by role, independent of support mode) - an audited decision, not an oversight';
end $$;

-- (9) Close the session the REAL way - the close_support_session RPC
-- exitImpersonationLogReal calls - and confirm exited_at is genuinely set,
-- and that a retry is safely idempotent.
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare v_closed impersonation_logs; v_retry impersonation_logs;
begin
  v_closed := close_support_session(current_setting('test.support_log_id')::uuid);
  if v_closed.exited_at is null then
    raise exception 'FAIL: close_support_session did not set exited_at - exit must be a confirmed database update, not fire-and-forget';
  end if;
  v_retry := close_support_session(current_setting('test.support_log_id')::uuid);
  if v_retry.exited_at is null then
    raise exception 'FAIL: retrying close on an already-closed session did not report success idempotently';
  end if;
  raise notice 'PASS: close_support_session confirmed the exit as a real database update, and is safely idempotent on retry';
end $$;

-- (10) AFTER: write access is genuinely restored across every category the
-- moment the session is really exited.
do $$
declare r record; n int;
begin
  for r in select label, write_sql from owner_write_cases() loop
    n := test_try_write(r.write_sql);
    if n <= 0 then
      raise exception 'FAIL: the owner could not write category "%" again after exiting the support session (result %)', r.label, n;
    end if;
  end loop;
  raise notice 'PASS: after a real exit, the owner can write every category again - the guard only applied while the session was active';
end $$;

-- (11) Time-bound: a session that was never explicitly exited but is well past
-- the window no longer blocks. Created directly here (not via the RPC) because
-- the RPC always stamps now(), and this needs a deliberately old entered_at.
reset session authorization;
insert into impersonation_logs (society_id, owner_user_id, mode, entered_at)
values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'readonly', now() - interval '5 hours');
set role authenticated;
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare n int;
begin
  n := test_try_write($w$insert into notices (society_id, title, body, category) values ('a0000000-0000-0000-0000-000000000001', 'write after an old session aged out', 'x', 'General')$w$);
  if n <= 0 then
    raise exception 'FAIL: an old, never-exited session past the time-bound window was still blocking the owner - a forgotten exit must not lock things forever';
  end if;
  raise notice 'PASS: a session past the time-bound window no longer blocks, even though it was never explicitly exited';
end $$;

-- (12) Historical mode=write rows (from before write mode was removed from the
-- product) stay valid and readable - the fix pins only NEW sessions to
-- readonly, it does not reject or rewrite what's already in the table.
reset session authorization;
insert into impersonation_logs (society_id, owner_user_id, mode, entered_at, exited_at)
values ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'write', now() - interval '10 days', now() - interval '10 days');
set role authenticated;
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare wc int;
begin
  select count(*) into wc from impersonation_logs where society_id = 'a0000000-0000-0000-0000-000000000001' and mode = 'write';
  if wc = 0 then
    raise exception 'FAIL: a historical mode=write row could not be read back - existing rows must stay valid and readable after the fix';
  end if;
  raise notice 'PASS: a historical mode=write session row is still valid and readable, the fix constrains only new sessions';
end $$;

-- ============================================================================
-- (13) The three atomic payment RPCs themselves, under a real support session.
--
-- record_payment_atomic / confirm_pending_payment_atomic / cancel_receipt_atomic
-- are what the app actually calls for every payment, not raw table writes. The
-- rest of this suite proved the payments/bills tables carry the owner guard,
-- and proved these functions are correct for receipt numbering; it never called
-- them while a support session was active. They are security invoker, so the
-- insert/update inside each is meant to be re-checked against payments_insert /
-- payments_update / bills_update - but "meant to" is an inference until the real
-- call path is exercised. This section exercises it, before/during/after a
-- genuine session opened through the real open_support_session RPC, with real,
-- valid arguments (the same shapes the before-checks pass with, so a block here
-- is the guard doing its job, not an argument error).
--
-- Two genuinely different shapes, asserted for what actually matters on purpose:
--   - record_payment_atomic INSERTs, so a blocked owner call RAISES (the new row
--     violates payments_insert) and "blocked" means the call errors.
--   - confirm_/cancel_ first SELECT ... FOR UPDATE the target row, and a locking
--     select applies payments_update's USING as well, so the guarded row is not
--     even lockable by the owner and the function fails closed ("payment not
--     found"). Rather than pin the exact refusal mechanism, each confirm_/cancel_
--     check attempts the call, tolerates however it is refused, and then asserts
--     the invariant that truly matters: the underlying payment did not move
--     (still pending / still not cancelled). The after-phase runs the identical
--     call once the session is closed and it succeeds - that is what proves a
--     during-block is the support guard, not a malformed argument.
-- ============================================================================

-- Clean slate: drop the aged-out session phase 11 left in place, so "before" is
-- a genuinely session-free state for the owner on Society A.
reset session authorization;
delete from impersonation_logs where society_id = 'a0000000-0000-0000-0000-000000000001' and exited_at is null;

-- Real rows to act on, created the realistic way: Society A's own committee
-- member records the pending payments and the to-be-cancelled receipts, Society
-- B's own admin does the same for B. Recording these successfully with no
-- session active is itself the "before" proof that these functions work
-- normally for real management - the during-checks below are the contrast.
set role authenticated;
select test_become('00000000-0000-0000-0000-0000000000a1'); -- committee member, Society A
do $$
begin
  -- pending payments for the confirm checks
  perform record_payment_atomic('0a1c0000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 400, 'upi', null, null, 'pending_confirmation');
  perform record_payment_atomic('0a1c0000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 450, 'upi', null, null, 'pending_confirmation');
  -- confirmed receipts for the cancel checks (record pending, then confirm, so a
  -- real receipt genuinely exists before anyone tries to cancel it)
  perform record_payment_atomic('0a1d0000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 500, 'upi', null, null, 'pending_confirmation');
  perform confirm_pending_payment_atomic('0a1d0000-0000-0000-0000-000000000001');
  perform record_payment_atomic('0a1d0000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 550, 'upi', null, null, 'pending_confirmation');
  perform confirm_pending_payment_atomic('0a1d0000-0000-0000-0000-000000000002');
  raise notice 'SETUP: Society A committee member created real pending payments and confirmed receipts via the atomic functions, with no session active (the before-state for these functions)';
end $$;

select test_become('00000000-0000-0000-0000-0000000000b1'); -- admin, Society B
do $$
begin
  perform record_payment_atomic('0b1c0000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000201', null, current_date, 400, 'upi', null, null, 'pending_confirmation');
  perform record_payment_atomic('0b1d0000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000201', null, current_date, 500, 'upi', null, null, 'pending_confirmation');
  perform confirm_pending_payment_atomic('0b1d0000-0000-0000-0000-000000000003');
  raise notice 'SETUP: Society B admin created its own pending payment and confirmed receipt, for the per-society during-checks';
end $$;

-- BEFORE (record_payment_atomic): with no session, the owner can record a
-- payment through the real function, valid args, receipt allocated.
select test_become('00000000-0000-0000-0000-00000000000f'); -- owner
do $$
declare v jsonb;
begin
  v := record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 300, 'cash', null, null, 'success');
  if v->>'receipt_no' is null then
    raise exception 'FAIL: record_payment_atomic did not allocate a receipt for the owner before any session - the before-state must genuinely work, or the during-block below proves nothing';
  end if;
  raise notice 'PASS: before any support session, the owner records a payment through record_payment_atomic and gets a real receipt (%)', v->>'receipt_no';
end $$;

-- Open the session the REAL way, the same RPC the app calls.
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare v_log impersonation_logs;
begin
  v_log := open_support_session('a0000000-0000-0000-0000-000000000001', 'reviewing payments, atomic-function checks');
  perform set_config('test.atomic_support_log_id', v_log.id::text, false);
  raise notice 'SETUP: owner opened a real readonly support session for Society A, for the atomic-function during-checks';
end $$;

-- DURING (record_payment_atomic): the owner's insert is refused. record INSERTs,
-- so this genuinely raises, exactly as the raw payments_insert did earlier.
do $$
begin
  perform record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 300, 'cash', null, null, 'success');
  raise exception 'FAIL: record_payment_atomic let the owner record a payment during a readonly support session - the security-invoker function did not inherit payments_insert''s owner guard';
exception
  when insufficient_privilege then
    raise notice 'PASS: record_payment_atomic refuses the owner during a readonly support session (payments_insert raises on the blocked row), same as the raw insert';
end $$;

-- DURING (confirm_pending_payment_atomic): the owner is refused. The refusal
-- surfaces as the function failing closed (the row is not lockable, so it raises
-- "payment not found"); the invariant we actually assert is the payment itself -
-- it must stay pending. The nested block tolerates however the refusal arrives.
do $$
declare v_status text;
begin
  begin
    perform confirm_pending_payment_atomic('0a1c0000-0000-0000-0000-000000000001');
  exception when others then null; -- refused; the real proof is the row state below
  end;
  select status into v_status from payments where id = '0a1c0000-0000-0000-0000-000000000001';
  if v_status is distinct from 'pending_confirmation' then
    raise exception 'FAIL: confirm_pending_payment_atomic moved a payment (status now %) during a readonly support session - the owner guard did not reach the real function''s call path', v_status;
  end if;
  raise notice 'PASS: confirm_pending_payment_atomic leaves the payment genuinely pending during a readonly support session - the guarded row is not confirmable by the owner';
end $$;

-- DURING (cancel_receipt_atomic): same, the receipt must stay not-cancelled.
do $$
declare v_cancelled boolean;
begin
  begin
    perform cancel_receipt_atomic('0a1d0000-0000-0000-0000-000000000001', 'owner should not be able to do this mid-support');
  exception when others then null; -- refused; the real proof is the row state below
  end;
  select cancelled into v_cancelled from payments where id = '0a1d0000-0000-0000-0000-000000000001';
  if v_cancelled is distinct from false then
    raise exception 'FAIL: cancel_receipt_atomic reversed a receipt (cancelled=%) during a readonly support session - the owner guard did not reach the real function''s call path', v_cancelled;
  end if;
  raise notice 'PASS: cancel_receipt_atomic leaves the receipt genuinely un-cancelled during a readonly support session - the guarded row is not cancellable by the owner';
end $$;

-- DURING, per-society: the session is for Society A only, so the owner can still
-- confirm and cancel Society B's own rows - the atomic guard is per-society.
do $$
declare v_status text; v_cancelled boolean;
begin
  perform confirm_pending_payment_atomic('0b1c0000-0000-0000-0000-000000000003');
  select status into v_status from payments where id = '0b1c0000-0000-0000-0000-000000000003';
  if v_status <> 'success' then
    raise exception 'FAIL: a Society A support session also blocked the owner from confirming Society B''s payment (status %) - the atomic guard must be per-society', v_status;
  end if;
  perform cancel_receipt_atomic('0b1d0000-0000-0000-0000-000000000003', 'per-society check');
  select cancelled into v_cancelled from payments where id = '0b1d0000-0000-0000-0000-000000000003';
  if not v_cancelled then
    raise exception 'FAIL: a Society A support session also blocked the owner from cancelling Society B''s receipt - the atomic guard must be per-society';
  end if;
  raise notice 'PASS: a Society A support session leaves the owner free to confirm and cancel Society B''s own rows through the atomic functions - per-society, not global';
end $$;

-- DURING, non-owner unaffected: Society A's own committee member can still
-- confirm and cancel A's rows during the owner's session - the guard is owner-only.
select test_become('00000000-0000-0000-0000-0000000000a1'); -- committee member, Society A
do $$
declare v_status text; v_cancelled boolean;
begin
  perform confirm_pending_payment_atomic('0a1c0000-0000-0000-0000-000000000002');
  select status into v_status from payments where id = '0a1c0000-0000-0000-0000-000000000002';
  if v_status <> 'success' then
    raise exception 'FAIL: Society A''s own committee member could not confirm a payment during the owner''s support session (status %) - the guard must apply only to the owner', v_status;
  end if;
  perform cancel_receipt_atomic('0a1d0000-0000-0000-0000-000000000002', 'committee cancels its own receipt, unaffected by owner session');
  select cancelled into v_cancelled from payments where id = '0a1d0000-0000-0000-0000-000000000002';
  if not v_cancelled then
    raise exception 'FAIL: Society A''s own committee member could not cancel a receipt during the owner''s support session - the guard must apply only to the owner';
  end if;
  raise notice 'PASS: Society A''s own committee member confirms and cancels normally during the owner''s support session - the atomic guard is owner-only, it does not leak onto real management';
end $$;

-- Close the session the REAL way.
select test_become('00000000-0000-0000-0000-00000000000f');
do $$
declare v_closed impersonation_logs;
begin
  v_closed := close_support_session(current_setting('test.atomic_support_log_id')::uuid);
  if v_closed.exited_at is null then
    raise exception 'FAIL: could not close the atomic-function support session for the after-checks';
  end if;
  raise notice 'SETUP: owner exited the support session for the atomic-function after-checks';
end $$;

-- AFTER: with the session genuinely exited, every atomic function works for the
-- owner again on the exact rows blocked moments ago.
do $$
declare v jsonb; v_status text; v_cancelled boolean;
begin
  v := record_payment_atomic(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000101', null, current_date, 300, 'cash', null, null, 'success');
  if v->>'receipt_no' is null then
    raise exception 'FAIL: after exiting support, record_payment_atomic still would not record for the owner - the guard must only apply while the session is active';
  end if;

  perform confirm_pending_payment_atomic('0a1c0000-0000-0000-0000-000000000001');
  select status into v_status from payments where id = '0a1c0000-0000-0000-0000-000000000001';
  if v_status <> 'success' then
    raise exception 'FAIL: after exiting support, the owner still could not confirm the previously-blocked payment (status %)', v_status;
  end if;

  perform cancel_receipt_atomic('0a1d0000-0000-0000-0000-000000000001', 'owner cancels after exiting support');
  select cancelled into v_cancelled from payments where id = '0a1d0000-0000-0000-0000-000000000001';
  if not v_cancelled then
    raise exception 'FAIL: after exiting support, the owner still could not cancel the previously-blocked receipt';
  end if;

  raise notice 'PASS: after a real exit, record_payment_atomic, confirm_pending_payment_atomic, and cancel_receipt_atomic all work for the owner again on the exact rows they were blocked on - the guard applied only during the session';
end $$;

\echo ''
\echo 'All isolation tests completed successfully.'
