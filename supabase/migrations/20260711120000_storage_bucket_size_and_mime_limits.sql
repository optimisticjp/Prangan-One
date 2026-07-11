-- =================================================================
-- Storage bucket file-size and MIME-type limits.
-- =================================================================
-- Additive and safe to run against a live database that already has these
-- four buckets and real objects in them: it only sets two columns on the
-- existing bucket rows (file_size_limit in bytes, allowed_mime_types). It
-- does not touch a single stored object, does not drop anything, and is
-- idempotent - re-running just sets the same values again. Existing objects
-- that predate these limits are left exactly as they are; the limits apply
-- to new uploads from here on.
--
-- These limits are the real enforcement boundary, applied by Storage itself
-- on every upload regardless of what the client does. image/svg+xml is
-- deliberately excluded everywhere: an SVG can carry script, and
-- society-logos is a public bucket rendered in an <img>, so allowing SVG
-- would be a stored-XSS vector. Raster images only; documents additionally
-- allows application/pdf.
--
-- schema.sql is the canonical fresh-install target and already carries these
-- same limits on its bucket inserts; this migration brings an already-existing
-- project to the identical state.
-- =================================================================

begin;

update storage.buckets
  set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id = 'society-logos';

update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id = 'complaint-photos';

update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id = 'payment-proof';

update storage.buckets
  set file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
  where id = 'documents';

commit;

-- =================================================================
-- End of migration.
-- =================================================================
