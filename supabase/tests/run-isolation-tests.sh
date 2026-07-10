#!/bin/bash
# Repeatable tenant isolation and access-control verification.
#
# This exists because of a real gap: RLS and cross-tenant isolation were
# genuinely verified against real Postgres many times over the course of
# building this app, but each time meant setting up a fresh throwaway
# database by hand, running some scenarios, then discarding it - the
# verification was real, but nothing about it was ever kept. This script
# is that same verification, written down once, so it can be re-run
# after any schema change instead of re-invented from memory every time.
#
# Requires: a local Postgres instance reachable as the `postgres` superuser
# (no password, matching how this project's schema work has been done
# throughout - see supabase/README.md's own note on why the schema is
# always applied to a completely fresh database rather than diffed).
#
# Usage: ./run-isolation-tests.sh
# Exit code 0 = every test passed. Non-zero = at least one failed, with
# the specific failure printed before that.

set -e

DB_NAME="prangan_isolation_test_$$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/../schema.sql"

cleanup() {
  psql -U postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" > /dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Setting up $DB_NAME..."
psql -U postgres -c "CREATE DATABASE \"$DB_NAME\";" > /dev/null

# Stubs Supabase's own managed schemas (auth, storage) closely enough to
# test real RLS policies against - not the real extensions, just the
# columns and functions this project's own policies actually touch. The
# same stub used throughout this project's development, written down
# here instead of retyped by hand each time.
psql -U postgres -d "$DB_NAME" > /dev/null << 'STUB_EOF'
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT NULL::jsonb $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text NOT NULL, owner uuid);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
STUB_EOF

echo "Applying schema..."
psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE" > /dev/null

echo "Running isolation tests..."
echo ""
psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/isolation_tests.sql"

echo ""
echo "All tests passed."
