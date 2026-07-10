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

grant execute on function test_become(uuid), test_assert(boolean, text) to authenticated;

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

\echo ''
\echo 'All isolation tests completed successfully.'
