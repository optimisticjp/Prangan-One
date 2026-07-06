-- =================================================================
-- Prangan One - Supabase schema
-- =================================================================
-- This is NOT wired up yet. The running app uses localStorage
-- (see src/lib/store.tsx). This file is the target schema for when
-- someone connects a real Supabase project - see supabase/README.md
-- for the setup steps and CLAUDE_CODE_NEXT_STEPS.md for how the
-- swap fits into the codebase.
--
-- Design notes:
--   - Every society-owned table carries society_id, so one Supabase
--     project serves every society on the platform, and RLS scopes
--     every query to "societies I belong to."
--   - IDs are uuid, generated server-side. The demo's client-side
--     prefixed string IDs (e.g. "bill_101_2026-04") go away; nothing
--     in the frontend depends on their format, only on equality.
--   - Two places where the demo used a JSON blob get proper tables
--     here instead, because the DB can enforce a real constraint:
--       * poll votes -> poll_votes, with UNIQUE(poll_id, flat_id)
--         so "one vote per flat" is impossible to violate, not just
--         app logic that happens to check it.
--       * event contributions/volunteers/expenses -> their own
--         tables, so they can be queried and indexed properly.
--   - The subscription write-guard (trial/active/grace write, paused/
--     archived don't) is enforced HERE, in can_write() below, and
--     used inside every insert/update policy, not just in the
--     frontend. src/lib/subscription.ts has the same rule so the UI
--     can show/hide controls proactively, but the database is what
--     actually stops a write from a paused society; a browser-side
--     check can always be bypassed by someone editing their own client.
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
  -- is created. See can_write() above and src/lib/subscription.ts, which
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
--                      tenant_access setting (see is_tenant() above)
--   viewer           - read-only, sees admin-level data, changes nothing
create table memberships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,  -- null until claimed
  email          text not null,  -- set at invite time; matched against auth.users.email on claim
  name           text,  -- given at invite time or self-enrollment time, see /join
  -- Nullable ONLY for role = 'owner' (see the check constraint below) - a
  -- platform owner isn't scoped to one society, unlike every other role.
  -- Every has_role() check throughout this file special-cases this: an
  -- owner row with society_id null matches has_role(any_society, [...,
  -- 'owner']) regardless of which society is being asked about. Don't
  -- relax this to "nullable for everyone" - every other role still needs
  -- a real society_id, that's what scopes their access at all.
  society_id     uuid references societies(id) on delete cascade,
  flat_id        uuid,  -- fk added after flats table exists, see below
  role           text not null check (role in (
                   'owner', 'society_admin', 'treasurer', 'committee_member', 'accountant',
                   'resident_owner', 'resident_tenant', 'auditor'
                 )),
  phone          text,
  whatsapp       text,
  can_manage_billing boolean not null default false,  -- only meaningful when role = committee_member
  -- 'active': usable immediately (every admin-added invite, or a /join
  -- self-enrollment whose phone matched the flat on file). 'pending': a
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
-- further down, right after enforce_membership_insert() is defined - it
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

-- Owner "view as" / impersonation sessions. Every entry into a society as
-- its admin gets logged here, read-only or write-capable, per the
-- roadmap's non-negotiable: "every impersonation/view as session is
-- logged; read-only by default with an explicit act-as-admin toggle that
-- is also logged."
create table impersonation_logs (
  id          uuid primary key default gen_random_uuid(),
  society_id  uuid not null references societies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  mode        text not null check (mode in ('readonly', 'write')),
  entered_at  timestamptz not null default now(),
  exited_at   timestamptz
);

-- -----------------------------------------------------------------
-- Helper functions (used inside RLS policies below)
-- -----------------------------------------------------------------

-- Is the current auth user a member of this society, in any role?
create or replace function is_society_member(target_society uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from memberships m
    where m.society_id = target_society
      and m.user_id = auth.uid()
  );
$$;

-- Does the current auth user hold one of the given roles in this society?
create or replace function has_role(target_society uuid, roles text[])
returns boolean
language sql
security definer
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
create or replace function my_flat_id(target_society uuid)
returns uuid
language sql
security definer
stable
as $$
  select m.flat_id from memberships m
  where m.society_id = target_society
    and m.user_id = auth.uid()
  limit 1;
$$;

-- Is the current user a tenant (resident_tenant role) for this society?
create or replace function is_tenant(target_society uuid)
returns boolean
language sql
security definer
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
create or replace function can_write(target_society uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  s record;
begin
  if has_role(target_society, array['owner']) then
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
-- Important: this checks session_user, not just auth.uid()/has_role(),
-- and that's deliberate, not redundant. A direct SQL editor session (used
-- to manually bootstrap the very first owner/admin membership, since
-- nothing privileged exists yet to grant it through the app) and a
-- genuinely anonymous public /join submission both have auth.uid() = null
-- - there's no JWT in either case. The only real difference is *which
-- Postgres role* the connection is using: 'postgres'/'service_role' for a
-- direct/trusted connection, 'anon'/'authenticated' for anything that
-- came through Supabase's public API. Checking has_role() alone would
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
create or replace function find_society_id_by_join_code(target_code text)
returns uuid
language sql
security definer
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
create or replace function find_flat_for_join(target_society uuid, target_flat_number text)
returns uuid
language sql
security definer
stable
as $$
  select id from flats
  where society_id = target_society
    and lower(trim(number)) = lower(trim(target_flat_number))
  limit 1;
$$;

create or replace function enforce_membership_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  flat_row flats;
  society_row societies;
begin
  if session_user in ('postgres', 'service_role', 'supabase_admin')
     or has_role(new.society_id, array['owner', 'society_admin', 'committee_member']) then
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
as $$
declare
  resolved_society uuid;
  resolved_flat uuid;
  new_status text;
begin
  resolved_society := find_society_id_by_join_code(target_join_code);
  if resolved_society is null then
    raise exception using errcode = 'P0001', message = 'society_not_found';
  end if;

  resolved_flat := find_flat_for_join(resolved_society, target_flat_number);
  if resolved_flat is null then
    raise exception using errcode = 'P0002', message = 'flat_not_found';
  end if;

  insert into memberships (email, society_id, flat_id, role, phone, name)
  values (lower(trim(given_email)), resolved_society, resolved_flat, 'resident_owner', given_phone, given_name)
  returning status into new_status;

  return new_status;
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
  for each row execute function enforce_membership_insert();

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
-- that represents a normal write also checks can_write(society_id), so
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
-- find_society_id_by_join_code() above cover both, without exposing
-- join_code, subscription_status, plan, or anything else business-
-- sensitive to someone who isn't a member of anything yet.
create policy societies_select on societies for select
  using (is_society_member(id) or has_role(id, array['owner']));
create policy societies_update on societies for update
  using (has_role(id, array['society_admin', 'owner']));

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
    or is_society_member(society_id)
    or has_role(society_id, array['owner'])
    or (user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
create policy memberships_insert on memberships for insert
  with check (
    has_role(society_id, array['society_admin', 'owner'])
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
  using (has_role(society_id, array['society_admin', 'owner']))
  with check (has_role(society_id, array['society_admin', 'owner']));
create policy memberships_delete on memberships for delete
  using (has_role(society_id, array['society_admin', 'owner']));

-- flats: any member reads all flats in their society; only society_admin writes
create policy flats_select on flats for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy flats_insert on flats for insert
  with check (has_role(society_id, array['society_admin']) and can_write(society_id));
create policy flats_update on flats for update
  using (has_role(society_id, array['society_admin']) and can_write(society_id));

-- bills: members read their society's bills; only society_admin generates them
create policy bills_select on bills for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy bills_insert on bills for insert
  with check (has_role(society_id, array['society_admin', 'treasurer']) and can_write(society_id));
create policy bills_update on bills for update
  using (has_role(society_id, array['society_admin', 'treasurer', 'accountant']) and can_write(society_id));  -- paid_amount updates on payment

-- payments: members read their society's payments; accountant+society_admin
-- record them; residents can insert their OWN pending_confirmation "I have
-- paid" rows for their own flat, nothing else
create policy payments_select on payments for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy payments_insert on payments for insert
  with check (
    can_write(society_id)
    and (
      has_role(society_id, array['society_admin', 'treasurer', 'accountant'])
      or (flat_id = my_flat_id(society_id) and status = 'pending_confirmation')
    )
  );
create policy payments_update on payments for update
  using (has_role(society_id, array['society_admin', 'treasurer', 'accountant']) and can_write(society_id));

-- expenses: members read; accountant+treasurer+society_admin write
create policy expenses_select on expenses for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy expenses_insert on expenses for insert
  with check (has_role(society_id, array['society_admin', 'treasurer', 'accountant', 'committee_member']) and can_write(society_id));

-- vendors: members read; society_admin and committee_member write
create policy vendors_select on vendors for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy vendors_insert on vendors for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));
create policy vendors_update on vendors for update
  using (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

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
    has_role(society_id, array['owner', 'society_admin', 'committee_member', 'treasurer', 'accountant'])
    or flat_id = my_flat_id(society_id)
    or (visibility = 'community' and is_society_member(society_id))
  );
create policy complaints_insert on complaints for insert
  with check (
    can_write(society_id)
    and (
      has_role(society_id, array['society_admin', 'committee_member'])
      or (
        flat_id = my_flat_id(society_id)
        and (not is_tenant(society_id) or (select tenant_access from societies where id = society_id) != 'disabled')
      )
    )
  );
create policy complaints_update on complaints for update
  using (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

create policy complaint_timeline_select on complaint_timeline for select
  using (exists (
    select 1 from complaints c
    where c.id = complaint_timeline.complaint_id
      and (
        has_role(c.society_id, array['owner', 'society_admin', 'committee_member', 'treasurer', 'accountant'])
        or c.flat_id = my_flat_id(c.society_id)
        or (c.visibility = 'community' and is_society_member(c.society_id))
      )
  ));
create policy complaint_timeline_insert on complaint_timeline for insert
  with check (exists (
    select 1 from complaints c
    where c.id = complaint_timeline.complaint_id
      and has_role(c.society_id, array['society_admin', 'committee_member'])
      and can_write(c.society_id)
  ));

-- notices: members read; society_admin/committee_member publish
create policy notices_select on notices for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy notices_insert on notices for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));
create policy notices_update on notices for update
  using (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

-- documents: readable only if the member's role satisfies the document's
-- own permission column, not just society membership, and only if a
-- tenant's access mode allows documents at all (limited mode hides them)
create policy documents_select on documents for select
  using (
    has_role(society_id, array['owner'])
    or (
      is_society_member(society_id)
      and (not is_tenant(society_id) or (select tenant_access from societies where id = documents.society_id) = 'full')
      and (
        permission = 'public'
        or (permission = 'committee' and has_role(society_id, array['society_admin', 'committee_member']))
        or (permission = 'accountant' and has_role(society_id, array['society_admin', 'accountant']))
        or (permission = 'admin' and has_role(society_id, array['society_admin']))
      )
    )
  );
create policy documents_insert on documents for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

-- polls: members read; society_admin/committee_member create/close
create policy polls_select on polls for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy polls_insert on polls for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));
create policy polls_update on polls for update
  using (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

-- poll_votes: a resident can insert exactly one row for their own flat
-- (the UNIQUE constraint above blocks a second one); a tenant can only
-- vote if the society's tenant_access is 'full' ("joinPollsEvents" in
-- src/lib/permissions.ts::tenantCapabilities); everyone in the society
-- can read the votes (individual ballots aren't secret from the
-- committee, only the running tally is optionally hidden via
-- polls.result_visible, which the app enforces in the UI)
create policy poll_votes_select on poll_votes for select
  using (exists (
    select 1 from polls p where p.id = poll_votes.poll_id and (is_society_member(p.society_id) or has_role(p.society_id, array['owner']))
  ));
create policy poll_votes_insert on poll_votes for insert
  with check (exists (
    select 1 from polls p
    where p.id = poll_votes.poll_id
      and p.status = 'open'
      and can_write(p.society_id)
      and flat_id = my_flat_id(p.society_id)
      and (not is_tenant(p.society_id) or (select tenant_access from societies where id = p.society_id) = 'full')
  ));

-- events + sub-tables: members read; society_admin/committee_member manage
-- the event itself; any member can add a contribution/volunteer signup
-- for their own flat (tenants only if tenant_access = 'full')
create policy events_select on events for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy events_insert on events for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

create policy event_contributions_select on event_contributions for select
  using (exists (select 1 from events e where e.id = event_id and (is_society_member(e.society_id) or has_role(e.society_id, array['owner']))));
create policy event_contributions_insert on event_contributions for insert
  with check (exists (
    select 1 from events e where e.id = event_id
      and can_write(e.society_id)
      and (
        has_role(e.society_id, array['society_admin', 'committee_member'])
        or (flat_id = my_flat_id(e.society_id) and (not is_tenant(e.society_id) or (select tenant_access from societies where id = e.society_id) = 'full'))
      )
  ));

create policy event_volunteers_select on event_volunteers for select
  using (exists (select 1 from events e where e.id = event_id and (is_society_member(e.society_id) or has_role(e.society_id, array['owner']))));
create policy event_volunteers_insert on event_volunteers for insert
  with check (exists (select 1 from events e where e.id = event_id and is_society_member(e.society_id) and can_write(e.society_id)));

create policy event_expenses_select on event_expenses for select
  using (exists (select 1 from events e where e.id = event_id and (is_society_member(e.society_id) or has_role(e.society_id, array['owner']))));
create policy event_expenses_insert on event_expenses for insert
  with check (exists (select 1 from events e where e.id = event_id and has_role(e.society_id, array['society_admin', 'committee_member']) and can_write(e.society_id)));

-- vehicles: members read (tenants only if tenant_access = 'full'); society_admin manages
create policy vehicles_select on vehicles for select
  using (
    has_role(society_id, array['owner'])
    or (is_society_member(society_id) and (not is_tenant(society_id) or (select tenant_access from societies where id = vehicles.society_id) = 'full'))
  );
create policy vehicles_insert on vehicles for insert
  with check (has_role(society_id, array['society_admin', 'committee_member']) and can_write(society_id));

-- contacts: members read; society_admin manages
create policy contacts_select on contacts for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy contacts_insert on contacts for insert
  with check (has_role(society_id, array['society_admin']) and can_write(society_id));

-- adjustments: members read; accountant+society_admin write
create policy adjustments_select on adjustments for select
  using (is_society_member(society_id) or has_role(society_id, array['owner']));
create policy adjustments_insert on adjustments for insert
  with check (has_role(society_id, array['society_admin', 'treasurer', 'accountant']) and can_write(society_id));

-- platform_billing, public_leads, audit_logs, impersonation_logs: owner-only,
-- always, in every direction. These are the platform's own operational
-- records, not a society's data - no society_admin/committee_member/
-- resident should ever see these regardless of subscription status.
create policy platform_billing_all on platform_billing for all
  using (has_role(society_id, array['owner']))
  with check (has_role(society_id, array['owner']));

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
  using (has_role(society_id, array['owner']) or has_role(society_id, array['society_admin']));
create policy audit_logs_insert on audit_logs for insert
  with check (true);  -- system-inserted from application logic on the actions being audited

create policy impersonation_logs_all on impersonation_logs for all
  using (has_role(society_id, array['owner']))
  with check (has_role(society_id, array['owner']));

-- =================================================================
-- End of schema. See supabase/README.md for how to apply this and
-- for the storage bucket setup (documents, complaint photos, logos).
-- =================================================================
