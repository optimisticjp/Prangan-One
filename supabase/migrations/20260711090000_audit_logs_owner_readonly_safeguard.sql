-- =================================================================
-- audit_logs insert: put the owner through the read-only support guard.
-- =================================================================
-- This is a real, additive migration for a database that already has real
-- society data in it. It does NOT drop a table and does NOT reset anything.
-- It is safe to run against production, and safe to re-run: the policy is
-- dropped-if-exists and recreated.
--
-- Found during an independent review of the first support-mode migration
-- (20260710120000_impersonation_owner_readonly_safeguard.sql), not part of
-- the original defect list. That migration rebuilt every owner-write policy
-- to go through private.owner_can_write, but audit_logs_insert was left as a
-- plain has_role list that still included 'owner':
--
--   with check (private.has_role(society_id, array['owner', 'society_admin', 'accountant']))
--
-- so a read-only support session was not actually blocked from writing an
-- audit_logs row. Every other write category on the society was, this one
-- table was the gap.
--
-- How reachable it was, honestly: the real application never writes to
-- audit_logs directly today. It only reads the table, for the activity
-- display (fetchAuditLogs in src/lib/realData.ts is a plain select, there is
-- no insert anywhere in the client). So this was never reachable through the
-- actual product during a support session. But the safeguard is a database
-- boundary, not an application convention, and a direct PostgREST call to
-- POST /audit_logs from an owner's authenticated session would have been
-- accepted while read-only, which is exactly what the boundary is meant to
-- refuse. This closes that.
--
-- The fix mirrors the shape every other write policy already uses: the owner
-- is its own private.owner_can_write branch, which is has_role('owner') AND
-- NOT owner_in_readonly_support, instead of a bare has_role('owner') in the
-- array. society_admin and accountant are unchanged.
-- =================================================================

begin;

drop policy if exists audit_logs_insert on audit_logs;
create policy audit_logs_insert on audit_logs for insert
  with check (private.has_role(society_id, array['society_admin', 'accountant']) or private.owner_can_write(society_id));

commit;

-- =================================================================
-- End of migration.
-- =================================================================
