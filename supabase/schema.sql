-- =================================================================
-- Prangan One - Supabase schema
-- =================================================================
-- This is the canonical schema: the single fresh-install target, kept in
-- step with the additive migrations under supabase/migrations/, not a
-- snapshot of whatever is currently applied to the live production database
-- (which this repo cannot see or verify - see PRODUCTION-RUNBOOK.md section
-- 2). A local demo mode also exists in the app (see src/lib/store.tsx) for
-- exploring the UI without a Supabase project connected, entirely separate
-- from this, but every real session reads and writes through what's defined
-- here. See supabase/README.md for setup and applying this to a fresh
-- project, and supabase/tests/run-isolation-tests.sh for an automated,
-- repeatable check of the tenant isolation this schema actually provides.
--
-- Design notes:
--   - Every society-owned table carries society_id, so one Supabase
--     project serves every society on the platform, and RLS scopes
--     every query to "societies I belong to."
--   - IDs are uuid, generated server-side for real sessions. The local
--     demo mode's own client-side prefixed string IDs (e.g.
--     "bill_101_2026-04") are unrelated to this and never touch this
--     database; nothing in the frontend depends on ID format, only on
--     equality within whichever mode it's actually in.
--   - Two places where the local demo mode used a JSON blob get proper
--     tables here instead, because the DB can enforce a real constraint:
--       * poll votes -> poll_votes, with UNIQUE(poll_id, flat_id)
--         so "one vote per flat" is impossible to violate, not just
--         app logic that happens to check it.
--       * event contributions/volunteers/expenses -> their own
--         tables, so they can be queried and indexed properly.
--   - The subscription write-guard (trial/active/grace write, paused/
--     archived don't) is enforced HERE, in private.can_write() below, and
--     used inside every insert/update policy, not just in the
--     frontend. src/lib/subscription.ts has the same rule so the UI
--     can show/hide controls proactively, but the database is what
--     actually stops a write from a paused society; a browser-side
--     check can always be bypassed by someone editing their own client.
--   - Helper functions used only inside RLS policies or only from
--     inside another security-definer function (has_role, can_write,
--     the join-code lookups, the rate limiter, and so on) live in their
--     own private schema, not public - PostgREST auto-exposes every
--     function in public as a callable API endpoint the moment the
--     calling role has EXECUTE on it, whether or not that function was
--     ever meant to be called directly. private isn't in PostgREST's
--     exposed-schema list, so none of this is reachable as an API call
--     at all, while RLS policy evaluation (and calls from inside
--     security-definer functions like submit_join_request) can still
--     reach it normally. Only find_society_public_profile, poll_results,
--     submit_join_request, open_support_session, and close_support_session
--     are genuinely meant to be called directly - those five stay in
--     public, on purpose.
--   - Section order matters and is not arbitrary: tables are created
--     BEFORE the helper functions, even though the functions are
--     conceptually "used by" the RLS policies that come later. Plain
--     `language sql` functions (unlike plpgsql ones) are checked
--     against the catalog at CREATE FUNCTION time, not just when
--     called, so a function referencing a table that doesn't exist
--     yet fails immediately with "relation ... does not exist," even
--     though the table shows up further down the same file. Don't
--     move the functions section back above the tables section.
-- =================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------

create table societies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  name_en          text not null,
  -- URL-safe, unique across the platform: pranganone.com/s/{slug}. Public
  -- by design. Genuinely missing from this schema until now, a leftover
  -- gap from before that route existed - the app-level code has assumed
  -- it since Society.slug was added to src/lib/types.ts.
  slug             text not null unique,
  -- Short, human-typeable code (Google Classroom-style) a resident enters
  -- at /join to self-enroll. Identifies the society only, never grants
  -- access by itself - see the can-write policies on memberships below
  -- and selfEnrollResident() in src/lib/store.tsx for the actual gate.
  join_code        text not null unique,
  address          text not null,
  city             text not null default '',
  area             text not null default '',
  maintenance_amount numeric not null default 0,
  due_day          int not null default 10,
  upi_id           text not null default '',
  plan             text not null default 'trial',
  flats_limit      int not null default 50,
  receipt_prefix   text not null default 'SOC',
  theme_key        text not null default 'navy-saffron',
  logo_url         text,  -- Supabase Storage URL once file upload is wired up; data-URL logos from the demo don't carry over
  support_phone    text,
  -- Two layers, mirroring ModuleLayer in src/lib/types.ts. owner_enabled is
  -- set by the platform owner (what the society has paid for / been
  -- given). admin_visible is set by the society's own admin, within what
  -- the owner enabled - a module is actually usable only when BOTH layers
  -- say true (see moduleEnabled() in src/lib/store.tsx for the identical
  -- check). Deliberately no visitor/gatekeeper key anywhere - out of scope.
  owner_enabled_modules jsonb not null default '{
    "billing": true, "complaints": true, "notices": true, "documents": true,
    "vendors": true, "polls": true, "events": true, "parking": true, "reports": true
  }'::jsonb,
  admin_visible_modules jsonb not null default '{
    "billing": true, "complaints": true, "notices": true, "documents": true,
    "vendors": true, "polls": true, "events": true, "parking": true, "reports": true
  }'::jsonb,
  tenant_access    text not null default 'full' check (tenant_access in ('disabled', 'limited', 'full')),
  subscription_status text not null default 'trial' check (subscription_status in ('trial', 'active', 'grace', 'paused', 'archived')),
  grace_started_at timestamptz,
  -- Set once, when the society is actually activated and ready to use -
  -- never at lead submission, never at the moment an empty society record
  -- is created. See private.can_write() above and src/lib/subscription.ts, which
  -- computes trial expiry from this the same way grace expiry is
  -- computed from grace_started_at, no scheduled job needed.
  trial_started_at timestamptz,
  receipt_seq      int not null default 1,
  created_at       timestamptz not null default now()
);

-- Auth user <-> society <-> role. This is what every RLS policy below
-- ultimately checks. A resident's row also carries their flat_id.
--
-- Auth method: Supabase Auth's built-in email magic link (passwordless),
-- not phone/SMS OTP. This was a deliberate choice - real SMS OTP in India
-- needs TRAI DLT sender registration (a paid, multi-day process) on top of
-- a per-message cost, while Supabase's email magic link needs no separate
-- provider and costs nothing. See docs/SECURITY_PRIVACY.md and
-- CLAUDE_CODE_NEXT_STEPS.md for the full reasoning.
--
-- Because of this, memberships rows are created from the OTHER direction:
-- the committee adds a flat/member with their email address (via the
-- Members page or a CSV import), which creates a pending membership. When
-- that person's first magic-link login completes, src/lib/auth.ts's
-- claimMemberships() matches auth.users.email against pending rows here
-- and attaches the real user_id.
--
-- Role model (matches Role in src/lib/types.ts exactly):
--   owner            - platform-wide, every society, every action
--   society_admin    - full control of their own society only
--   committee_member - manages enabled modules, NOT billing unless
--                      can_manage_billing is true for their row
--   accountant       - finance and reports only
--   resident_owner   - their own flat, owner-level access
--   resident_tenant  - their own flat, scoped further by the society's
--                      tenant_access setting (see private.is_tenant() above)
--   viewer           - read-only, sees admin-level data, changes nothing
create table memberships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,  -- null until claimed
  email          text not null,  -- set at invite time; matched against auth.users.email on claim
  name           text,  -- given at invite time or self-enrollment time, see /join
  -- Nullable ONLY for role = 'owner' (see the check constraint below) - a
  -- platform owner isn't scoped to one society, unlike every other role.
  -- Every private.has_role() check throughout this file special-cases this: an
  -- owner row with society_id null matches private.has_role(any_society, [...,
  -- 'owner']) regardless of which society is being asked about. Don't
  -- relax this to "nullable for everyone" - every other role still needs
  -- a real society_id, that's what scopes their access at all.
  society_id     uuid references societies(id) on delete cascade,
  flat_id        uuid,  -- fk added after flats table exists, see below
  role           text not null check (role in (
                   'owner', 'society_admin', 'committee_member', 'accountant',
                   'resident_owner', 'resident_tenant', 'auditor'
                 )),
  phone          text,
  whatsapp       text,
  can_manage_billing boolean not null default false,  -- only meaningful when role = committee_member
  -- 'active': usable immediately (every admin-added invite, or a /join
  -- self-enrollment whose email matched the flat on file - not phone, a
  -- phone number isn't a secret). 'pending': a
  -- self-enrollment nothing on file could confirm, needs committee
  -- approval (see can_write-style write policies below) before it's
  -- claimable - claimMemberships() in src/lib/auth.ts only claims
  -- status = 'active' rows on purpose.
  status         text not null default 'active' check (status in ('active', 'pending')),
  created_at     timestamptz not null default now(),
  check (society_id is not null or role = 'owner'),
  unique (society_id, email)
);
-- Postgres treats NULL as distinct from NULL for a plain unique
-- constraint, so the (society_id, email) unique above does nothing to
-- stop the same email getting two global-owner rows. This catches that
-- specific case instead.
create unique index memberships_owner_email_unique on memberships (email) where society_id is null;

-- The trigger that enforces self-enrollment rules server-side attaches
-- further down, right after private.enforce_membership_insert() is defined - it
-- needs both this table AND that function to exist, and the function
-- lives in the Helper functions section below (which itself has to come
-- after Core tables, for the unrelated language-sql-functions reason
-- explained at the top of this file). See "Triggers" section.

create table flats (
  id            uuid primary key default gen_random_uuid(),
  society_id    uuid not null references societies(id) on delete cascade,
  number        text not null,
  floor         int not null,
  owner_name    text not null,
  phone         text not null default '',
  email         text,
  occupancy     text not null check (occupancy in ('owner', 'tenant')),
  tenant_name   text,
  tenant_email  text,
  sqft          int not null default 0,
  member_since  int not null default extract(year from now()),
  -- Overrides the society's default maintenance_amount for this one flat
  -- when generating bills. Null means "use the society default", not zero.
  maintenance_override numeric,
  created_at    timestamptz not null default now(),
  unique (society_id, number)
);

alter table memberships
  add constraint memberships_flat_id_fkey
  foreign key (flat_id) references flats(id) on delete set null;

create table bills (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  flat_id      uuid not null references flats(id) on delete cascade,
  month        text not null,  -- 'YYYY-MM'
  amount       numeric not null,
  paid_amount  numeric not null default 0,
  due_date     date not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (society_id, flat_id, month)
);

create table vendors (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references societies(id) on delete cascade,
  name            text not null,
  service         text not null default '',
  contact_person  text not null default '',
  phone           text not null default '',
  amc_start       date,
  amc_end         date,
  notes           text,
  created_at      timestamptz not null default now()
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  flat_id      uuid not null references flats(id) on delete cascade,
  bill_id      uuid references bills(id) on delete set null,
  date         date not null,
  amount       numeric not null,
  mode         text not null check (mode in ('cash', 'upi', 'cheque', 'bank')),
  ref_no       text,
  receipt_no   text,
  -- pending_confirmation: the resident's own "I have paid" soft flag,
  -- never treated as an official payment until the committee confirms it
  -- (confirmPendingPayment in src/lib/store.tsx). cancelled: receipts are
  -- never deleted, only marked cancelled with a required reason, so there
  -- is always an audit trail for money - see cancel_reason below.
  status       text not null check (status in ('success', 'failed', 'pending_confirmation')),
  note         text,
  cancelled    boolean not null default false,
  cancel_reason text,
  proof_path   text,  -- storage path in the payment-proof bucket, set after upload succeeds (see the Storage buckets block later in this file)
  created_at   timestamptz not null default now()
);

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  date         date not null,
  category     text not null,
  vendor_id    uuid references vendors(id) on delete set null,
  amount       numeric not null,
  mode         text not null check (mode in ('cash', 'upi', 'cheque', 'bank')),
  note         text,
  bill_file    text,  -- storage path once Supabase Storage is wired up
  created_at   timestamptz not null default now()
);

create table complaints (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references societies(id) on delete cascade,
  flat_id         uuid not null references flats(id) on delete cascade,
  category        text not null,
  title           text not null,
  detail          text not null default '',
  priority        text not null check (priority in ('normal', 'urgent')),
  status          text not null default 'new' check (status in ('new', 'assigned', 'inprogress', 'done', 'closed')),
  assigned_to     text,
  has_photo       boolean not null default false,
  photo_path      text,  -- storage path once Supabase Storage is wired up
  internal_notes  jsonb not null default '[]'::jsonb,
  feedback        jsonb,  -- { rating: number, comment: string }
  -- 'personal': only the filer's own flat and complaint managers see it.
  -- 'community': every authenticated society member sees it - a broken
  -- lift, a common-area leak, anything more than one flat cares about.
  -- Enforced below in complaints_select, not just filtered in the UI.
  visibility      text not null default 'personal' check (visibility in ('personal', 'community')),
  created_at      timestamptz not null default now()
);

-- Full history of status changes. Kept as its own table (not jsonb on
-- complaints) so RLS can hide internal-only entries from residents if
-- that's ever needed, and so it's queryable ("how long do urgent
-- complaints take to close on average").
create table complaint_timeline (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  status       text not null check (status in ('new', 'assigned', 'inprogress', 'done', 'closed')),
  note         text,
  by_name      text not null,
  created_at   timestamptz not null default now()
);

create table notices (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  title        text not null,
  body         text not null,
  date         date not null default current_date,
  category     text not null,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now()
);

create table documents (
  id             uuid primary key default gen_random_uuid(),
  society_id     uuid not null references societies(id) on delete cascade,
  name           text not null,
  folder         text not null,
  permission     text not null check (permission in ('public', 'committee', 'accountant', 'admin')),
  date           date not null default current_date,
  size_label     text not null default '',
  storage_path   text,  -- Supabase Storage object path once file upload is wired up
  created_at     timestamptz not null default now()
);

create table polls (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references societies(id) on delete cascade,
  question        text not null,
  type            text not null check (type in ('yesno', 'multi')),
  options         jsonb not null,  -- string[]
  status          text not null default 'open' check (status in ('open', 'closed')),
  result_visible  boolean not null default true,
  end_date        date,
  created_at      timestamptz not null default now()
);

-- One row per vote. UNIQUE(poll_id, flat_id) makes double-voting
-- impossible at the database level, unlike the demo's jsonb map.
create table poll_votes (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references polls(id) on delete cascade,
  flat_id      uuid not null references flats(id) on delete cascade,
  option_idx   int not null,
  voted_at     timestamptz not null default now(),
  unique (poll_id, flat_id)
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  name         text not null,
  type         text not null,
  date         date not null,
  note         text,
  created_at   timestamptz not null default now()
);

create table event_contributions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  flat_id    uuid not null references flats(id) on delete cascade,
  amount     numeric not null,
  date       date not null default current_date,
  unique (event_id, flat_id)
);

create table event_volunteers (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  name       text not null,
  joined_at  timestamptz not null default now(),
  unique (event_id, name)
);

create table event_expenses (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  label      text not null,
  amount     numeric not null
);

create table vehicles (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  flat_id      uuid not null references flats(id) on delete cascade,
  kind         text not null check (kind in ('2W', '4W')),
  number       text not null,
  slot         text not null,
  owner_type   text not null default 'owner',
  created_at   timestamptz not null default now()
);

create table contacts (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  name         text not null,
  role         text not null default '',
  phone        text not null,
  category     text not null check (category in ('committee', 'emergency', 'service'))
);

create table adjustments (
  id           uuid primary key default gen_random_uuid(),
  society_id   uuid not null references societies(id) on delete cascade,
  date         date not null default current_date,
  flat_id      uuid references flats(id) on delete set null,
  amount       numeric not null,
  type         text not null check (type in ('credit', 'debit')),
  reason       text not null,
  created_at   timestamptz not null default now()
);

-- Platform owner's manual subscription billing tracker, one row per
-- society per period. No payment gateway - see docs/PRANGAN_ONE_ROADMAP.md
-- section 8. expected_amount defaults to flat_count * 10 but is editable,
-- which is what lets the owner offer a founding rate or discount without
-- any code change.
create table platform_billing (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null references societies(id) on delete cascade,
  period_month    text not null,  -- 'YYYY-MM'
  flat_count      int not null default 0,
  rate_per_flat   numeric not null default 10,
  expected_amount numeric not null default 0,
  received_amount numeric not null default 0,
  payment_date    date,
  mode            text check (mode in ('cash', 'upi', 'cheque', 'bank')),
  status          text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'waived')),
  internal_note   text,
  unique (society_id, period_month)
);

-- Public website lead capture. No society_id yet - a lead is pre-society,
-- the owner creates the actual society afterward if it converts.
create table public_leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null,
  email         text not null,
  society_name  text not null,
  city          text not null default '',
  flat_count    int not null default 0,
  role          text not null default '',
  main_need     text not null default '',
  message       text,
  status        text not null default 'new' check (status in ('new', 'contacted', 'converted', 'closed')),
  internal_note text,
  created_at    timestamptz not null default now()
);

-- General-purpose rate limiting, used by the public lead form and /join
-- (see enforce_public_leads_rate_limit and submit_join_request below) -
-- both are reachable by someone with no account at all, and neither had
-- any limit on repeated attempts before this. This won't stop a
-- determined attacker rotating through different email addresses, but it
-- meaningfully raises the cost of hammering either endpoint, which is the
-- realistic bar for something enforced at the database level alone.
create table rate_limit_attempts (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null,  -- e.g. 'lead:someone@example.com' or 'join:someone@example.com'
  attempted_at timestamptz not null default now()
);
create index rate_limit_attempts_bucket_idx on rate_limit_attempts (bucket, attempted_at);
-- Deliberately no policies at all - RLS enabled with zero grants means
-- deny-by-default for every client role, authenticated or anon. Nobody
-- should ever read or write this table directly; it exists purely as
-- private.check_rate_limit's own bookkeeping. That function still works
-- normally despite this, since a security-definer function runs as its
-- own owner (the table's owner), and RLS doesn't apply to a table's
-- owner unless FORCE ROW LEVEL SECURITY is also set, which this
-- deliberately isn't. Was found missing entirely across two independent
-- reviews before being caught here - every other table in this schema
-- already had this, this one alone didn't, and it was the one whose
-- whole job is stopping abuse.
alter table rate_limit_attempts enable row level security;

-- An email that was typed at /login, verified via a real magic-link click,
-- and matched no membership anywhere on the platform - see
-- AuthCallback.tsx and NoAccess.tsx. Deliberately just the email and
-- when, nothing else, and kept separate from public_leads: this is a
-- product-usage signal (someone genuinely tried to get in), not
-- something the person agreed to being contacted about, see the owner
-- console's read of this table for the "convert to a lead" step that
-- asks permission before treating it as one.
create table unmatched_login_attempts (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now()
);

-- General audit trail for financial and administrative changes that need
-- a permanent record (subscription status changes, receipt cancellations,
-- etc). Deliberately generic (action + detail as text) rather than a
-- rigid schema per action type, since the set of auditable actions will
-- grow over time and none of them need to be queried structurally yet.
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references societies(id) on delete cascade,
  actor       text not null,
  action      text not null,
  detail      text not null default '',
  created_at  timestamptz not null default now()
);

-- Owner "view as" support sessions. Every entry into a society as its
-- admin gets logged here. Support is read-only now: the "write-capable"
-- / act-as-admin variant was removed from the product entirely, so
-- open_support_session and the enforce_impersonation_log_insert trigger
-- (both below) pin every new session to mode 'readonly'. The check below
-- still permits 'write' for one reason only - historical rows written
-- before that change stay valid and readable; no new 'write' row is ever
-- created through the application path.
create table impersonation_logs (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references societies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  mode        text not null check (mode in ('readonly', 'write')),
  reason      text,  -- kept nullable: a readonly "just looking" entry legitimately has none. Older write-mode rows carried a reason from the application layer (see ImpersonationLog in types.ts); no new write-mode rows are created now
  entered_at  timestamptz not null default now(),
  exited_at   timestamptz
);

-- -----------------------------------------------------------------
-- Helper functions (used inside RLS policies below)
-- -----------------------------------------------------------------
-- Living in a schema of their own, not public. PostgREST auto-exposes
-- every function in public as a callable POST /rpc/{name} endpoint the
-- moment the calling role has EXECUTE on it - true regardless of
-- whether that function was ever meant to be called directly. These
-- were never meant to be: has_role, for instance, would let anyone
-- probe "does user X hold role Y in society Z" for an arbitrary
-- society they have no other access to, one RPC call at a time.
-- private isn't in PostgREST's exposed-schema list, so nothing here is
-- reachable as an API endpoint at all - RLS policy evaluation can still
-- reach it directly (Postgres doesn't restrict cross-schema references
-- inside a policy expression, only the role's own privileges matter),
-- with an explicit grant below since policy evaluation runs as the
-- querying role itself, not as any function's owner.
create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- Is the current auth user a member of this society, in any role?
create or replace function private.is_society_member(target_society uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships m
    where m.society_id = target_society
      and m.user_id = auth.uid()
  );
$$;

-- Does the current auth user hold one of the given roles in this society?
create or replace function private.has_role(target_society uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.role = any(roles)
      -- a real per-society membership matching target_society, OR a
      -- global owner row (society_id null) - only reachable if 'owner'
      -- is actually in the roles array being asked about, since m.role =
      -- any(roles) above already requires that; this never lets an owner
      -- row satisfy a check for some other role like 'accountant'.
      and (m.society_id = target_society or (m.role = 'owner' and m.society_id is null))
  );
$$;

-- Which flat_id does the current auth user belong to, in this society?
-- (residents only have one; committee/accountant roles return null)
create or replace function private.my_flat_id(target_society uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select m.flat_id from memberships m
  where m.society_id = target_society
    and m.user_id = auth.uid()
  limit 1;
$$;

-- Is the current user a tenant (resident_tenant role) for this society?
create or replace function private.is_tenant(target_society uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships m
    where m.society_id = target_society
      and m.user_id = auth.uid()
      and m.role = 'resident_tenant'
  );
$$;

-- The write-guard rule (mirrors src/lib/subscription.ts::canWrite and
-- ::effectiveStatus exactly): trial, active, and grace allow writes;
-- paused and archived don't. Grace past 14 days from grace_started_at
-- reads as paused. A trial past 90 days from trial_started_at reads as
-- grace (getting the same 14-day soft landing a lapsed paid subscription
-- gets), or paused if even that window has also elapsed. All computed
-- here the same way the frontend computes it, no scheduled job needed.
-- The owner role is never blocked - owner writes always pass regardless
-- of status.
create or replace function private.can_write(target_society uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  s record;
begin
  if private.has_role(target_society, array['owner']) then
    return true;
  end if;

  select subscription_status, grace_started_at, trial_started_at into s
  from societies where id = target_society;

  if s.subscription_status = 'active' then
    return true;
  end if;

  if s.subscription_status = 'trial' then
    if s.trial_started_at is null then
      return true;
    end if;
    if (now() - s.trial_started_at) <= interval '90 days' then
      return true;
    end if;
    -- trial has ended: the same 14-day grace window a lapsed paid
    -- subscription gets, anchored to when the trial ended instead of an
    -- explicit grace_started_at write
    return (now() - s.trial_started_at) <= interval '104 days'; -- 90 + 14
  end if;

  if s.subscription_status = 'grace' then
    if s.grace_started_at is null then
      return true;
    end if;
    return (now() - s.grace_started_at) <= interval '14 days';
  end if;

  return false; -- paused or archived
end;
$$;

-- Decides active vs pending for a resident self-enrollment (/join) -
-- SERVER-SIDE, deliberately never trusting whatever `status` the client
-- tried to insert. A privileged inviter (committee/admin/owner adding a
-- member from the admin console, already a vetted human decision) passes
-- through untouched. Anyone else attempting an insert only ever gets a
-- resident role, and only ever gets 'active' if the phone they gave
-- matches what's already on file for that flat - matched on the last 10
-- digits only, so +91/spaces/dashes formatting differences don't matter,
-- mirroring the same normalize() logic in src/lib/store.tsx's
-- selfEnrollResident(), which this function is the real-database version
-- of. See the memberships_insert policy below for the matching RLS side.
--
-- Important: this checks session_user, not just auth.uid()/private.has_role(),
-- and that's deliberate, not redundant. A direct SQL editor session (used
-- to manually bootstrap the very first owner/admin membership, since
-- nothing privileged exists yet to grant it through the app) and a
-- genuinely anonymous public /join submission both have auth.uid() = null
-- - there's no JWT in either case. The only real difference is *which
-- Postgres role* the connection is using: 'postgres'/'service_role' for a
-- direct/trusted connection, 'anon'/'authenticated' for anything that
-- came through Supabase's public API. Checking private.has_role() alone would
-- have blocked the exact manual bootstrap step this project's own setup
-- instructions rely on. Using session_user specifically, not current_user
-- - this function is security definer, so current_user inside it would
-- report the function's OWNER, not whoever actually opened the
-- connection; session_user isn't affected by that switch.
-- Narrow public profile for /s/:slug (ShareLink.tsx) - a visitor isn't a
-- member of anything yet, so societies_select (below) staying member-only
-- means the raw table is unreachable to them, on purpose. Broadening that
-- policy to "select true" (an earlier version of this fix) let anyone
-- list every society's join_code, subscription_status, plan,
-- grace_started_at in one query - business-sensitive fields that have
-- nothing to do with a public share link. This function returns only
-- what a share link actually needs to display, for one specific slug at
-- a time, never the whole table.
create or replace function find_society_public_profile(target_slug text)
returns table (society_id uuid, name text, name_en text, address text, city text, area text, theme_key text, logo_url text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name, name_en, address, city, area, theme_key, logo_url
  from societies
  where slug = target_slug
  limit 1;
$$;

-- Narrow lookup for /join: resolves a join code to a society id, nothing
-- else. Same reasoning as above - the code is meant to be handed out by
-- the committee (WhatsApp, notice board), not discoverable by browsing
-- every society's data, and the caller doesn't need anything about the
-- society beyond "does this code correspond to a real one."
create or replace function private.find_society_id_by_join_code(target_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from societies where join_code = target_code limit 1;
$$;

-- Narrow, deliberately limited lookup for /join: resolves a flat NUMBER
-- to its id within one society, nothing else. flats_select (below) stays
-- member-only on purpose, since a flat row includes owner_name, phone,
-- and tenant_name/email - broadening that SELECT policy so an anonymous
-- /join visitor could look up a flat would leak every resident's contact
-- details to anyone who knows or guesses a join code and a flat number.
-- This function is the safe alternative: it runs as security definer
-- (so it can read flats internally despite the caller having no SELECT
-- access), and returns only an opaque id, never the row itself.
create or replace function private.find_flat_for_join(target_society uuid, target_flat_number text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from flats
  where society_id = target_society
    and lower(trim(number)) = lower(trim(target_flat_number))
  limit 1;
$$;

-- societies_update (below) lets society_admin update their own society's
-- row - name, address, maintenance amount, branding, that kind of thing,
-- all fine for them to change. But row-level security only restricts
-- which ROWS someone can touch, not which COLUMNS within an allowed row -
-- so without this, a society_admin could, via a direct API call bypassing
-- the app's own UI entirely, set their own subscription_status to
-- 'active', raise their own flats_limit, or change their own plan. Those
-- specifically have to stay owner-only, since they're the actual
-- business terms of the subscription, not something a customer sets for
-- themselves. receipt_seq is deliberately NOT on this list - that one
-- gets incremented by ordinary payment recording, which society_admin
-- and accountant both legitimately do.

-- Records an attempt against `bucket` and returns whether it's allowed,
-- given no more than p_max_attempts within p_window. Called from a
-- trigger for public_leads and directly inside submit_join_request - both
-- are reachable with no account at all, so neither can be gated by role
-- the way everything else in this file is.
create or replace function private.check_rate_limit(p_bucket text, p_max_attempts int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  delete from rate_limit_attempts where bucket = p_bucket and attempted_at < now() - p_window;
  select count(*) into recent_count from rate_limit_attempts where bucket = p_bucket and attempted_at > now() - p_window;
  if recent_count >= p_max_attempts then
    return false;
  end if;
  insert into rate_limit_attempts (bucket, attempted_at) values (p_bucket, now());
  return true;
end;
$$;

-- The public lead form (Contact.tsx) had no limit at all on repeated
-- submissions before this - anyone could script a flood of fake leads.
-- Skips the check entirely for a direct/service connection, same
-- reasoning as enforce_societies_update above.
create or replace function private.enforce_public_leads_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  if not private.check_rate_limit('lead:' || lower(trim(new.email)), 3, interval '1 hour') then
    raise exception 'too many submissions from this email recently, please try again later';
  end if;
  return new;
end;
$$;

-- The one place audit_logs_insert's own permission tightening (see that
-- policy, above) still isn't enough on its own: it stops a random
-- unrelated caller from writing an entry, but it still trusts whoever
-- IS a real society_admin/accountant/owner to have logged honestly and
-- completely. This trigger removes that trust requirement for the single
-- most sensitive audited action in the whole schema - cancelling a
-- receipt reverses real money, and now generates its own audit row
-- automatically from the actual data change, not from the application
-- remembering to insert one. Even a caller with a legitimate reason to
-- update this row cannot cancel a receipt without this firing.
-- Returns vote counts per option for a poll, never individual rows - the
-- app needs to show results (when a poll allows it) without exposing who
-- voted for what, which poll_votes_select itself deliberately doesn't
-- allow an ordinary member to see beyond their own row. security definer
-- lets this safely aggregate across every vote while still respecting
-- who's allowed to see results at all: management always can, an
-- ordinary member only when the poll's own result_visible says so.
-- Returns nothing (not an error) for a poll the caller can't see results
-- for, or doesn't belong to their society - matches how RLS itself
-- behaves elsewhere in this file, silence instead of an error.
create or replace function poll_results(target_poll uuid)
returns table(option_idx int, vote_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  target_society uuid;
  can_see_results boolean;
begin
  select p.society_id, (p.result_visible or private.has_role(p.society_id, array['owner', 'society_admin', 'committee_member']))
    into target_society, can_see_results
  from polls p where p.id = target_poll;

  if target_society is null or not private.is_society_member(target_society) or not can_see_results then
    return;
  end if;

  return query
    select pv.option_idx, count(*) from poll_votes pv where pv.poll_id = target_poll group by pv.option_idx;
end;
$$;

create or replace function private.audit_payment_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cancelled = true and (old.cancelled is distinct from true) then
    insert into audit_logs (society_id, actor, action, detail)
    values (
      new.society_id,
      coalesce(auth.jwt() ->> 'email', session_user),
      'receipt_cancelled',
      'Receipt ' || coalesce(new.receipt_no, new.id::text) || ' cancelled: ' || coalesce(new.cancel_reason, 'no reason given')
    );
  end if;
  return new;
end;
$$;

create or replace function private.enforce_societies_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user in ('postgres', 'service_role', 'supabase_admin') or private.has_role(new.id, array['owner']) then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.flats_limit is distinct from old.flats_limit
     or new.grace_started_at is distinct from old.grace_started_at
     or new.trial_started_at is distinct from old.trial_started_at then
    raise exception 'only the platform owner can change plan, subscription status, flat limit, grace, or trial dates';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_membership_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flat_row flats;
  society_row societies;
begin
  if session_user in ('postgres', 'service_role', 'supabase_admin')
     or private.has_role(new.society_id, array['owner', 'society_admin', 'committee_member']) then
    return new;
  end if;

  if new.role not in ('resident_owner', 'resident_tenant') then
    raise exception 'self-enrollment can only create a resident membership';
  end if;
  if new.flat_id is null then
    raise exception 'self-enrollment requires a flat_id';
  end if;

  select * into flat_row from flats where id = new.flat_id and society_id = new.society_id;
  if flat_row is null then
    raise exception 'flat not found in this society';
  end if;

  -- The client submitting a self-enrollment can't actually know whether
  -- a flat is owner- or tenant-occupied - flats_select is member-only,
  -- so an anonymous /join request has no way to read that first. Derive
  -- it here instead of trusting whatever role the client guessed at.
  new.role := case when flat_row.occupancy = 'tenant' then 'resident_tenant' else 'resident_owner' end;

  -- Tenant access is a per-society setting the committee controls -
  -- checked here, server-side, rather than trusting a client that
  -- already decided which role to submit. A disabled setting blocks a
  -- tenant self-enrollment outright, no pending state, nothing to approve.
  if new.role = 'resident_tenant' then
    select * into society_row from societies where id = new.society_id;
    if society_row.tenant_access = 'disabled' then
      raise exception 'tenant access is disabled for this society';
    end if;
  end if;

  new.user_id := null; -- never let a self-enrollment insert claim a user_id directly

  -- Match on the pre-loaded EMAIL on file for this flat, not the phone
  -- number. A phone number is not a secret - a neighbour, a former
  -- tenant, or anyone who has seen a WhatsApp group could know a
  -- resident's number. Matching on it would let someone enter THEIR OWN
  -- email alongside someone else's known phone number and get instant
  -- active access, with the real login link going to the attacker's
  -- inbox, not the actual resident's. Email is the actual credential
  -- being granted here, so that is what has to match what the committee
  -- already put on file, not phone. Mirrors the identical fix in
  -- selfEnrollResident() in src/lib/store.tsx.
  new.status := case
    when new.role = 'resident_tenant' and flat_row.tenant_email is not null
         and lower(trim(flat_row.tenant_email)) = lower(trim(coalesce(new.email, ''))) then 'active'
    when new.role = 'resident_owner' and flat_row.email is not null
         and lower(trim(flat_row.email)) = lower(trim(coalesce(new.email, ''))) then 'active'
    else 'pending'
  end;

  return new;
end;
$$;

-- The actual fix for the receipt-collision risk two independent reviews
-- both found real: this used to be computed client-side from a cached
-- number and never written back at all, so a refresh or two people
-- issuing receipts around the same time could genuinely produce the
-- same number. "select ... for update" locks the society row for the
-- rest of this transaction - if two calls for the same society arrive
-- at the same instant, the second one genuinely waits for the first to
-- finish and commit before it can even read the counter, so it always
-- sees the already-incremented value, never the same one the first call
-- saw. Security definer specifically so an accountant (who can record
-- payments per payments_insert/payments_update below, but isn't allowed
-- to update societies directly per societies_update above) can still
-- safely increment this one specific counter - the actual "who can
-- record a payment" decision still happens entirely in the ordinary,
-- unchanged RLS policies on payments and bills, this function only ever
-- touches receipt_seq, nothing else on the society row.
create or replace function private.allocate_receipt_no(target_society uuid, p_year text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_seq int;
begin
  select receipt_prefix, receipt_seq into v_prefix, v_seq
  from societies where id = target_society
  for update;

  if v_prefix is null then
    raise exception 'society % not found', target_society;
  end if;

  update societies set receipt_seq = receipt_seq + 1 where id = target_society;

  return v_prefix || '-' || p_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- The actual database-level enforcement behind read-only support mode -
-- without this, the owner's own existing blanket write access (needed
-- for real, legitimate owner actions like onboarding a new society)
-- would still let a write through to any society at the database level
-- regardless of what the client app enforces, since RLS has no inherent
-- concept of "the UI is currently showing a support-mode banner." Reuses
-- impersonation_logs - the same real, already-audited table every
-- support session already writes a row to - as the actual source of
-- truth: this specific owner, this specific society, entered_at set,
-- exited_at still null. A currently-active support session blocks even
-- the owner's own blanket write access for that one society, at the
-- database level, not just in what buttons the UI happens to show.
-- Also time-bound, not just exit-bound: a session nobody ever explicitly
-- exits (a closed browser tab, a forgotten "exit" click) shouldn't leave
-- the owner's own write access blocked for that society forever - four
-- hours is generous for a genuine support session, without leaving
-- things stuck indefinitely if it's simply forgotten.
create or replace function private.owner_in_readonly_support(target_society uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from impersonation_logs
    where society_id = target_society
      and owner_user_id = auth.uid()
      and exited_at is null
      and entered_at > now() - interval '4 hours'
  );
$$;

-- One shared helper for "this owner may write to this society right now", so
-- the owner-write condition lives in exactly one place instead of being
-- copied, slightly differently, into every insert/update policy below. It is
-- the owner role AND not currently inside a read-only support session for
-- this society. Every policy that lets the owner write goes through this, so
-- one policy can't quietly drift from the others on what "owner can write"
-- actually means - which is exactly how the storage policies and a few
-- table policies ended up without the support-mode check at all before this.
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

-- Sets owner_user_id on a new support-session row from auth.uid() itself,
-- server-side, and forces every new session to mode 'readonly'. This is the
-- actual root-cause fix. The real application code path used to insert a row
-- without owner_user_id at all, and since that column is nullable and NULL
-- never equals anything in SQL, owner_in_readonly_support above (which
-- matches owner_user_id = auth.uid()) never matched a single real session -
-- so the database-level safeguard never once activated for a real support
-- session, even though the policy logic itself was correct. Now the identity
-- is taken from the authenticated user directly, never from anything the
-- browser sends, so it can't be wrong or forged.
--
-- A direct/trusted connection (postgres/service_role, used for the manual
-- owner bootstrap, migrations, and backfilling historical rows) is left
-- alone, exactly like the other enforce_* triggers in this file, so an
-- explicit historical row - including an old mode = 'write' one - can still
-- be written directly when that is genuinely what's intended. Write mode is
-- gone from the product: historical 'write' rows already in the table stay
-- valid and readable, only brand-new sessions are pinned to readonly.
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

-- Every function above still has Postgres's own default EXECUTE-to-PUBLIC
-- privilege at this point, same as any newly created function - moving
-- them into their own schema only stops PostgREST from exposing them as
-- API endpoints, it doesn't touch the underlying Postgres grant. This is
-- the actual, verified fix for that: confirmed directly, by creating a
-- role, applying this exact schema, and testing that a direct call as
-- that role is genuinely refused after this line runs - not assumed
-- from the statement's syntax alone.
revoke execute on all functions in schema private from public;
grant execute on function
  private.is_society_member(uuid), private.has_role(uuid, text[]), private.my_flat_id(uuid),
  private.is_tenant(uuid), private.can_write(uuid), private.allocate_receipt_no(uuid, text),
  private.owner_in_readonly_support(uuid), private.owner_can_write(uuid)
  to authenticated;

-- The real, callable entry point for /join (src/lib/auth.ts's
-- submitJoinRequest). Doing the insert directly from the client and then
-- trying to select the row back would hit the same wall a real committee
-- member's own membership row would: memberships_select only lets you
-- see rows where you're already a society member, which an anonymous
-- self-enrollment never is. Wrapping the whole thing here means the
-- INSERT ... RETURNING happens inside this function's own elevated
-- privileges, no separate SELECT needed at all. Note this does NOT bypass
-- enforce_membership_insert's own restrictions - session_user isn't
-- affected by security definer, so the trigger still correctly sees the
-- real caller (anon/authenticated) and still fully applies the
-- role-derivation, tenant-access, and email-match rules exactly as if
-- the insert had come directly from the client.
create or replace function submit_join_request(target_join_code text, target_flat_number text, given_name text, given_phone text, given_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_society uuid;
  resolved_flat uuid;
  new_status text;
begin
  -- Checked first, before any lookup - a brute-force attempt against
  -- different join codes or flat numbers using the same email gets
  -- stopped here regardless of what it's actually trying.
  if not private.check_rate_limit('join:' || lower(trim(given_email)), 5, interval '1 hour') then
    raise exception using errcode = 'P0003', message = 'rate_limited';
  end if;

  resolved_society := private.find_society_id_by_join_code(target_join_code);
  if resolved_society is null then
    raise exception using errcode = 'P0001', message = 'society_not_found';
  end if;

  resolved_flat := private.find_flat_for_join(resolved_society, target_flat_number);
  if resolved_flat is null then
    raise exception using errcode = 'P0002', message = 'flat_not_found';
  end if;

  insert into memberships (email, society_id, flat_id, role, phone, name)
  values (lower(trim(given_email)), resolved_society, resolved_flat, 'resident_owner', given_phone, given_name)
  returning status into new_status;

  return new_status;
end;
$$;

-- The real, callable entry point for the owner opening a support session
-- (src/lib/realData.ts's insertImpersonationLogReal, called from
-- enterSociety in src/lib/store.tsx). The client used to do a raw insert
-- that never set owner_user_id, which is the whole bug this fix exists for.
-- This runs as security definer and takes the owner identity from auth.uid()
-- directly, so who the owner is is decided by the database from the real
-- authenticated session, never from a value the browser chose. Only an
-- authenticated user actually holding the owner role can open one, and every
-- session it opens is readonly - write mode is gone from the product. The
-- before-insert trigger re-applies both of those server-side too, so even a
-- raw insert that skipped this function can't reintroduce a null owner or a
-- write-mode session. Returns the whole created row so the caller can
-- confirm a real record actually came back before switching the UI into the
-- society's read-only view, instead of switching optimistically and hoping
-- the write landed.
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

-- The matching close for a support session (exitImpersonationLogReal, called
-- from exitImpersonation in src/lib/store.tsx). Confirms the row is really
-- this owner's own open session before closing it, so exit is a genuine,
-- checked database update the caller can wait on and confirm, not
-- fire-and-forget. Safe to call again on a retry: a session already closed
-- just reports success with the row as-is rather than erroring, the same
-- idempotent discipline every other real write in this app already follows.
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
-- Triggers
-- -----------------------------------------------------------------
-- Placed here specifically because this is the first point in the file
-- where both memberships (Core tables, above) and enforce_membership_insert
-- (Helper functions, just above) actually exist. Don't move this next to
-- the memberships table definition - the function it references isn't
-- defined until later in the file, and it would fail exactly the way the
-- language-sql functions failed before Core tables was moved ahead of
-- Helper functions, see the note at the top of this file.
create trigger memberships_enforce_insert
  before insert on memberships
  for each row execute function private.enforce_membership_insert();

create trigger societies_enforce_update
  before update on societies
  for each row execute function private.enforce_societies_update();

create trigger public_leads_enforce_rate_limit
  before insert on public_leads
  for each row execute function private.enforce_public_leads_rate_limit();

create trigger payments_audit_cancellation
  after update on payments
  for each row execute function private.audit_payment_cancellation();

-- Forces owner_user_id and readonly mode on every new support-session row,
-- no matter which code path inserted it (the open_support_session RPC, or a
-- raw insert). See private.enforce_impersonation_log_insert above for why
-- this is the root-cause fix and not a client-side patch.
create trigger impersonation_logs_enforce_insert
  before insert on impersonation_logs
  for each row execute function private.enforce_impersonation_log_insert();

-- -----------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------
-- society_id is the first filter on nearly every query, so it's
-- indexed everywhere. A few tables get a second composite index for
-- their most common query pattern (monthly billing, monthly income).

create index idx_flats_society on flats (society_id);
create index idx_bills_society on bills (society_id);
create index idx_bills_society_month on bills (society_id, month);
create index idx_bills_flat on bills (flat_id);
create index idx_payments_society on payments (society_id);
create index idx_payments_society_date on payments (society_id, date);
create index idx_payments_flat on payments (flat_id);
create index idx_payments_bill on payments (bill_id);
create index idx_payments_pending on payments (society_id, status) where status = 'pending_confirmation';
create index idx_expenses_society on expenses (society_id);
create index idx_expenses_society_date on expenses (society_id, date);
create index idx_expenses_vendor on expenses (vendor_id);
create index idx_vendors_society on vendors (society_id);
create index idx_complaints_society on complaints (society_id);
create index idx_complaints_flat on complaints (flat_id);
create index idx_complaint_timeline_complaint on complaint_timeline (complaint_id);
create index idx_notices_society on notices (society_id);
create index idx_documents_society on documents (society_id);
create index idx_polls_society on polls (society_id);
create index idx_poll_votes_poll on poll_votes (poll_id);
create index idx_events_society on events (society_id);
create index idx_event_contributions_event on event_contributions (event_id);
create index idx_event_volunteers_event on event_volunteers (event_id);
create index idx_event_expenses_event on event_expenses (event_id);
create index idx_vehicles_society on vehicles (society_id);
create index idx_vehicles_flat on vehicles (flat_id);
create index idx_contacts_society on contacts (society_id);
create index idx_adjustments_society on adjustments (society_id);
create index idx_memberships_user on memberships (user_id);
create index idx_memberships_society on memberships (society_id);
create index idx_memberships_email on memberships (email);
create index idx_platform_billing_society on platform_billing (society_id);
create index idx_public_leads_status on public_leads (status);
create index idx_audit_logs_society on audit_logs (society_id, created_at desc);
create index idx_impersonation_logs_society on impersonation_logs (society_id, entered_at desc);

-- -----------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------
-- Deny by default (RLS enabled, no policy = no access), then grant
-- narrowly. This mirrors src/lib/permissions.ts, which shapes the UI
-- today but enforces nothing - this is where enforcement actually
-- happens once Supabase is connected. Every insert/update policy below
-- that represents a normal write also checks private.can_write(society_id), so
-- a paused or archived society cannot write even if the role would
-- otherwise allow it (owner writes are exempted inside can_write itself).

alter table societies enable row level security;
alter table memberships enable row level security;
alter table flats enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table vendors enable row level security;
alter table complaints enable row level security;
alter table complaint_timeline enable row level security;
alter table notices enable row level security;
alter table documents enable row level security;
alter table polls enable row level security;
alter table poll_votes enable row level security;
alter table events enable row level security;
alter table event_contributions enable row level security;
alter table event_volunteers enable row level security;
alter table event_expenses enable row level security;
alter table vehicles enable row level security;
alter table contacts enable row level security;
alter table adjustments enable row level security;
alter table platform_billing enable row level security;
alter table public_leads enable row level security;
alter table unmatched_login_attempts enable row level security;
alter table audit_logs enable row level security;
alter table impersonation_logs enable row level security;

-- societies: member/owner only. /s/:slug and /join don't need this at
-- all anymore - find_society_public_profile() and
-- private.find_society_id_by_join_code() above cover both, without exposing
-- join_code, subscription_status, plan, or anything else business-
-- sensitive to someone who isn't a member of anything yet.
-- Previously missing entirely - RLS is enabled on this table (see below),
-- so with no insert policy at all, literally no one could create a new
-- society through the real database, not even the owner. Only the owner
-- ever creates a society (see Onboarding.tsx, owner-console-only).
create policy societies_insert on societies for insert
  with check (private.has_role(id, array['owner']));
create policy societies_select on societies for select
  using (private.is_society_member(id) or private.has_role(id, array['owner']));
-- Owner is its own branch here, not lumped in with society_admin, so a
-- read-only support session actually blocks the owner from editing the
-- society's own row (name, branding, maintenance amount) during support -
-- the combined array['society_admin', 'owner'] form it used to have never
-- checked owner_in_readonly_support at all. society_admin's own access is
-- unchanged. The enforce_societies_update trigger still separately stops a
-- society_admin from touching plan/subscription/limit columns.
create policy societies_update on societies for update
  using (private.has_role(id, array['society_admin']) or private.owner_can_write(id));

-- memberships: members can see who else is in their society (for the
-- complaint-assignment dropdown, etc); only society_admin/owner manage membership.
-- Every clause here earns its place from something that actually broke:
--   - user_id = auth.uid(): PostgreSQL checks SELECT visibility on BOTH
--     the old and the new row during an UPDATE, not just the UPDATE
--     policy's own USING/CHECK. The subquery-based checks below
--     (is_society_member, has_role) don't reliably see this exact row's
--     own brand-new state within the same statement a claim just wrote
--     it in - a direct column comparison has no such self-reference
--     timing problem, so the claim step (memberships_claim, below)
--     actually completes instead of failing right after doing the
--     update it was supposed to do.
--   - the unclaimed-invite clause: needed for the SAME reason, but for
--     the OLD row state, before anything is claimed - without it, the
--     claim UPDATE can never even find its own target row to begin with.
create policy memberships_select on memberships for select
  using (
    user_id = auth.uid()
    or private.is_society_member(society_id)
    or private.has_role(society_id, array['owner'])
    or (user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
create policy memberships_insert on memberships for insert
  with check (
    private.has_role(society_id, array['society_admin'])
    or private.owner_can_write(society_id)  -- owner as its own branch, so support mode blocks the owner adding members mid-session
    or (role in ('resident_owner', 'resident_tenant') and user_id is null)  -- self-enrollment via /join; enforce_membership_insert trigger decides the real status server-side
  );
-- Claiming your own pending invite on first real login (see
-- claimMemberships in src/lib/auth.ts) - only the row's own email match,
-- only while unclaimed, and only ever to your own auth uid, never someone else's.
-- Claiming your own pending invite on first real login (see
-- claimMemberships in src/lib/auth.ts) - only the row's own email match,
-- only while unclaimed, and only ever to your own auth uid, never someone
-- else's. Uses auth.jwt() rather than querying auth.users directly - the
-- authenticated role has no SELECT grant on that table on a real
-- Supabase project, so a policy that tries to read it fails with a
-- permission error for every real user, not just a silent zero-rows
-- mismatch. auth.jwt() reads the current session's own token claims
-- instead, no table access needed. lower() on both sides since a plain
-- equality here would still silently match zero rows the moment there's
-- any case difference between what's stored in this table and the
-- token's email claim.
create policy memberships_claim on memberships for update
  using (user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (user_id = auth.uid());
-- A committee member/admin/owner approving or otherwise managing
-- memberships in their own society (approveMembership/rejectMembership
-- in src/lib/store.tsx, or any other membership edit from the admin console).
create policy memberships_manage on memberships for update
  using (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id))
  with check (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id));
create policy memberships_delete on memberships for delete
  using (private.has_role(society_id, array['society_admin']) or private.owner_can_write(society_id));

-- flats: any member reads all flats in their society; only society_admin writes
-- flats: management roles see every flat in their society (needed for
-- billing, complaints, member management). A regular resident only sees
-- their OWN flat's row - this table has other people's names, phone
-- numbers, and emails in it, and a resident has no legitimate reason to
-- see a neighbor's contact details just by being in the same society.
-- Previously this used is_society_member alone, which let any resident
-- read every flat's owner_name/phone/email/tenant info society-wide -
-- exactly the leak the product's own privacy requirements call out.
create policy flats_select on flats for select
  using (
    private.has_role(society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
    or id = private.my_flat_id(society_id)
  );
create policy flats_insert on flats for insert
  with check ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));
create policy flats_update on flats for update
  using ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- bills: members read their society's bills; only society_admin generates them
-- bills: management roles see every bill in their society; a resident
-- only sees their own flat's bills, never another flat's amount owed -
-- same reasoning as flats_select above.
create policy bills_select on bills for select
  using (
    private.has_role(society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
    or flat_id = private.my_flat_id(society_id)
  );
create policy bills_insert on bills for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));
create policy bills_update on bills for update
  using ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));  -- paid_amount updates on payment

-- payments: members read their society's payments; accountant+society_admin
-- record them; residents can insert their OWN pending_confirmation "I have
-- paid" rows for their own flat, nothing else
-- payments: same principle as bills_select - management sees everything,
-- a resident only sees their own flat's payment history.
create policy payments_select on payments for select
  using (
    private.has_role(society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
    or flat_id = private.my_flat_id(society_id)
  );
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
create policy payments_update on payments for update
  using ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- Three atomic payment operations, replacing what used to be two or
-- three separate client requests each - the actual fix for both the
-- receipt-collision risk and the non-atomic payment recording two
-- independent reviews found real. Security invoker, deliberately: the
-- ordinary insert/update statements inside each of these are still
-- checked against the exact same payments_insert/payments_update/
-- bills_update policies above, unchanged, so "who can actually do this"
-- is never duplicated or re-implemented here - only receipt-number
-- allocation itself (which genuinely needs to touch a society-level
-- counter an accountant otherwise can't) reaches into the security
-- definer helper above for that one specific step.
--
-- This security-invoker choice is also exactly why these three don't need
-- their own owner support-mode guard: because the insert/update inside them
-- runs as the calling user, it's checked against payments_insert/
-- payments_update/bills_update, which already carry private.owner_can_write.
-- An owner who tried to record or cancel a payment during a read-only
-- support session is stopped by those table policies from inside the
-- function, no separate check here. (allocate_receipt_no is security
-- definer, but it only ever touches receipt_seq and runs before the guarded
-- insert; if that insert is refused, the whole transaction rolls back, so
-- the counter isn't left advanced either.) Were these security definer
-- instead, they'd bypass RLS entirely and would each need their own direct
-- owner_can_write check - they aren't, so they don't.
--
-- All three are check-then-act idempotent, the same discipline every
-- other real write in this app already follows: retrying an already-
-- completed call with the same payment id is always a safe no-op, never
-- a duplicate receipt or a doubled bill update.
create or replace function record_payment_atomic(
  p_id uuid, p_society_id uuid, p_flat_id uuid, p_bill_id uuid, p_date date,
  p_amount numeric, p_mode text, p_ref_no text, p_note text, p_status text
) returns jsonb
language plpgsql
as $$
declare
  v_bill_amount numeric;
  v_bill_paid numeric;
  v_receipt_no text;
  v_overpay numeric := 0;
  v_adjustment_id uuid;
  v_existing record;
begin
  select receipt_no, id into v_existing from payments where id = p_id;
  if found then
    -- Already recorded, most likely a retry after the first attempt's
    -- response never made it back - report what's already there rather
    -- than doing any of this a second time.
    return jsonb_build_object('receipt_no', v_existing.receipt_no, 'overpay_amount', 0, 'already_recorded', true);
  end if;

  if p_status = 'success' and p_bill_id is not null then
    select amount, paid_amount into v_bill_amount, v_bill_paid from bills where id = p_bill_id for update;
  end if;

  if p_status = 'success' then
    v_receipt_no := private.allocate_receipt_no(p_society_id, to_char(p_date, 'YYYY'));
  end if;

  insert into payments (id, society_id, flat_id, bill_id, date, amount, mode, ref_no, receipt_no, status, note)
  values (p_id, p_society_id, p_flat_id, p_bill_id, p_date, p_amount, p_mode, p_ref_no, v_receipt_no, p_status, p_note);

  if p_status = 'success' and p_bill_id is not null then
    -- Same "already what was owed, plus the credit, still capped at the
    -- bill's own amount" shape as recordPayment in store.tsx - v_bill_paid
    -- was read under lock above, so this is the real, current figure,
    -- not a value the client happened to have cached when it built the
    -- request.
    v_overpay := greatest(0, p_amount - greatest(0, v_bill_amount - v_bill_paid));
    update bills set paid_amount = least(v_bill_amount, v_bill_paid + p_amount) where id = p_bill_id;
    if v_overpay > 0 then
      v_adjustment_id := gen_random_uuid();
      insert into adjustments (id, society_id, flat_id, date, amount, type, reason)
      values (v_adjustment_id, p_society_id, p_flat_id, p_date, v_overpay, 'credit',
        'વધારે ચૂકવણી, ' || coalesce(v_receipt_no, 'રસીદ') || ' માંથી ક્રેડિટ તરીકે રાખેલ');
    end if;
  end if;

  return jsonb_build_object('receipt_no', v_receipt_no, 'overpay_amount', v_overpay, 'adjustment_id', v_adjustment_id, 'already_recorded', false);
end;
$$;

create or replace function confirm_pending_payment_atomic(p_payment_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_payment record;
  v_bill_amount numeric;
  v_bill_paid numeric;
  v_receipt_no text;
begin
  select * into v_payment from payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;
  if v_payment.status != 'pending_confirmation' then
    -- Already confirmed (or cancelled, or never pending) - most likely a
    -- retry, report the current state rather than allocating a second,
    -- wasted receipt number and double-applying the bill update.
    return jsonb_build_object('receipt_no', v_payment.receipt_no, 'already_confirmed', true);
  end if;

  if v_payment.bill_id is not null then
    select amount, paid_amount into v_bill_amount, v_bill_paid from bills where id = v_payment.bill_id for update;
  end if;

  v_receipt_no := private.allocate_receipt_no(v_payment.society_id, to_char(v_payment.date, 'YYYY'));
  update payments set status = 'success', receipt_no = v_receipt_no where id = p_payment_id;

  if v_payment.bill_id is not null then
    update bills set paid_amount = least(v_bill_amount, v_bill_paid + v_payment.amount) where id = v_payment.bill_id;
  end if;

  return jsonb_build_object('receipt_no', v_receipt_no, 'already_confirmed', false);
end;
$$;

create or replace function cancel_receipt_atomic(p_payment_id uuid, p_reason text)
returns jsonb
language plpgsql
as $$
declare
  v_payment record;
  v_bill_paid numeric;
begin
  select * into v_payment from payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;
  if v_payment.cancelled then
    -- Already cancelled - a retry, report success without reversing the
    -- bill a second time.
    return jsonb_build_object('already_cancelled', true);
  end if;

  if v_payment.bill_id is not null then
    select paid_amount into v_bill_paid from bills where id = v_payment.bill_id for update;
    update bills set paid_amount = greatest(0, v_bill_paid - v_payment.amount) where id = v_payment.bill_id;
  end if;

  -- payments_audit_cancellation (trigger, defined further below) fires
  -- on this update automatically and writes the real audit log entry -
  -- not duplicated here.
  update payments set cancelled = true, cancel_reason = p_reason where id = p_payment_id;

  return jsonb_build_object('already_cancelled', false);
end;
$$;

-- expenses: members read; accountant+society_admin write
create policy expenses_select on expenses for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy expenses_insert on expenses for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- vendors: members read; society_admin and committee_member write
create policy vendors_select on vendors for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy vendors_insert on vendors for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
create policy vendors_update on vendors for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- complaints: members read their society's complaints; residents can
-- only file a complaint against their OWN flat_id (tenants only if
-- tenant_access is not 'disabled'); society_admin/committee_member update
-- (advance status, assign)
-- complaints: complaint managers see everything in their society; a
-- resident sees their own flat's complaints (any visibility) plus every
-- community-visibility complaint society-wide, but never another flat's
-- personal complaint. This is the real enforcement the roadmap asks for -
-- residents must not receive every row and rely on frontend filtering.
create policy complaints_select on complaints for select
  using (
    private.has_role(society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
    or flat_id = private.my_flat_id(society_id)
    or (visibility = 'community' and private.is_society_member(society_id))
  );
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
create policy complaints_update on complaints for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

create policy complaint_timeline_select on complaint_timeline for select
  using (exists (
    select 1 from complaints c
    where c.id = complaint_timeline.complaint_id
      and (
        private.has_role(c.society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
        or c.flat_id = private.my_flat_id(c.society_id)
        or (c.visibility = 'community' and private.is_society_member(c.society_id))
      )
  ));
-- A resident filing their own complaint needs to create its very first
-- timeline row too (status='new', "you filed this") - previously this
-- policy only allowed management roles, so a real resident's own
-- complaint would insert fine but its initial timeline entry would
-- silently fail. Residents can only ever insert their own flat's 'new'
-- entry specifically, never any other status - that still requires
-- management, so a resident can't inject a fake "resolved" row into
-- their own complaint's history.
create policy complaint_timeline_insert on complaint_timeline for insert
  with check (exists (
    select 1 from complaints c
    where c.id = complaint_timeline.complaint_id
      and (
        (private.has_role(c.society_id, array['society_admin', 'committee_member']) and private.can_write(c.society_id))
        or (complaint_timeline.status = 'new' and c.flat_id = private.my_flat_id(c.society_id))
        or private.owner_can_write(c.society_id)  -- owner branch now respects read-only support mode too
      )
  ));

-- notices: members read; society_admin/committee_member publish
create policy notices_select on notices for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy notices_insert on notices for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
create policy notices_update on notices for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- documents: readable only if the member's role satisfies the document's
-- own permission column, not just society membership, and only if a
-- tenant's access mode allows documents at all (limited mode hides them)
create policy documents_select on documents for select
  using (
    private.has_role(society_id, array['owner'])
    or (
      private.is_society_member(society_id)
      and (not private.is_tenant(society_id) or (select tenant_access from societies where id = documents.society_id) = 'full')
      and (
        permission = 'public'
        or (permission = 'committee' and private.has_role(society_id, array['society_admin', 'committee_member']))
        or (permission = 'accountant' and private.has_role(society_id, array['society_admin', 'accountant']))
        or (permission = 'admin' and private.has_role(society_id, array['society_admin']))
      )
    )
  );
create policy documents_insert on documents for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- polls: members read; society_admin/committee_member create/close
create policy polls_select on polls for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy polls_insert on polls for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));
create policy polls_update on polls for update
  using ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- poll_votes: a resident can insert exactly one row for their own flat
-- (the UNIQUE constraint above blocks a second one); a tenant can only
-- vote if the society's tenant_access is 'full' ("joinPollsEvents" in
-- src/lib/permissions.ts::tenantCapabilities); everyone in the society
-- can read the votes (individual ballots aren't secret from the
-- committee, only the running tally is optionally hidden via
-- polls.result_visible, which the app enforces in the UI)
-- poll_votes: private ballots, not a public tally sheet. A resident can
-- see their own flat's vote (so the UI can show "you already voted for
-- X"), never another flat's - the app's own UI only ever showed
-- aggregated counts anyway (see admin/Polls.tsx), but this table itself
-- had no matching restriction, so anyone could read individual vote rows
-- directly. Management roles still see every vote in their society, for
-- the same reason an election has officials who can audit ballots even
-- when voters can't see each other's.
create policy poll_votes_select on poll_votes for select
  using (
    exists (
      select 1 from polls p where p.id = poll_votes.poll_id
        and (
          private.has_role(p.society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
          or poll_votes.flat_id = private.my_flat_id(p.society_id)
        )
    )
  );
create policy poll_votes_insert on poll_votes for insert
  with check (exists (
    select 1 from polls p
    where p.id = poll_votes.poll_id
      and p.status = 'open'
      and private.can_write(p.society_id)
      and flat_id = private.my_flat_id(p.society_id)
      and (not private.is_tenant(p.society_id) or (select tenant_access from societies where id = p.society_id) = 'full')
  ));

-- events + sub-tables: members read; society_admin/committee_member manage
-- the event itself; any member can add a contribution/volunteer signup
-- for their own flat (tenants only if tenant_access = 'full')
create policy events_select on events for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy events_insert on events for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

create policy event_contributions_select on event_contributions for select
  using (exists (select 1 from events e where e.id = event_id and (private.is_society_member(e.society_id) or private.has_role(e.society_id, array['owner']))));
create policy event_contributions_insert on event_contributions for insert
  with check (exists (
    select 1 from events e where e.id = event_id
      and private.can_write(e.society_id)
      and (
        private.has_role(e.society_id, array['society_admin', 'committee_member'])
        or (flat_id = private.my_flat_id(e.society_id) and (not private.is_tenant(e.society_id) or (select tenant_access from societies where id = e.society_id) = 'full'))
      )
  ));

create policy event_volunteers_select on event_volunteers for select
  using (exists (select 1 from events e where e.id = event_id and (private.is_society_member(e.society_id) or private.has_role(e.society_id, array['owner']))));
create policy event_volunteers_insert on event_volunteers for insert
  with check (exists (select 1 from events e where e.id = event_id and private.is_society_member(e.society_id) and private.can_write(e.society_id)));

create policy event_expenses_select on event_expenses for select
  using (exists (select 1 from events e where e.id = event_id and (private.is_society_member(e.society_id) or private.has_role(e.society_id, array['owner']))));
create policy event_expenses_insert on event_expenses for insert
  with check (exists (select 1 from events e where e.id = event_id and ((private.has_role(e.society_id, array['society_admin', 'committee_member']) and private.can_write(e.society_id)) or private.owner_can_write(e.society_id))));

-- vehicles: members read (tenants only if tenant_access = 'full'); society_admin manages
create policy vehicles_select on vehicles for select
  using (
    private.has_role(society_id, array['owner'])
    or (private.is_society_member(society_id) and (not private.is_tenant(society_id) or (select tenant_access from societies where id = vehicles.society_id) = 'full'))
  );
create policy vehicles_insert on vehicles for insert
  with check ((private.has_role(society_id, array['society_admin', 'committee_member']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- contacts: members read; society_admin manages
create policy contacts_select on contacts for select
  using (private.is_society_member(society_id) or private.has_role(society_id, array['owner']));
create policy contacts_insert on contacts for insert
  with check ((private.has_role(society_id, array['society_admin']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- adjustments: members read; accountant+society_admin write
-- adjustments: management sees everything in their society (including
-- society-wide corrections with no flat_id); a resident only sees
-- adjustments tied to their own flat, same principle as bills/payments.
create policy adjustments_select on adjustments for select
  using (
    private.has_role(society_id, array['owner', 'society_admin', 'accountant'])
    or flat_id = private.my_flat_id(society_id)
  );
create policy adjustments_insert on adjustments for insert
  with check ((private.has_role(society_id, array['society_admin', 'accountant']) and private.can_write(society_id)) or private.owner_can_write(society_id));

-- platform_billing, public_leads, audit_logs, impersonation_logs: owner-only,
-- always, in every direction. These are the platform's own operational
-- records, not a society's data - no society_admin/committee_member/
-- resident should ever see these regardless of subscription status.
create policy platform_billing_all on platform_billing for all
  using (private.has_role(society_id, array['owner']))
  with check (private.has_role(society_id, array['owner']));

create policy public_leads_select on public_leads for select
  using (exists (select 1 from memberships m where m.user_id = auth.uid() and m.role = 'owner'));
create policy public_leads_insert on public_leads for insert
  with check (true);  -- anyone can submit the public lead form, logged-in or not
create policy public_leads_update on public_leads for update
  using (exists (select 1 from memberships m where m.user_id = auth.uid() and m.role = 'owner'));

-- Owner-only reads, same as public_leads. Insert is deliberately open to
-- any authenticated user (AuthCallback.tsx logs one right after a real,
-- verified login resolves to zero memberships) - there's nothing sensitive
-- in the row beyond the email itself, and no update/delete policy at all,
-- so once logged it's an immutable record for the owner to see.
create policy unmatched_login_attempts_select on unmatched_login_attempts for select
  using (exists (select 1 from memberships m where m.user_id = auth.uid() and m.role = 'owner'));
create policy unmatched_login_attempts_insert on unmatched_login_attempts for insert
  with check (auth.uid() is not null);

create policy audit_logs_select on audit_logs for select
  using (private.has_role(society_id, array['owner']) or private.has_role(society_id, array['society_admin']));
-- Tightened from `with check (true)`, which meant literally anyone could
-- insert an audit log entry claiming anything happened. This doesn't make
-- audit logs fully tamper-proof yet - that needs the actions themselves
-- (receipt cancellation, etc) to generate their own audit rows via
-- database triggers, not application code choosing to insert one, which
-- is real, separate, still-pending work. This at least means only a
-- real management-level member of the society being logged about can
-- write an entry, not a random unrelated caller. The owner is split into
-- its own private.owner_can_write branch here rather than lumped into the
-- role array, the same shape every other write policy uses, so a read-only
-- support session cannot write an audit row either - the one case the plain
-- has_role('owner') list missed.
create policy audit_logs_insert on audit_logs for insert
  with check (private.has_role(society_id, array['society_admin', 'accountant']) or private.owner_can_write(society_id));

create policy impersonation_logs_all on impersonation_logs for all
  using (private.has_role(society_id, array['owner']))
  with check (private.has_role(society_id, array['owner']));

-- =================================================================
-- Storage buckets and their RLS policies
-- =================================================================
-- storage.buckets and storage.objects already exist in every Supabase
-- project (part of the Storage extension, not created here). The bucket
-- inserts below were previously a manual dashboard step documented in
-- supabase/README.md; included directly here now so one full schema.sql
-- run sets up everything, buckets included. society-logos is public
-- (logos need to display without auth, e.g. on the public share link
-- page); the other two are private, gated by RLS the same way every
-- other table in this file is.
--
-- Path convention for the two private buckets: the object's path always
-- starts with the id of the row it belongs to - '{complaint_id}/photo.jpg',
-- '{payment_id}/proof.jpg' - so a policy can join back to that owning row
-- via split_part(name, '/', 1) exactly the way every other RLS policy in
-- this file already joins through a foreign key. This means the owning
-- row (the complaint, the payment) has to exist before its file can be
-- uploaded, not the other way around - the app already generates that
-- row's id client-side before inserting it (see realUid() in
-- src/lib/id.ts), so the same id is used for the upload path immediately
-- after, not a placeholder that needs reconciling later.

-- file_size_limit (bytes) and allowed_mime_types are enforced by Storage
-- itself on every upload, so these hold even against a client that skips the
-- app's own checks (src/lib/uploadValidation.ts mirrors these same numbers for
-- immediate feedback - keep the two in step). image/svg+xml is deliberately
-- NOT allowed anywhere: an SVG can carry script, and society-logos is a public
-- bucket rendered in an <img>, so permitting SVG would be a stored-XSS vector.
-- Raster images only; documents additionally allows application/pdf.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('society-logos', 'society-logos', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('complaint-photos', 'complaint-photos', false, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('payment-proof', 'payment-proof', false, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documents', 'documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']) on conflict (id) do nothing;

-- society-logos: the bucket's own public flag means end users reading a
-- logo never go through RLS at all - Supabase serves public bucket
-- objects directly. This select policy exists for a different, easy to
-- miss reason: without ANY select policy on this table, an
-- INSERT/UPDATE...RETURNING (which the upload client relies on to
-- confirm what it just wrote) fails outright, since Postgres checks
-- RETURNING output against SELECT-level RLS same as a real SELECT would
-- - confirmed this directly, an insert with no matching select policy
-- errored on RETURNING even though the insert itself was permitted and
-- actually happened.
--
-- The write policies below (insert/update/delete) split the owner into its
-- own branch through private.owner_can_write, not lumped into one array with
-- society_admin the way they were before this. Storage was a structurally
-- separate part of the schema that the original support-mode work never
-- touched at all, so the owner could change or delete a society's logo
-- during a read-only support session even while every table write was
-- blocked. Now the same one support-mode check gates the owner here too;
-- society_admin's own access is unchanged.
create policy society_logos_select on storage.objects for select
  using (bucket_id = 'society-logos');
create policy society_logos_insert on storage.objects for insert
  with check (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));
create policy society_logos_update on storage.objects for update
  using (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));
create policy society_logos_delete on storage.objects for delete
  using (bucket_id = 'society-logos' and (private.has_role((split_part(name, '/', 1))::uuid, array['society_admin']) or private.owner_can_write((split_part(name, '/', 1))::uuid)));

-- complaint-photos: same visibility rule as the complaint itself
-- (complaints_select) - a personal complaint's photo is as private as
-- the complaint text, a community one's photo is visible society-wide.
create policy complaint_photos_select on storage.objects for select
  using (
    bucket_id = 'complaint-photos'
    and exists (
      select 1 from complaints c where c.id = (split_part(name, '/', 1))::uuid
        and (
          private.has_role(c.society_id, array['owner', 'society_admin', 'committee_member', 'accountant'])
          or c.flat_id = private.my_flat_id(c.society_id)
          or (c.visibility = 'community' and private.is_society_member(c.society_id))
        )
    )
  );
create policy complaint_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'complaint-photos'
    and exists (
      select 1 from complaints c where c.id = (split_part(name, '/', 1))::uuid
        and (private.has_role(c.society_id, array['society_admin', 'committee_member']) or private.owner_can_write(c.society_id) or c.flat_id = private.my_flat_id(c.society_id))
    )
  );

-- payment-proof: only the flat that made the payment and management can
-- ever see it - a resident's UPI screenshot isn't something even a
-- different resident in the same society should be able to browse to.
create policy payment_proof_select on storage.objects for select
  using (
    bucket_id = 'payment-proof'
    and exists (
      select 1 from payments p where p.id = (split_part(name, '/', 1))::uuid
        and (private.has_role(p.society_id, array['owner', 'society_admin', 'accountant']) or p.flat_id = private.my_flat_id(p.society_id))
    )
  );
create policy payment_proof_insert on storage.objects for insert
  with check (
    bucket_id = 'payment-proof'
    and exists (
      select 1 from payments p where p.id = (split_part(name, '/', 1))::uuid
        and (private.has_role(p.society_id, array['society_admin', 'accountant']) or private.owner_can_write(p.society_id) or p.flat_id = private.my_flat_id(p.society_id))
    )
  );

-- documents: the exact same four-tier check documents_select already
-- does on the table row itself (public/committee/accountant/admin, plus
-- the tenant-access gate), just joined through from the storage side.
-- Only society_admin/committee_member can upload, matching
-- documents_insert. A select policy is included from the start this
-- time, not added later - see society_logos_select's comment for why a
-- private bucket needs one even before end users ever read from it
-- directly: without it, the upload itself would fail on its own
-- insert...returning confirmation, the same way logo upload originally did.
-- objects.name is qualified explicitly below, not left bare - documents
-- has its own name column, and an unqualified `name` inside the exists
-- subquery silently resolved to the document's own name (the filename)
-- instead of the storage object's path, since SQL scoping prefers the
-- innermost table when a column name exists on both. Caught this by
-- actually running it against real data, not by reading the policy back.
create policy documents_storage_select on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from documents d where d.id = (split_part(objects.name, '/', 1))::uuid
        and (
          private.has_role(d.society_id, array['owner'])
          or (
            private.is_society_member(d.society_id)
            and (not private.is_tenant(d.society_id) or (select tenant_access from societies where id = d.society_id) = 'full')
            and (
              d.permission = 'public'
              or (d.permission = 'committee' and private.has_role(d.society_id, array['society_admin', 'committee_member']))
              or (d.permission = 'accountant' and private.has_role(d.society_id, array['society_admin', 'accountant']))
              or (d.permission = 'admin' and private.has_role(d.society_id, array['society_admin']))
            )
          )
        )
    )
  );
-- Deliberately no owner branch here, unlike society-logos/complaint-photos/
-- payment-proof above. The owner never had a document-upload path in this
-- policy to begin with (only society_admin/committee_member ever could), so
-- there's nothing for the read-only support guard to attach to - the owner
-- is already blocked here in every mode, by role, not by support state.
-- Checked this one on its own rather than assuming it matched the others'
-- shape: adding an owner branch would be granting a capability the owner
-- doesn't currently have, which is out of scope for a support-mode fix.
create policy documents_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from documents d where d.id = (split_part(objects.name, '/', 1))::uuid
        and private.has_role(d.society_id, array['society_admin', 'committee_member'])
    )
  );

-- =================================================================
-- End of schema. See supabase/README.md for how to apply this.
-- =================================================================


-- Business workspace: partner-led daily money tracking, approvals and cash closing.
-- Kept fully separate from housing-society tables and roles.

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  currency text not null default 'INR' check (currency = 'INR'),
  approval_mode text not null default 'one_partner' check (approval_mode in ('none','one_partner','all_partners')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_partners (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text,
  phone text,
  ownership_percent numeric(6,3) check (ownership_percent is null or (ownership_percent >= 0 and ownership_percent <= 100)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create table if not exists business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  partner_id uuid references business_partners(id) on delete set null,
  email text not null,
  display_name text not null,
  role text not null check (role in ('admin','partner','bookkeeper','viewer')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id)
);

create table if not exists business_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null check (kind in ('cash','bank','upi','wallet','other')),
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists business_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null default 'expense' check (kind in ('income','expense','both')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists business_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('income','expense','partner_capital','partner_advance','personal_expense','reimbursement','withdrawal','transfer','refund','reversal')),
  amount numeric(14,2) not null check (amount > 0),
  account_id uuid references business_accounts(id) on delete restrict,
  to_account_id uuid references business_accounts(id) on delete restrict,
  partner_id uuid references business_partners(id) on delete restrict,
  category_id uuid references business_categories(id) on delete set null,
  counterparty text,
  note text,
  approval_status text not null default 'not_required' check (approval_status in ('not_required','pending','approved','rejected')),
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reversed_transaction_id uuid references business_transactions(id) on delete restrict,
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id)
);

create index if not exists business_transactions_business_occurred_idx on business_transactions (business_id, occurred_at desc);
create index if not exists business_transactions_business_approval_idx on business_transactions (business_id, approval_status, occurred_at desc);

create table if not exists business_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  bucket text not null check (bucket in ('account','partner_capital','partner_due','partner_withdrawal')),
  account_id uuid references business_accounts(id) on delete restrict,
  partner_id uuid references business_partners(id) on delete restrict,
  amount numeric(14,2) not null check (amount <> 0),
  created_at timestamptz not null default now(),
  check (
    (bucket = 'account' and account_id is not null and partner_id is null)
    or (bucket <> 'account' and partner_id is not null and account_id is null)
  )
);

create index if not exists business_ledger_entries_account_idx on business_ledger_entries (business_id, account_id);
create index if not exists business_ledger_entries_partner_idx on business_ledger_entries (business_id, partner_id);

create table if not exists business_transaction_approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved','rejected')),
  note text,
  decided_at timestamptz not null default now(),
  unique (transaction_id, approver_user_id)
);

create table if not exists business_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null references business_transactions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists business_day_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  account_id uuid not null references business_accounts(id) on delete restrict,
  close_date date not null default current_date,
  expected_balance numeric(14,2) not null,
  counted_balance numeric(14,2) not null,
  difference numeric(14,2) not null,
  note text,
  closed_by uuid not null references auth.users(id),
  closed_at timestamptz not null default now(),
  unique (business_id, account_id, close_date)
);

create table if not exists business_activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_activity_logs_business_created_idx on business_activity_logs (business_id, created_at desc);

create or replace function private.is_business_member(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from business_memberships bm
    where bm.business_id = target_business and bm.user_id = auth.uid() and bm.status = 'active'
  )
$$;

create or replace function private.business_role(target_business uuid)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select bm.role from business_memberships bm
  where bm.business_id = target_business and bm.user_id = auth.uid() and bm.status = 'active'
  limit 1
$$;

create or replace function private.can_write_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) in ('admin','partner','bookkeeper'), false)
$$;

create or replace function private.can_admin_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) = 'admin', false)
$$;

create or replace function private.can_approve_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.business_role(target_business) in ('admin','partner'), false)
$$;

alter table businesses enable row level security;
alter table business_partners enable row level security;
alter table business_memberships enable row level security;
alter table business_accounts enable row level security;
alter table business_categories enable row level security;
alter table business_transactions enable row level security;
alter table business_ledger_entries enable row level security;
alter table business_transaction_approvals enable row level security;
alter table business_attachments enable row level security;
alter table business_day_closings enable row level security;
alter table business_activity_logs enable row level security;

create policy businesses_select on businesses for select using (private.is_business_member(id));
create policy businesses_update on businesses for update using (private.can_admin_business(id)) with check (private.can_admin_business(id));
create policy business_partners_select on business_partners for select using (private.is_business_member(business_id));
create policy business_partners_insert on business_partners for insert with check (private.can_admin_business(business_id));
create policy business_partners_update on business_partners for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_memberships_select on business_memberships for select using (private.is_business_member(business_id));
create policy business_memberships_insert on business_memberships for insert with check (private.can_admin_business(business_id));
create policy business_memberships_update on business_memberships for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_accounts_select on business_accounts for select using (private.is_business_member(business_id));
create policy business_accounts_insert on business_accounts for insert with check (private.can_admin_business(business_id));
create policy business_accounts_update on business_accounts for update using (private.can_admin_business(business_id)) with check (private.can_admin_business(business_id));
create policy business_categories_select on business_categories for select using (private.is_business_member(business_id));
create policy business_categories_insert on business_categories for insert with check (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false));
create policy business_categories_update on business_categories for update using (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false)) with check (coalesce(private.business_role(business_id) in ('admin','bookkeeper'), false));
create policy business_transactions_select on business_transactions for select using (private.is_business_member(business_id));
create policy business_ledger_entries_select on business_ledger_entries for select using (private.is_business_member(business_id));
create policy business_transaction_approvals_select on business_transaction_approvals for select using (private.is_business_member(business_id));
create policy business_attachments_select on business_attachments for select using (private.is_business_member(business_id));
create policy business_attachments_insert on business_attachments for insert with check (private.can_write_business(business_id) and uploaded_by = auth.uid());
create policy business_attachments_delete on business_attachments for delete using (private.can_admin_business(business_id) or uploaded_by = auth.uid());
create policy business_day_closings_select on business_day_closings for select using (private.is_business_member(business_id));
create policy business_activity_logs_select on business_activity_logs for select using (private.is_business_member(business_id));

grant select, insert, update, delete on businesses, business_partners, business_memberships, business_accounts, business_categories, business_transactions, business_ledger_entries, business_transaction_approvals, business_attachments, business_day_closings, business_activity_logs to authenticated;
revoke all on businesses, business_partners, business_memberships, business_accounts, business_categories, business_transactions, business_ledger_entries, business_transaction_approvals, business_attachments, business_day_closings, business_activity_logs from anon;

create or replace function claim_business_memberships()
returns table (membership_id uuid, business_id uuid, business_name text, role text, partner_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;
  update business_memberships bm
     set user_id = auth.uid()
   where bm.user_id is null and bm.status = 'active' and lower(bm.email) = current_email;
  return query
  select bm.id, bm.business_id, b.name, bm.role, bm.partner_id
  from business_memberships bm join businesses b on b.id = bm.business_id
  where bm.user_id = auth.uid() and bm.status = 'active'
  order by b.name;
end;
$$;

create or replace function create_business(
  target_name text, owner_name text, target_approval_mode text default 'one_partner', opening_cash numeric default 0
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_business uuid; new_partner uuid; current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(target_name)) < 2 then raise exception 'business_name_required'; end if;
  if char_length(trim(owner_name)) < 1 then raise exception 'owner_name_required'; end if;
  if target_approval_mode not in ('none','one_partner','all_partners') then raise exception 'invalid_approval_mode'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;

  insert into businesses (name, approval_mode, created_by)
  values (trim(target_name), target_approval_mode, auth.uid()) returning id into new_business;
  insert into business_partners (business_id, name, email)
  values (new_business, trim(owner_name), current_email) returning id into new_partner;
  insert into business_memberships (business_id, user_id, partner_id, email, display_name, role)
  values (new_business, auth.uid(), new_partner, current_email, trim(owner_name), 'admin');
  insert into business_accounts (business_id, name, kind, opening_balance) values
    (new_business, 'Cash', 'cash', coalesce(opening_cash, 0)),
    (new_business, 'UPI', 'upi', 0);
  insert into business_categories (business_id, name, kind) values
    (new_business, 'Sales / Receipts', 'income'),
    (new_business, 'Purchase / Material', 'expense'),
    (new_business, 'Travel', 'expense'),
    (new_business, 'Food / Staff', 'expense'),
    (new_business, 'Rent', 'expense'),
    (new_business, 'Utilities', 'expense'),
    (new_business, 'Repairs', 'expense'),
    (new_business, 'Other', 'both');
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (new_business, auth.uid(), 'business_created', 'business', new_business, jsonb_build_object('name', trim(target_name)));
  return new_business;
end;
$$;

create or replace function add_business_partner(
  target_business uuid, partner_name text, partner_email text default null,
  partner_phone text default null, partner_ownership numeric default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_partner uuid; normalized_email text; existing_user uuid;
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(partner_name)) < 1 then raise exception 'partner_name_required'; end if;
  if partner_ownership is not null and (partner_ownership < 0 or partner_ownership > 100) then raise exception 'invalid_ownership'; end if;
  normalized_email := nullif(lower(trim(coalesce(partner_email, ''))), '');
  if normalized_email is not null then
    select id into existing_user from auth.users where lower(email) = normalized_email limit 1;
  end if;
  insert into business_partners (business_id, name, email, phone, ownership_percent)
  values (target_business, trim(partner_name), normalized_email, nullif(trim(coalesce(partner_phone, '')), ''), partner_ownership)
  returning id into new_partner;
  if normalized_email is not null then
    insert into business_memberships (business_id, user_id, partner_id, email, display_name, role)
    values (target_business, existing_user, new_partner, normalized_email, trim(partner_name), 'partner');
  end if;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (target_business, auth.uid(), 'partner_added', 'partner', new_partner, jsonb_build_object('name', trim(partner_name)));
  return new_partner;
end;
$$;

create or replace function post_business_transaction(
  target_business uuid, target_kind text, target_amount numeric,
  target_account uuid default null, target_to_account uuid default null,
  target_partner uuid default null, target_category uuid default null,
  target_counterparty text default null, target_note text default null,
  target_occurred_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare new_tx uuid; mode text; approval text := 'not_required'; eligible_approvers int := 0; due_balance numeric := 0;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_kind not in ('income','expense','partner_capital','partner_advance','personal_expense','reimbursement','withdrawal','transfer','refund') then raise exception 'invalid_transaction_kind'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;

  if target_account is not null and not exists (select 1 from business_accounts where id = target_account and business_id = target_business and active) then raise exception 'invalid_account'; end if;
  if target_to_account is not null and not exists (select 1 from business_accounts where id = target_to_account and business_id = target_business and active) then raise exception 'invalid_destination_account'; end if;
  if target_partner is not null and not exists (select 1 from business_partners where id = target_partner and business_id = target_business and active) then raise exception 'invalid_partner'; end if;
  if target_category is not null and not exists (select 1 from business_categories where id = target_category and business_id = target_business and active) then raise exception 'invalid_category'; end if;

  if target_kind in ('income','expense','partner_capital','partner_advance','reimbursement','withdrawal','refund') and target_account is null then raise exception 'account_required'; end if;
  if target_kind = 'transfer' and (target_account is null or target_to_account is null or target_account = target_to_account) then raise exception 'two_accounts_required'; end if;
  if target_kind in ('partner_capital','partner_advance','personal_expense','reimbursement','withdrawal') and target_partner is null then raise exception 'partner_required'; end if;

  if target_kind = 'reimbursement' then
    select coalesce(sum(le.amount), 0) into due_balance
      from business_ledger_entries le
     where le.business_id = target_business and le.partner_id = target_partner and le.bucket = 'partner_due';
    if due_balance < target_amount then raise exception 'reimbursement_exceeds_due'; end if;
  end if;

  if target_kind in ('expense','personal_expense') then
    select approval_mode into mode from businesses where id = target_business;
    select count(*) into eligible_approvers
      from business_memberships bm
     where bm.business_id = target_business and bm.status = 'active'
       and bm.user_id is not null and bm.user_id <> auth.uid()
       and bm.role in ('admin','partner');
    if mode <> 'none' and eligible_approvers > 0 then approval := 'pending'; end if;
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, occurred_at, created_by
  ) values (
    target_business, target_kind, round(target_amount, 2), target_account, target_to_account, target_partner, target_category,
    nullif(trim(coalesce(target_counterparty, '')), ''), nullif(trim(coalesce(target_note, '')), ''), approval,
    coalesce(target_occurred_at, now()), auth.uid()
  ) returning id into new_tx;

  if target_kind in ('income','refund') then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
  elsif target_kind = 'expense' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
  elsif target_kind = 'partner_capital' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_capital', target_partner, target_amount);
  elsif target_kind = 'partner_advance' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, target_amount);
  elsif target_kind = 'personal_expense' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, target_amount);
  elsif target_kind = 'reimbursement' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_due', target_partner, -target_amount);
  elsif target_kind = 'withdrawal' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount)
    values (target_business, new_tx, 'account', target_account, -target_amount);
    insert into business_ledger_entries (business_id, transaction_id, bucket, partner_id, amount)
    values (target_business, new_tx, 'partner_withdrawal', target_partner, target_amount);
  elsif target_kind = 'transfer' then
    insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, amount) values
      (target_business, new_tx, 'account', target_account, -target_amount),
      (target_business, new_tx, 'account', target_to_account, target_amount);
  end if;

  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (target_business, auth.uid(), 'transaction_posted', 'transaction', new_tx, jsonb_build_object('kind', target_kind, 'amount', target_amount, 'approval_status', approval));
  return new_tx;
end;
$$;

create or replace function approve_business_transaction(target_transaction uuid, target_note text default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype; mode text; approved_count int; required_count int; final_status text;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_approve_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.created_by = auth.uid() then raise exception 'creator_cannot_self_approve'; end if;
  if tx.approval_status not in ('pending','approved') then raise exception 'transaction_not_pending'; end if;

  insert into business_transaction_approvals (business_id, transaction_id, approver_user_id, decision, note)
  values (tx.business_id, tx.id, auth.uid(), 'approved', nullif(trim(coalesce(target_note, '')), ''))
  on conflict (transaction_id, approver_user_id)
  do update set decision = 'approved', note = excluded.note, decided_at = now();

  select approval_mode into mode from businesses where id = tx.business_id;
  select count(*) into approved_count from business_transaction_approvals where transaction_id = tx.id and decision = 'approved';
  select count(*) into required_count
    from business_memberships bm
   where bm.business_id = tx.business_id and bm.status = 'active' and bm.user_id is not null
     and bm.user_id <> tx.created_by and bm.role in ('admin','partner');

  final_status := case
    when mode = 'one_partner' and approved_count >= 1 then 'approved'
    when mode = 'all_partners' and approved_count >= required_count then 'approved'
    else 'pending'
  end;
  update business_transactions set approval_status = final_status where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_approved', 'transaction', tx.id, jsonb_build_object('status', final_status));
  return final_status;
end;
$$;

create or replace function reject_business_transaction(target_transaction uuid, target_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_approve_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.created_by = auth.uid() then raise exception 'creator_cannot_self_approve'; end if;
  if tx.approval_status <> 'pending' then raise exception 'transaction_not_pending'; end if;

  insert into business_transaction_approvals (business_id, transaction_id, approver_user_id, decision, note)
  values (tx.business_id, tx.id, auth.uid(), 'rejected', nullif(trim(coalesce(target_note, '')), ''))
  on conflict (transaction_id, approver_user_id)
  do update set decision = 'rejected', note = excluded.note, decided_at = now();
  update business_transactions set approval_status = 'rejected' where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_rejected', 'transaction', tx.id, jsonb_build_object('note', target_note));
end;
$$;

create or replace function reverse_business_transaction(target_transaction uuid, target_reason text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tx business_transactions%rowtype; reversal_id uuid;
begin
  select * into tx from business_transactions where id = target_transaction;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind = 'reversal' or tx.reversed_at is not null then raise exception 'already_reversed'; end if;
  if char_length(trim(coalesce(target_reason, ''))) < 3 then raise exception 'reversal_reason_required'; end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, occurred_at, created_by, reversed_transaction_id
  ) values (
    tx.business_id, 'reversal', tx.amount, tx.account_id, tx.to_account_id, tx.partner_id, tx.category_id,
    tx.counterparty, trim(target_reason), 'not_required', now(), auth.uid(), tx.id
  ) returning id into reversal_id;

  insert into business_ledger_entries (business_id, transaction_id, bucket, account_id, partner_id, amount)
  select business_id, reversal_id, bucket, account_id, partner_id, -amount
    from business_ledger_entries where transaction_id = tx.id;
  update business_transactions set reversed_at = now(), reversed_by = auth.uid() where id = tx.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (tx.business_id, auth.uid(), 'transaction_reversed', 'transaction', tx.id, jsonb_build_object('reversal_id', reversal_id, 'reason', trim(target_reason)));
  return reversal_id;
end;
$$;

create or replace function get_business_account_balances(target_business uuid)
returns table (account_id uuid, name text, kind text, balance numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select a.id, a.name, a.kind,
         round(a.opening_balance + coalesce(sum(le.amount) filter (where le.bucket = 'account'), 0), 2)
    from business_accounts a
    left join business_ledger_entries le on le.account_id = a.id and le.business_id = a.business_id
   where a.business_id = target_business and a.active
   group by a.id, a.name, a.kind, a.opening_balance
   order by case a.kind when 'cash' then 1 when 'bank' then 2 when 'upi' then 3 else 4 end, a.name;
end;
$$;

create or replace function get_business_partner_positions(target_business uuid)
returns table (
  partner_id uuid, name text, capital numeric, advances numeric, personal_expenses numeric,
  reimbursements numeric, outstanding_due numeric, withdrawals numeric
)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;
  return query
  select p.id, p.name,
    coalesce(sum(t.amount) filter (where t.kind = 'partner_capital' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'partner_advance' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'personal_expense' and t.reversed_at is null), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'reimbursement' and t.reversed_at is null), 0)::numeric,
    (coalesce(sum(t.amount) filter (where t.kind in ('partner_advance','personal_expense') and t.reversed_at is null), 0)
      - coalesce(sum(t.amount) filter (where t.kind = 'reimbursement' and t.reversed_at is null), 0))::numeric,
    coalesce(sum(t.amount) filter (where t.kind = 'withdrawal' and t.reversed_at is null), 0)::numeric
  from business_partners p
  left join business_transactions t on t.partner_id = p.id and t.business_id = p.business_id
  where p.business_id = target_business and p.active
  group by p.id, p.name
  order by p.created_at;
end;
$$;

create or replace function close_business_day(target_account uuid, target_counted numeric, target_note text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare account_row business_accounts%rowtype; expected numeric; new_close uuid;
begin
  select * into account_row from business_accounts where id = target_account;
  if account_row.id is null or account_row.kind <> 'cash' then raise exception 'cash_account_required'; end if;
  if not private.can_write_business(account_row.business_id) then raise exception 'not_allowed'; end if;
  if target_counted is null then raise exception 'counted_balance_required'; end if;
  if exists (
    select 1 from business_day_closings
    where business_id = account_row.business_id and account_id = target_account and close_date = current_date
  ) then raise exception 'day_already_closed'; end if;

  select account_row.opening_balance + coalesce(sum(le.amount), 0) into expected
    from business_ledger_entries le
   where le.business_id = account_row.business_id and le.account_id = target_account and le.bucket = 'account';

  insert into business_day_closings (business_id, account_id, expected_balance, counted_balance, difference, note, closed_by)
  values (account_row.business_id, target_account, round(expected,2), round(target_counted,2), round(target_counted - expected,2), nullif(trim(coalesce(target_note,'')),''), auth.uid())
  returning id into new_close;

  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (account_row.business_id, auth.uid(), 'day_closed', 'day_closing', new_close, jsonb_build_object('expected', expected, 'counted', target_counted));
  return new_close;
end;
$$;

create or replace function reopen_business_day(target_closing uuid, target_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c business_day_closings%rowtype;
begin
  select * into c from business_day_closings where id = target_closing;
  if c.id is null then raise exception 'closing_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_reason,''))) < 3 then raise exception 'reason_required'; end if;
  delete from business_day_closings where id = c.id;
  insert into business_activity_logs (business_id, actor_user_id, action, entity_type, entity_id, detail)
  values (c.business_id, auth.uid(), 'day_reopened', 'day_closing', c.id, jsonb_build_object('reason', trim(target_reason), 'close_date', c.close_date));
end;
$$;

grant execute on function claim_business_memberships() to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;
grant execute on function add_business_partner(uuid, text, text, text, numeric) to authenticated;
grant execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function approve_business_transaction(uuid, text) to authenticated;
grant execute on function reject_business_transaction(uuid, text) to authenticated;
grant execute on function reverse_business_transaction(uuid, text) to authenticated;
grant execute on function get_business_account_balances(uuid) to authenticated;
grant execute on function get_business_partner_positions(uuid) to authenticated;
grant execute on function close_business_day(uuid, numeric, text) to authenticated;
grant execute on function reopen_business_day(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-proofs', 'business-proofs', false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy business_proofs_select on storage.objects for select
using (bucket_id = 'business-proofs' and private.is_business_member((split_part(name, '/', 1))::uuid));
create policy business_proofs_insert on storage.objects for insert
with check (bucket_id = 'business-proofs' and private.can_write_business((split_part(name, '/', 1))::uuid));
create policy business_proofs_delete on storage.objects for delete
using (bucket_id = 'business-proofs' and private.can_write_business((split_part(name, '/', 1))::uuid));



-- Business workspace security and integrity hardening after advisor review.

-- Financial account opening balances are part of the ledger baseline. New
-- accounts can be added by an admin, but an existing opening balance must not
-- be silently rewritten by direct client table updates.
drop policy if exists business_accounts_update on business_accounts;

-- auth.uid() is wrapped in SELECT in table policies so Postgres can initialize
-- it once per statement instead of re-evaluating it for each candidate row.
drop policy if exists business_attachments_insert on business_attachments;
create policy business_attachments_insert on business_attachments for insert
with check (private.can_write_business(business_id) and uploaded_by = (select auth.uid()));

drop policy if exists business_attachments_delete on business_attachments;
create policy business_attachments_delete on business_attachments for delete
using (private.can_admin_business(business_id) or uploaded_by = (select auth.uid()));

-- SECURITY DEFINER RPCs are authenticated app endpoints, never anonymous
-- endpoints. PostgreSQL grants function EXECUTE to PUBLIC by default, so an
-- explicit revoke is required even when we later grant authenticated.
revoke execute on function claim_business_memberships() from public, anon;
revoke execute on function create_business(text, text, text, numeric) from public, anon;
revoke execute on function add_business_partner(uuid, text, text, text, numeric) from public, anon;
revoke execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) from public, anon;
revoke execute on function approve_business_transaction(uuid, text) from public, anon;
revoke execute on function reject_business_transaction(uuid, text) from public, anon;
revoke execute on function reverse_business_transaction(uuid, text) from public, anon;
revoke execute on function get_business_account_balances(uuid) from public, anon;
revoke execute on function get_business_partner_positions(uuid) from public, anon;
revoke execute on function close_business_day(uuid, numeric, text) from public, anon;
revoke execute on function reopen_business_day(uuid, text) from public, anon;

grant execute on function claim_business_memberships() to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;
grant execute on function add_business_partner(uuid, text, text, text, numeric) to authenticated;
grant execute on function post_business_transaction(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function approve_business_transaction(uuid, text) to authenticated;
grant execute on function reject_business_transaction(uuid, text) to authenticated;
grant execute on function reverse_business_transaction(uuid, text) to authenticated;
grant execute on function get_business_account_balances(uuid) to authenticated;
grant execute on function get_business_partner_positions(uuid) to authenticated;
grant execute on function close_business_day(uuid, numeric, text) to authenticated;
grant execute on function reopen_business_day(uuid, text) to authenticated;

-- The private helpers are needed by authenticated RLS policies/RPCs, but have
-- no reason to be executable by an anonymous role.
revoke execute on function private.is_business_member(uuid) from public, anon;
revoke execute on function private.business_role(uuid) from public, anon;
revoke execute on function private.can_write_business(uuid) from public, anon;
revoke execute on function private.can_admin_business(uuid) from public, anon;
revoke execute on function private.can_approve_business(uuid) from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.business_role(uuid) to authenticated;
grant execute on function private.can_write_business(uuid) to authenticated;
grant execute on function private.can_admin_business(uuid) to authenticated;
grant execute on function private.can_approve_business(uuid) to authenticated;

-- Cover the foreign keys and lookup paths used frequently by the mobile
-- workspace. These keep partner/account/approval reads predictable as a
-- business ledger grows.
create index if not exists business_memberships_user_idx on business_memberships (user_id) where user_id is not null;
create index if not exists business_memberships_partner_idx on business_memberships (partner_id) where partner_id is not null;
create index if not exists business_transactions_account_idx on business_transactions (account_id) where account_id is not null;
create index if not exists business_transactions_to_account_idx on business_transactions (to_account_id) where to_account_id is not null;
create index if not exists business_transactions_partner_idx on business_transactions (partner_id) where partner_id is not null;
create index if not exists business_transactions_category_idx on business_transactions (category_id) where category_id is not null;
create index if not exists business_transactions_creator_idx on business_transactions (created_by);
create index if not exists business_transactions_reversed_tx_idx on business_transactions (reversed_transaction_id) where reversed_transaction_id is not null;
create index if not exists business_transactions_reversed_by_idx on business_transactions (reversed_by) where reversed_by is not null;
create index if not exists business_ledger_entries_transaction_idx on business_ledger_entries (transaction_id);
create index if not exists business_transaction_approvals_business_idx on business_transaction_approvals (business_id);
create index if not exists business_transaction_approvals_approver_idx on business_transaction_approvals (approver_user_id);
create index if not exists business_attachments_transaction_idx on business_attachments (transaction_id);
create index if not exists business_attachments_uploader_idx on business_attachments (uploaded_by);
create index if not exists business_day_closings_closed_by_idx on business_day_closings (closed_by);
create index if not exists business_activity_logs_actor_idx on business_activity_logs (actor_user_id);
create index if not exists businesses_created_by_idx on businesses (created_by);



-- Business onboarding must be approved by the Prangan One platform owner
-- before a usable Business Money workspace and business membership exist.

create or replace function private.is_platform_owner()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from memberships m
    where m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
      and m.society_id is null
  );
$$;

revoke execute on function private.is_platform_owner() from public, anon;
grant execute on function private.is_platform_owner() to authenticated;

create table if not exists business_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(trim(business_name)) between 2 and 120),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  requester_name text not null check (char_length(trim(requester_name)) between 1 and 120),
  requester_phone text,
  city text,
  business_type text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decision_note text,
  business_id uuid references businesses(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_onboarding_one_pending_per_user_idx
  on business_onboarding_requests (requester_user_id)
  where status = 'pending';

create index if not exists business_onboarding_status_created_idx
  on business_onboarding_requests (status, created_at desc);

alter table business_onboarding_requests enable row level security;

drop policy if exists business_onboarding_requests_select on business_onboarding_requests;
create policy business_onboarding_requests_select on business_onboarding_requests
for select
using (
  requester_user_id = (select auth.uid())
  or private.is_platform_owner()
);

revoke all on business_onboarding_requests from anon;
revoke insert, update, delete on business_onboarding_requests from authenticated;
grant select on business_onboarding_requests to authenticated;

create or replace function request_business_onboarding(
  target_name text,
  requester_name text,
  requester_phone text default null,
  requester_city text default null,
  target_business_type text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text;
  existing_request uuid;
  new_request uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if char_length(trim(coalesce(target_name, ''))) < 2 then raise exception 'business_name_required'; end if;
  if char_length(trim(coalesce(requester_name, ''))) < 1 then raise exception 'requester_name_required'; end if;

  select lower(u.email) into current_email
  from auth.users u
  where u.id = auth.uid();

  if current_email is null then raise exception 'email_required'; end if;

  select r.id into existing_request
  from business_onboarding_requests r
  where r.requester_user_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc
  limit 1;

  if existing_request is not null then
    return existing_request;
  end if;

  insert into business_onboarding_requests (
    business_name, requester_user_id, requester_email, requester_name,
    requester_phone, city, business_type
  ) values (
    trim(target_name), auth.uid(), current_email, trim(requester_name),
    nullif(trim(coalesce(requester_phone, '')), ''),
    nullif(trim(coalesce(requester_city, '')), ''),
    nullif(trim(coalesce(target_business_type, '')), '')
  )
  returning id into new_request;

  return new_request;
end;
$$;

create or replace function get_my_business_onboarding()
returns table (
  request_id uuid,
  business_name text,
  requester_name text,
  requester_email text,
  requester_phone text,
  city text,
  business_type text,
  status text,
  decision_note text,
  business_id uuid,
  created_at timestamptz,
  decided_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  return query
  select
    r.id, r.business_name, r.requester_name, r.requester_email,
    r.requester_phone, r.city, r.business_type, r.status,
    r.decision_note, r.business_id, r.created_at, r.decided_at
  from business_onboarding_requests r
  where r.requester_user_id = auth.uid()
  order by r.created_at desc
  limit 1;
end;
$$;

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
    (new_business, 'UPI', 'upi', 0);

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

create or replace function reject_business_onboarding(
  target_request uuid,
  target_note text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req business_onboarding_requests%rowtype;
begin
  if not private.is_platform_owner() then raise exception 'owner_only'; end if;

  select * into req
  from business_onboarding_requests
  where id = target_request
  for update;

  if req.id is null then raise exception 'request_not_found'; end if;
  if req.status <> 'pending' then raise exception 'request_not_pending'; end if;

  update business_onboarding_requests
  set status = 'rejected',
      decision_note = nullif(trim(coalesce(target_note, '')), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now()
  where id = req.id;
end;
$$;

-- Disable the original instant-create endpoint. This prevents an old browser
-- bundle or direct RPC call from bypassing the platform-owner approval step.
create or replace function create_business(
  target_name text,
  owner_name text,
  target_approval_mode text default 'one_partner',
  opening_cash numeric default 0
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'owner_approval_required';
end;
$$;

revoke execute on function request_business_onboarding(text, text, text, text, text) from public, anon;
revoke execute on function get_my_business_onboarding() from public, anon;
revoke execute on function approve_business_onboarding(uuid) from public, anon;
revoke execute on function reject_business_onboarding(uuid, text) from public, anon;
revoke execute on function create_business(text, text, text, numeric) from public, anon;

grant execute on function request_business_onboarding(text, text, text, text, text) to authenticated;
grant execute on function get_my_business_onboarding() to authenticated;
grant execute on function approve_business_onboarding(uuid) to authenticated;
grant execute on function reject_business_onboarding(uuid, text) to authenticated;
grant execute on function create_business(text, text, text, numeric) to authenticated;



-- Cover onboarding request foreign keys used by approval history and owner review.
create index if not exists business_onboarding_business_idx
  on business_onboarding_requests (business_id)
  where business_id is not null;

create index if not exists business_onboarding_decided_by_idx
  on business_onboarding_requests (decided_by)
  where decided_by is not null;



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



-- Business expense lifecycle: an expense can be recorded before it is paid.
-- Approval and payment are independent. Unpaid expenses do not move any
-- business account or partner balance until they are marked paid.

alter table business_transactions
  add column if not exists payment_status text not null default 'paid',
  add column if not exists due_date date,
  add column if not exists paid_at timestamptz;

update business_transactions
set paid_at = coalesce(paid_at, occurred_at)
where kind in ('expense','personal_expense')
  and payment_status = 'paid'
  and paid_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_transactions_payment_status_check'
  ) then
    alter table business_transactions
      add constraint business_transactions_payment_status_check
      check (payment_status in ('unpaid','paid'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'business_expense_payment_shape_check'
  ) then
    alter table business_transactions
      add constraint business_expense_payment_shape_check
      check (
        kind <> 'expense'
        or (
          (payment_status = 'unpaid' and account_id is null and partner_id is null)
          or
          (payment_status = 'paid' and (
            (account_id is not null and partner_id is null)
            or
            (account_id is null and partner_id is not null)
          ))
        )
      );
  end if;
end $$;

create index if not exists business_transactions_unpaid_expense_idx
  on business_transactions (business_id, due_date, occurred_at desc)
  where kind = 'expense' and payment_status = 'unpaid' and reversed_at is null;

create or replace function record_business_expense(
  target_business uuid,
  target_amount numeric,
  target_payment_status text default 'paid',
  target_paid_by text default 'business',
  target_account uuid default null,
  target_partner uuid default null,
  target_category uuid default null,
  target_counterparty text default null,
  target_note text default null,
  target_due_date date default null,
  target_occurred_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_tx uuid;
  mode text;
  approval text := 'not_required';
  eligible_approvers int := 0;
  account_value uuid := null;
  partner_value uuid := null;
  paid_at_value timestamptz := null;
begin
  if not private.can_write_business(target_business) then raise exception 'not_allowed'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;
  if target_payment_status not in ('unpaid','paid') then raise exception 'invalid_payment_status'; end if;
  if target_payment_status = 'paid' and target_paid_by not in ('business','partner') then raise exception 'invalid_paid_by'; end if;

  if target_category is not null and not exists (
    select 1 from business_categories
    where id = target_category and business_id = target_business and active
  ) then raise exception 'invalid_category'; end if;

  if target_payment_status = 'paid' and target_paid_by = 'business' then
    if target_account is null then raise exception 'account_required'; end if;
    if not exists (
      select 1 from business_accounts
      where id = target_account and business_id = target_business and active
    ) then raise exception 'invalid_account'; end if;
    account_value := target_account;
    paid_at_value := coalesce(target_occurred_at, now());
  elsif target_payment_status = 'paid' and target_paid_by = 'partner' then
    if target_partner is null then raise exception 'partner_required'; end if;
    if not exists (
      select 1 from business_partners
      where id = target_partner and business_id = target_business and active
    ) then raise exception 'invalid_partner'; end if;
    partner_value := target_partner;
    paid_at_value := coalesce(target_occurred_at, now());
  end if;

  select approval_mode into mode
  from businesses
  where id = target_business;

  select count(*) into eligible_approvers
  from business_memberships bm
  where bm.business_id = target_business
    and bm.status = 'active'
    and bm.user_id is not null
    and bm.user_id <> auth.uid()
    and bm.role in ('admin','partner');

  if mode <> 'none' and eligible_approvers > 0 then
    approval := 'pending';
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, partner_id, category_id,
    counterparty, note, approval_status, payment_status, due_date, paid_at,
    occurred_at, created_by
  ) values (
    target_business, 'expense', round(target_amount, 2), account_value, partner_value, target_category,
    nullif(trim(coalesce(target_counterparty, '')), ''),
    nullif(trim(coalesce(target_note, '')), ''),
    approval, target_payment_status, target_due_date, paid_at_value,
    coalesce(target_occurred_at, now()), auth.uid()
  ) returning id into new_tx;

  if target_payment_status = 'paid' and target_paid_by = 'business' then
    insert into business_ledger_entries (
      business_id, transaction_id, bucket, account_id, amount
    ) values (
      target_business, new_tx, 'account', account_value, -target_amount
    );
  elsif target_payment_status = 'paid' and target_paid_by = 'partner' then
    insert into business_ledger_entries (
      business_id, transaction_id, bucket, partner_id, amount
    ) values (
      target_business, new_tx, 'partner_due', partner_value, target_amount
    );
  end if;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    target_business, auth.uid(), 'expense_recorded', 'transaction', new_tx,
    jsonb_build_object(
      'amount', target_amount,
      'payment_status', target_payment_status,
      'paid_by', case when target_payment_status = 'paid' then target_paid_by else null end,
      'approval_status', approval
    )
  );

  return new_tx;
end;
$$;

create or replace function mark_business_expense_paid(
  target_transaction uuid,
  target_paid_by text,
  target_account uuid default null,
  target_partner uuid default null,
  target_paid_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tx business_transactions%rowtype;
begin
  select * into tx
  from business_transactions
  where id = target_transaction
  for update;

  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if tx.kind <> 'expense' then raise exception 'expense_required'; end if;
  if tx.reversed_at is not null then raise exception 'transaction_reversed'; end if;
  if tx.payment_status <> 'unpaid' then raise exception 'expense_already_paid'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if target_paid_by not in ('business','partner') then raise exception 'invalid_paid_by'; end if;

  if target_paid_by = 'business' then
    if target_account is null then raise exception 'account_required'; end if;
    if not exists (
      select 1 from business_accounts
      where id = target_account and business_id = tx.business_id and active
    ) then raise exception 'invalid_account'; end if;

    insert into business_ledger_entries (
      business_id, transaction_id, bucket, account_id, amount
    ) values (
      tx.business_id, tx.id, 'account', target_account, -tx.amount
    );

    update business_transactions
    set payment_status = 'paid',
        account_id = target_account,
        partner_id = null,
        paid_at = coalesce(target_paid_at, now())
    where id = tx.id;
  else
    if target_partner is null then raise exception 'partner_required'; end if;
    if not exists (
      select 1 from business_partners
      where id = target_partner and business_id = tx.business_id and active
    ) then raise exception 'invalid_partner'; end if;

    insert into business_ledger_entries (
      business_id, transaction_id, bucket, partner_id, amount
    ) values (
      tx.business_id, tx.id, 'partner_due', target_partner, tx.amount
    );

    update business_transactions
    set payment_status = 'paid',
        partner_id = target_partner,
        account_id = null,
        paid_at = coalesce(target_paid_at, now())
    where id = tx.id;
  end if;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    tx.business_id, auth.uid(), 'expense_marked_paid', 'transaction', tx.id,
    jsonb_build_object(
      'paid_by', target_paid_by,
      'account_id', target_account,
      'partner_id', target_partner
    )
  );
end;
$$;

create or replace function get_business_partner_positions(target_business uuid)
returns table (
  partner_id uuid, name text, capital numeric, advances numeric, personal_expenses numeric,
  reimbursements numeric, outstanding_due numeric, withdrawals numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.is_business_member(target_business) then raise exception 'not_allowed'; end if;

  return query
  select p.id, p.name,
    coalesce(sum(t.amount) filter (
      where t.kind = 'partner_capital' and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'partner_advance' and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where (
        t.kind = 'personal_expense'
        or (t.kind = 'expense' and t.payment_status = 'paid' and t.account_id is null)
      ) and t.reversed_at is null
    ), 0)::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'reimbursement' and t.reversed_at is null
    ), 0)::numeric,
    (
      coalesce(sum(t.amount) filter (
        where (
          t.kind = 'partner_advance'
          or t.kind = 'personal_expense'
          or (t.kind = 'expense' and t.payment_status = 'paid' and t.account_id is null)
        ) and t.reversed_at is null
      ), 0)
      - coalesce(sum(t.amount) filter (
        where t.kind = 'reimbursement' and t.reversed_at is null
      ), 0)
    )::numeric,
    coalesce(sum(t.amount) filter (
      where t.kind = 'withdrawal' and t.reversed_at is null
    ), 0)::numeric
  from business_partners p
  left join business_transactions t
    on t.partner_id = p.id and t.business_id = p.business_id
  where p.business_id = target_business and p.active
  group by p.id, p.name
  order by p.created_at;
end;
$$;

revoke execute on function record_business_expense(uuid, numeric, text, text, uuid, uuid, uuid, text, text, date, timestamptz) from public, anon;
revoke execute on function mark_business_expense_paid(uuid, text, uuid, uuid, timestamptz) from public, anon;
grant execute on function record_business_expense(uuid, numeric, text, text, uuid, uuid, uuid, text, text, date, timestamptz) to authenticated;
grant execute on function mark_business_expense_paid(uuid, text, uuid, uuid, timestamptz) to authenticated;



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



-- Managed edit/archive operations for Business Money.
-- UI requires typed EDIT/DELETE confirmation, while database functions enforce
-- authorization and preserve audit/history.

alter table businesses
  add column if not exists archived_at timestamptz;

create or replace function claim_business_memberships()
returns table (membership_id uuid, business_id uuid, business_name text, role text, partner_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(u.email) into current_email from auth.users u where u.id = auth.uid();
  if current_email is null then raise exception 'email_required'; end if;

  update business_memberships bm
     set user_id = auth.uid()
    from businesses b
   where bm.business_id = b.id
     and b.archived_at is null
     and bm.user_id is null
     and bm.status = 'active'
     and lower(bm.email) = current_email;

  return query
  select bm.id, bm.business_id, b.name, bm.role, bm.partner_id
  from business_memberships bm
  join businesses b on b.id = bm.business_id
  where bm.user_id = auth.uid()
    and bm.status = 'active'
    and b.archived_at is null
  order by b.name;
end;
$$;

create or replace function update_business_partner(
  target_partner uuid,
  partner_name text,
  partner_email text default null,
  partner_phone text default null,
  partner_ownership numeric default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p business_partners%rowtype;
  normalized_email text;
  existing_user uuid;
  member business_memberships%rowtype;
begin
  select * into p from business_partners where id = target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(partner_name,''))) < 1 then raise exception 'partner_name_required'; end if;
  if partner_ownership is not null and (partner_ownership < 0 or partner_ownership > 100) then raise exception 'invalid_ownership'; end if;

  normalized_email := nullif(lower(trim(coalesce(partner_email, ''))), '');
  select * into member from business_memberships where partner_id = p.id limit 1;

  if member.id is not null and member.role = 'admin' and normalized_email is null then
    raise exception 'admin_email_required';
  end if;

  if normalized_email is not null then
    select id into existing_user from auth.users where lower(email)=normalized_email limit 1;
  end if;

  update business_partners
  set name = trim(partner_name),
      email = normalized_email,
      phone = nullif(trim(coalesce(partner_phone,'')), ''),
      ownership_percent = partner_ownership
  where id = p.id;

  if member.id is not null then
    update business_memberships
    set email = coalesce(normalized_email, member.email),
        display_name = trim(partner_name),
        user_id = case when normalized_email is null then member.user_id else existing_user end,
        status = case when normalized_email is null then 'disabled' else 'active' end
    where id = member.id;
  elsif normalized_email is not null then
    insert into business_memberships (business_id,user_id,partner_id,email,display_name,role,status)
    values (p.business_id,existing_user,p.id,normalized_email,trim(partner_name),'partner','active');
  end if;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    p.business_id,auth.uid(),'partner_edited','partner',p.id,
    jsonb_build_object('old_name',p.name,'new_name',trim(partner_name),'old_email',p.email,'new_email',normalized_email)
  );
end;
$$;

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
begin
  select * into p from business_partners where id=target_partner for update;
  if p.id is null then raise exception 'partner_not_found'; end if;
  if not private.can_admin_business(p.business_id) then raise exception 'not_allowed'; end if;

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

create or replace function update_business_account(
  target_account uuid,
  target_name text,
  target_kind text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a business_accounts%rowtype;
  has_history boolean;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'account_name_required'; end if;
  if target_kind not in ('cash','bank','upi','wallet','other') then raise exception 'invalid_account_kind'; end if;

  select exists(
    select 1 from business_ledger_entries where account_id=a.id
    union all
    select 1 from business_day_closings where account_id=a.id
  ) into has_history;

  if has_history and target_kind <> a.kind then raise exception 'account_kind_locked_after_use'; end if;

  update business_accounts
  set name=trim(target_name), kind=target_kind
  where id=a.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    a.business_id,auth.uid(),'account_edited','account',a.id,
    jsonb_build_object('old_name',a.name,'new_name',trim(target_name),'old_kind',a.kind,'new_kind',target_kind)
  );
end;
$$;

create or replace function archive_business_account(target_account uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a business_accounts%rowtype;
  current_balance numeric;
begin
  select * into a from business_accounts where id=target_account for update;
  if a.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(a.business_id) then raise exception 'not_allowed'; end if;

  select a.opening_balance + coalesce(sum(le.amount),0)
  into current_balance
  from business_accounts a
  left join business_ledger_entries le on le.account_id=a.id
  where a.id=target_account
  group by a.id,a.opening_balance;

  if abs(coalesce(current_balance,0)) > 0.005 then raise exception 'account_balance_must_be_zero'; end if;

  update business_accounts set active=false where id=a.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (a.business_id,auth.uid(),'account_deleted','account',a.id,jsonb_build_object('name',a.name,'balance',current_balance));
end;
$$;

create or replace function add_business_category(
  target_business uuid,
  target_name text,
  target_kind text default 'expense'
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_id uuid;
begin
  if not private.can_admin_business(target_business) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'category_name_required'; end if;
  if target_kind not in ('income','expense','both') then raise exception 'invalid_category_kind'; end if;

  insert into business_categories (business_id,name,kind)
  values (target_business,trim(target_name),target_kind)
  returning id into new_id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (target_business,auth.uid(),'category_added','category',new_id,jsonb_build_object('name',trim(target_name),'kind',target_kind));

  return new_id;
end;
$$;

create or replace function update_business_category(
  target_category uuid,
  target_name text,
  target_kind text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c business_categories%rowtype;
begin
  select * into c from business_categories where id=target_category for update;
  if c.id is null then raise exception 'category_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 1 then raise exception 'category_name_required'; end if;
  if target_kind not in ('income','expense','both') then raise exception 'invalid_category_kind'; end if;

  update business_categories set name=trim(target_name), kind=target_kind where id=c.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    c.business_id,auth.uid(),'category_edited','category',c.id,
    jsonb_build_object('old_name',c.name,'new_name',trim(target_name),'old_kind',c.kind,'new_kind',target_kind)
  );
end;
$$;

create or replace function archive_business_category(target_category uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare c business_categories%rowtype;
begin
  select * into c from business_categories where id=target_category for update;
  if c.id is null then raise exception 'category_not_found'; end if;
  if not private.can_admin_business(c.business_id) then raise exception 'not_allowed'; end if;

  update business_categories set active=false where id=c.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (c.business_id,auth.uid(),'category_deleted','category',c.id,jsonb_build_object('name',c.name));
end;
$$;

create or replace function edit_business_transaction_details(
  target_transaction uuid,
  target_counterparty text default null,
  target_note text default null,
  target_category uuid default null,
  target_due_date date default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare tx business_transactions%rowtype;
begin
  select * into tx from business_transactions where id=target_transaction for update;
  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind='reversal' or tx.reversed_at is not null then raise exception 'transaction_locked'; end if;

  if target_category is not null and not exists(
    select 1 from business_categories
    where id=target_category and business_id=tx.business_id and active
  ) then raise exception 'invalid_category'; end if;

  update business_transactions
  set counterparty=nullif(trim(coalesce(target_counterparty,'')),''),
      note=nullif(trim(coalesce(target_note,'')),''),
      category_id=target_category,
      due_date=case when kind='expense' and payment_status='unpaid' then target_due_date else due_date end
  where id=tx.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    tx.business_id,auth.uid(),'transaction_edited','transaction',tx.id,
    jsonb_build_object(
      'old_counterparty',tx.counterparty,
      'new_counterparty',nullif(trim(coalesce(target_counterparty,'')),''),
      'old_note',tx.note,
      'new_note',nullif(trim(coalesce(target_note,'')),''),
      'old_category_id',tx.category_id,
      'new_category_id',target_category,
      'old_due_date',tx.due_date,
      'new_due_date',target_due_date
    )
  );
end;
$$;

create or replace function update_business_settings(
  target_business uuid,
  target_name text,
  target_approval_mode text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare b businesses%rowtype;
begin
  select * into b from businesses where id=target_business and archived_at is null for update;
  if b.id is null then raise exception 'business_not_found'; end if;
  if not private.can_admin_business(b.id) then raise exception 'not_allowed'; end if;
  if char_length(trim(coalesce(target_name,''))) < 2 then raise exception 'business_name_required'; end if;
  if target_approval_mode not in ('none','one_partner','all_partners') then raise exception 'invalid_approval_mode'; end if;

  update businesses
  set name=trim(target_name), approval_mode=target_approval_mode, updated_at=now()
  where id=b.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (
    b.id,auth.uid(),'business_edited','business',b.id,
    jsonb_build_object('old_name',b.name,'new_name',trim(target_name),'old_approval_mode',b.approval_mode,'new_approval_mode',target_approval_mode)
  );
end;
$$;

create or replace function archive_business(target_business uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare b businesses%rowtype;
begin
  select * into b from businesses where id=target_business and archived_at is null for update;
  if b.id is null then raise exception 'business_not_found'; end if;
  if not private.can_admin_business(b.id) then raise exception 'not_allowed'; end if;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (b.id,auth.uid(),'business_deleted','business',b.id,jsonb_build_object('name',b.name));

  update businesses set archived_at=now(), updated_at=now() where id=b.id;
  update business_memberships set status='disabled' where business_id=b.id and status='active';
end;
$$;

drop policy if exists businesses_update on businesses;

revoke execute on function update_business_partner(uuid,text,text,text,numeric) from public, anon;
revoke execute on function archive_business_partner(uuid) from public, anon;
revoke execute on function update_business_account(uuid,text,text) from public, anon;
revoke execute on function archive_business_account(uuid) from public, anon;
revoke execute on function add_business_category(uuid,text,text) from public, anon;
revoke execute on function update_business_category(uuid,text,text) from public, anon;
revoke execute on function archive_business_category(uuid) from public, anon;
revoke execute on function edit_business_transaction_details(uuid,text,text,uuid,date) from public, anon;
revoke execute on function update_business_settings(uuid,text,text) from public, anon;
revoke execute on function archive_business(uuid) from public, anon;

grant execute on function update_business_partner(uuid,text,text,text,numeric) to authenticated;
grant execute on function archive_business_partner(uuid) to authenticated;
grant execute on function update_business_account(uuid,text,text) to authenticated;
grant execute on function archive_business_account(uuid) to authenticated;
grant execute on function add_business_category(uuid,text,text) to authenticated;
grant execute on function update_business_category(uuid,text,text) to authenticated;
grant execute on function archive_business_category(uuid) to authenticated;
grant execute on function edit_business_transaction_details(uuid,text,text,uuid,date) to authenticated;
grant execute on function update_business_settings(uuid,text,text) to authenticated;
grant execute on function archive_business(uuid) to authenticated;


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



create or replace function archive_business_account(target_account uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  acct business_accounts%rowtype;
  current_balance numeric;
begin
  select * into acct from business_accounts where id=target_account for update;
  if acct.id is null then raise exception 'account_not_found'; end if;
  if not private.can_admin_business(acct.business_id) then raise exception 'not_allowed'; end if;

  select ba.opening_balance + coalesce(sum(le.amount),0)
  into current_balance
  from business_accounts ba
  left join business_ledger_entries le on le.account_id=ba.id
  where ba.id=target_account
  group by ba.id,ba.opening_balance;

  if abs(coalesce(current_balance,0)) > 0.005 then raise exception 'account_balance_must_be_zero'; end if;

  update business_accounts set active=false where id=acct.id;

  insert into business_activity_logs (business_id,actor_user_id,action,entity_type,entity_id,detail)
  values (acct.business_id,auth.uid(),'account_deleted','account',acct.id,jsonb_build_object('name',acct.name,'balance',current_balance));
end;
$$;

revoke execute on function archive_business_account(uuid) from public, anon;
grant execute on function archive_business_account(uuid) to authenticated;



-- Allow users to edit posted transaction amounts without rewriting history.
-- The old transaction is reversed and a linked replacement is posted.

alter table business_transactions
  add column if not exists supersedes_transaction_id uuid references business_transactions(id) on delete set null;

create index if not exists business_transactions_supersedes_idx
  on business_transactions (supersedes_transaction_id)
  where supersedes_transaction_id is not null;

create or replace function edit_business_transaction_amount(
  target_transaction uuid,
  target_amount numeric
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tx business_transactions%rowtype;
  new_tx uuid;
  reversal_id uuid;
  approval text := 'not_required';
  mode text;
  eligible_approvers int := 0;
  due_balance numeric := 0;
begin
  select * into tx
  from business_transactions
  where id = target_transaction
  for update;

  if tx.id is null then raise exception 'transaction_not_found'; end if;
  if not private.can_write_business(tx.business_id) then raise exception 'not_allowed'; end if;
  if tx.kind = 'reversal' or tx.reversed_at is not null then raise exception 'transaction_locked'; end if;
  if target_amount is null or target_amount <= 0 then raise exception 'invalid_amount'; end if;

  target_amount := round(target_amount, 2);
  if target_amount = tx.amount then return tx.id; end if;

  reversal_id := reverse_business_transaction(
    tx.id,
    'Amount edited from ' || tx.amount::text || ' to ' || target_amount::text
  );

  if tx.kind = 'reimbursement' then
    select coalesce(sum(le.amount), 0)
    into due_balance
    from business_ledger_entries le
    where le.business_id = tx.business_id
      and le.partner_id = tx.partner_id
      and le.bucket = 'partner_due';

    if due_balance < target_amount then
      raise exception 'reimbursement_exceeds_due';
    end if;
  end if;

  if tx.kind in ('expense','personal_expense') then
    select approval_mode into mode
    from businesses
    where id = tx.business_id;

    select count(*) into eligible_approvers
    from business_memberships bm
    where bm.business_id = tx.business_id
      and bm.status = 'active'
      and bm.user_id is not null
      and bm.user_id <> auth.uid()
      and bm.role in ('admin','partner');

    if mode <> 'none' and eligible_approvers > 0 then
      approval := 'pending';
    end if;
  end if;

  insert into business_transactions (
    business_id, kind, amount, account_id, to_account_id, partner_id, category_id,
    counterparty, note, approval_status, payment_status, due_date, paid_at,
    occurred_at, created_by, supersedes_transaction_id
  ) values (
    tx.business_id, tx.kind, target_amount, tx.account_id, tx.to_account_id, tx.partner_id, tx.category_id,
    tx.counterparty, tx.note, approval, tx.payment_status, tx.due_date, tx.paid_at,
    tx.occurred_at, auth.uid(), tx.id
  )
  returning id into new_tx;

  insert into business_ledger_entries (
    business_id, transaction_id, bucket, account_id, partner_id, amount
  )
  select
    le.business_id,
    new_tx,
    le.bucket,
    le.account_id,
    le.partner_id,
    round((le.amount / tx.amount) * target_amount, 2)
  from business_ledger_entries le
  where le.transaction_id = tx.id;

  insert into business_attachments (
    business_id, transaction_id, storage_path, file_name, mime_type, uploaded_by
  )
  select
    a.business_id, new_tx, a.storage_path, a.file_name, a.mime_type, a.uploaded_by
  from business_attachments a
  where a.transaction_id = tx.id;

  insert into business_activity_logs (
    business_id, actor_user_id, action, entity_type, entity_id, detail
  ) values (
    tx.business_id, auth.uid(), 'transaction_amount_edited', 'transaction', new_tx,
    jsonb_build_object(
      'old_transaction_id', tx.id,
      'reversal_id', reversal_id,
      'old_amount', tx.amount,
      'new_amount', target_amount,
      'approval_status', approval
    )
  );

  return new_tx;
end;
$$;

revoke execute on function edit_business_transaction_amount(uuid,numeric) from public, anon;
grant execute on function edit_business_transaction_amount(uuid,numeric) to authenticated;