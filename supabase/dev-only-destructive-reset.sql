-- =================================================================
-- DEVELOPMENT ONLY. DESTRUCTIVE. DO NOT RUN AGAINST REAL CLIENT DATA.
-- =================================================================
-- This drops EVERYTHING this project's schema.sql creates - every table,
-- every function, every policy, and the storage policies - so that schema.sql
-- can be re-applied from a completely clean slate. It is the "reset" half of
-- the old reset-then-reapply workflow, kept only for local development and a
-- brand-new, empty project.
--
-- It is NOT a migration and must NEVER be part of deploying a schema change to
-- a database that has real society data in it. Once a real client's data
-- exists in production, every schema change goes through an additive migration
-- under supabase/migrations/ instead (see the impersonation safeguard
-- migration there for the shape of one). Running this on production would
-- delete real societies, residents, bills, payments, and audit history with no
-- recovery. See PRODUCTION-RUNBOOK.md.
--
-- Because a mistake here is unrecoverable, this script refuses to run if it
-- finds any society rows - the guard below stops it before it drops anything.
-- That guard is a safety net, not permission: the rule is still "never run
-- this once real client data exists," the guard just makes an accidental run
-- fail loudly instead of silently destroying data.
-- =================================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'societies'
  ) then
    if (select count(*) from public.societies) > 0 then
      raise exception
        'refusing to run dev-only-destructive-reset.sql: public.societies has % row(s). This script is development-only and must never run against a database with real client data. Use an additive migration under supabase/migrations/ instead.',
        (select count(*) from public.societies);
    end if;
  end if;
end $$;

-- Storage policies live on storage.objects (a Supabase-managed table, not in
-- our public schema), so they aren't removed by dropping the public schema
-- below. Drop them explicitly so a fresh schema.sql run, whose create policy
-- statements have no "or replace", doesn't fail on an already-existing policy.
drop policy if exists society_logos_select     on storage.objects;
drop policy if exists society_logos_insert     on storage.objects;
drop policy if exists society_logos_update     on storage.objects;
drop policy if exists society_logos_delete     on storage.objects;
drop policy if exists complaint_photos_select  on storage.objects;
drop policy if exists complaint_photos_insert  on storage.objects;
drop policy if exists payment_proof_select     on storage.objects;
drop policy if exists payment_proof_insert     on storage.objects;
drop policy if exists documents_storage_select on storage.objects;
drop policy if exists documents_storage_insert on storage.objects;

-- Every table, function, and policy this project owns lives in one of these
-- two schemas, so dropping them cascade-removes the whole schema in one step -
-- no hand-maintained list of tables to fall out of date. schema.sql recreates
-- both from scratch on the next run.
drop schema if exists private cascade;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated;
grant create on schema public to postgres;

-- =================================================================
-- End of destructive reset. Now run schema.sql to rebuild everything,
-- then re-add the owner's own membership (see PRODUCTION-RUNBOOK.md).
-- =================================================================
