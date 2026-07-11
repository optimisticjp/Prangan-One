// Central domain types. Every record carries societyId (SaaS foundation).
//
// Role model (session-level; matches Prangan One roadmap doc section 4):
// - owner: platform-wide, every society, every action. Kept as a
//   deliberate, standing decision (not the tighter "no automatic tenant
//   content access, controlled support sessions only" model a later
//   roadmap revision proposed) - revisit this later, not now.
// - society_admin: full control of their own society only.
// - committee_member: manages enabled modules within their society, but
//   NOT billing/payments/settings unless that's explicitly true for them.
//   In the current localStorage demo this is enforced at the route level
//   (see permissions.ts); a real per-membership override flag is real
//   future work once Supabase memberships exist, not built here.
// - accountant: the sole finance role, for now. An earlier pass split
//   this into accountant (records/confirms payments and expenses) and
//   treasurer (that, plus billing configuration and receipt cancellation)
//   - explicitly merged back into one role since the two dedicated page
//   surfaces that split was meant to support were never actually built,
//   and maintaining two roles with no real UI difference between them
//   just added confusion. Accountant now carries the fuller capability
//   set: billing configuration, bill generation, payment confirmation and
//   rejection, expenses, adjustments, and receipt cancellation with a
//   mandatory reason. Revisit splitting this again once/if it actually
//   gets its own distinct screens.
// - resident_owner / resident_tenant: split out of the old single
//   'resident' role, because tenant access is governed by its own
//   per-society setting (see TenantAccessMode) and needs to be a real
//   permission distinction, not just a display label on the flat.
// - auditor: read-only, optional. Sees permitted admin-level data
//   (financial reports, audit history), changes nothing. Renamed from the
//   old generic 'viewer' to match what it actually is.
export type Role =
  | 'owner' | 'society_admin' | 'committee_member' | 'accountant'
  | 'resident_owner' | 'resident_tenant' | 'auditor'

export type PayMode = 'cash' | 'upi' | 'cheque' | 'bank'
export type ComplaintStatus = 'new' | 'assigned' | 'inprogress' | 'done' | 'closed'
export type DocPermission = 'public' | 'committee' | 'accountant' | 'admin'

// Per-society: how much a tenant (as opposed to the flat's owner) can see
// and do. 'disabled' means tenants have no login at all for this society.
export type TenantAccessMode = 'disabled' | 'limited' | 'full'

// Subscription lifecycle. trial/active/grace all allow writes; paused and
// archived block them. See src/lib/subscription.ts for the write-guard
// logic itself (pure, unit-tested, no database needed to verify it).
export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'paused' | 'archived'

// Toggleable feature areas. Deny-nothing by default: a new society starts
// with everything on, and a committee turns off what it doesn't want.
// Deliberately does NOT include a visitor/gatekeeper key - out of scope.
export interface SocietyModules {
  billing: boolean
  complaints: boolean
  notices: boolean
  documents: boolean
  vendors: boolean
  polls: boolean
  events: boolean
  parking: boolean
  reports: boolean
}
export const defaultModules: SocietyModules = {
  billing: true, complaints: true, notices: true, documents: true,
  vendors: true, polls: true, events: true, parking: true, reports: true,
}

// Two layers, per the roadmap's module system section: ownerEnabled is set
// by the platform owner (what the society has paid for / been given).
// adminVisible is set by the society's own admin, within what the owner
// enabled, and only matters when ownerEnabled is true for that key (if the
// owner hasn't enabled it, the admin toggle for it is moot).
export interface ModuleLayer { ownerEnabled: SocietyModules; adminVisible: SocietyModules }
export const defaultModuleLayer: ModuleLayer = {
  ownerEnabled: { ...defaultModules },
  adminVisible: { ...defaultModules },
}

export interface Society {
  id: string; name: string; nameEn: string; address: string
  city: string; area: string
  // URL-safe, unique across the platform: pranganone.com/s/{slug}. Public
  // by design, since a resident needs it to find their own society -
  // never anything sensitive.
  slug: string
  // Short, human-typeable code (e.g. "RAJHANS7"), Google Classroom-style.
  // A resident types this into /join to self-enroll. Identifies WHICH
  // society, nothing more - it never grants access by itself, see
  // selfEnrollResident() in store.tsx for the actual matching/approval
  // logic. Fine to be guessable/shared in a WhatsApp group; the real
  // gate is matching flat + phone, or committee approval when they don't.
  joinCode: string
  maintenanceAmount: number; dueDay: number; upiId: string
  plan: string; flatsLimit: number
  receiptPrefix: string; themeKey: string; logoDataUrl?: string; logoUrl?: string
  supportPhone?: string; modules: ModuleLayer; createdAt: string
  receiptSeq: number
  tenantAccess: TenantAccessMode
  subscriptionStatus: SubscriptionStatus
  graceStartedAt?: string  // set when entering grace; grace auto-reads as expired after 14 days, see subscription.ts
  // Set once, when the society is actually activated and ready to use -
  // never at lead submission, never at the moment an empty society record
  // is created (see the onboarding wizard's activation step). A trial
  // auto-reads as expired 90 days after this, see subscription.ts.
  trialStartedAt?: string
}

// Platform-owner-side manual billing record, one per society per period.
export interface PlatformBillingRecord {
  id: string; societyId: string; periodMonth: string  // 'YYYY-MM'
  flatCount: number; ratePerFlat: number; expectedAmount: number
  receivedAmount: number; paymentDate?: string; mode?: PayMode
  status: 'unpaid' | 'partial' | 'paid' | 'waived'; internalNote?: string
}

// A membership is what real auth will resolve a logged-in email to: which
// society, which role, which flat (for residents). userId is null until a
// real Supabase auth user claims it, see docs/PRANGAN_ONE_ROADMAP.md and
// supabase/schema.sql for the claim-by-email flow this models.
export interface Membership {
  id: string; societyId: string; email: string; userId?: string
  role: Role; flatId?: string; phone?: string; whatsapp?: string
  // The name given at invite time (admin-added) or self-enrollment time
  // (/join) - not necessarily the same as Flat.ownerName/tenantName,
  // which is what the committee already had on file. Showing both side
  // by side is exactly what makes a pending approval easy to judge.
  name?: string
  canManageBilling?: boolean  // only meaningful for committee_member
  // 'active': usable immediately, this is every committee/accountant/owner
  // invite the admin added, plus a resident self-enrollment whose name or
  // phone matched what's already on file for that flat. 'pending': a
  // resident self-enrolled via a join code but nothing on file confirmed
  // they're really that flat's resident, so a committee member has to
  // approve it first, see approveMembership/rejectMembership in store.tsx.
  status: 'active' | 'pending'
  createdAt: string
}

// A logged attempt where someone entered an email at /login that matched
// no membership anywhere on the platform. Deliberately lightweight (just
// the email and when), separate from a full PublicLead - this captures
// real intent-to-log-in, which the owner console surfaces as its own
// signal, not mixed into the sales lead inbox. See NoAccess.tsx and
// Owner/UnmatchedAttempts.tsx.
export interface UnmatchedLoginAttempt {
  id: string; email: string; at: string
}

export interface PublicLead {
  id: string; name: string; phone: string; email: string
  societyName: string; city: string; flatCount: number
  role: string; mainNeed: string; message?: string
  status: 'new' | 'contacted' | 'converted' | 'closed'; internalNote?: string
  createdAt: string
}

// Every owner "view as" support session gets one row. Support is read-only
// now; the 'write' mode below is retained only so historical rows (including
// real write-mode ones from before write mode was removed from the product)
// stay valid and readable - no new write session can be created.
export interface ImpersonationLog {
  id: string; societyId: string; enteredAt: string; mode: 'readonly' | 'write'
  exitedAt?: string
  // The stated reason for the session, shown back to the owner in the
  // activity log and in the persistent support-mode banner while it's
  // active. Optional: readonly "just looking" entries and older historical
  // rows may carry none.
  reason?: string
}
/**
 * Tracks a real write that hasn't been confirmed saved yet - persisted as
 * part of DB (unlike the transient in-memory failedWrites list in
 * store.tsx), specifically so it survives a page reload rather than
 * silently vanishing while the actual unsaved record stays sitting in
 * local storage looking exactly like it saved fine. kind identifies
 * which real-write function resyncPendingWrite (store.tsx) should use to
 * retry it, looked up against the record's own current data in db, not a
 * captured closure from the original attempt (which can't survive being
 * saved to and reloaded from localStorage in the first place).
 */
export interface PendingSyncEntry {
  id: string
  kind: 'society' | 'flat' | 'flat-update' | 'membership' | 'bill-batch' | 'payment' | 'payment-confirm' | 'receipt-cancel'
    | 'adjustment' | 'complaint' | 'complaint-advance' | 'complaint-notes' | 'complaint-feedback'
    | 'notice' | 'notice-pin' | 'document' | 'expense' | 'vendor' | 'vendor-update' | 'poll' | 'poll-close' | 'poll-vote'
    | 'event' | 'event-contribution' | 'event-volunteer' | 'event-expense' | 'vehicle'
    | 'platform-billing' | 'platform-billing-update'
    | 'lead' | 'society-status'
  label: string
  /**
   * Only needed for kinds whose id isn't a real record's own id (poll
   * votes, event contributions/volunteers/expenses, and batch bill
   * generation all use a composite string id instead, e.g.
   * "vote-{pollId}-{flatId}") - parsing that back apart would be
   * unreliable since real ids are UUIDs and already contain hyphens.
   * Carries whatever resyncPendingWrite (store.tsx) actually needs to
   * look the real data back up after a reload, when the original
   * closure that captured it directly is gone.
   */
  context?: Record<string, string>
}

export interface AuditLogEntry {
  id: string; societyId: string; at: string; actor: string
  action: string; detail: string
}

export interface Flat {
  id: string; societyId: string; number: string; floor: number
  ownerName: string; phone: string; email?: string; occupancy: 'owner' | 'tenant'
  tenantName?: string; tenantEmail?: string; sqft: number; memberSince: number
  // Overrides the society's default maintenanceAmount for this one flat
  // when generating bills - a common real need (bigger flats, ground-floor
  // vs top-floor, whatever the society's own rule is). Undefined means
  // "use the society default", not "zero".
  maintenanceOverride?: number
}
export interface Bill {
  id: string; societyId: string; flatId: string; month: string
  amount: number; paidAmount: number; dueDate: string; note?: string
}
export interface Payment {
  id: string; societyId: string; flatId: string; billId?: string
  date: string; amount: number; mode: PayMode; refNo?: string
  receiptNo?: string; status: 'success' | 'failed' | 'pending_confirmation'; note?: string
  cancelled?: boolean; cancelReason?: string; proofPath?: string
}
export interface Expense {
  id: string; societyId: string; date: string; category: string
  vendorId?: string; amount: number; mode: PayMode; note?: string; billFile?: string
}
export interface Vendor {
  id: string; societyId: string; name: string; service: string
  contactPerson: string; phone: string; amcStart?: string; amcEnd?: string; notes?: string
}
export interface TimelineEntry { date: string; status: ComplaintStatus; note?: string; by: string }
export interface Complaint {
  id: string; societyId: string; flatId: string; category: string
  title: string; detail: string; priority: 'normal' | 'urgent'
  status: ComplaintStatus; assignedTo?: string; createdAt: string
  timeline: TimelineEntry[]; internalNotes: string[]
  feedback?: { rating: number; comment: string }
  hasPhoto?: boolean; photoName?: string; photoPath?: string; hasVoice?: boolean
  // 'personal': only the resident who filed it, plus committee/accountant/
  // owner (whoever can already manage complaints), ever see it -
  // a leaking tap in one specific bathroom, say. 'community': visible to
  // every authenticated member of the society, not just complaint
  // managers - a broken lift, a common-area leak, anything that affects
  // more than one flat and residents would reasonably want to see the
  // status of without having to ask the committee directly. Defaults to
  // 'personal' on anything filed before this existed - the safer default,
  // never widen an existing complaint's audience by assumption.
  visibility: 'personal' | 'community'
}
export interface Notice {
  id: string; societyId: string; title: string; body: string
  date: string; category: string; pinned: boolean
}
export interface Doc {
  id: string; societyId: string; name: string; folder: string
  permission: DocPermission; date: string; size: string; storagePath?: string
}
export interface Poll {
  id: string; societyId: string; question: string; type: 'yesno' | 'multi'
  options: string[]; votes: Record<string, number>
  status: 'open' | 'closed'; resultVisible: boolean; endDate?: string
  // Real sessions only. votes above is whatever poll_votes RLS actually
  // returns for the caller - the full picture for management, just their
  // own single vote for an ordinary resident - so counting it directly
  // undercounts for anyone who isn't management. resultCounts holds the
  // real, true aggregate (from the poll_results() function, which
  // aggregates without ever exposing whose vote is whose), used instead
  // of counting votes whenever it's present.
  resultCounts?: number[]
}
export interface SocietyEvent {
  id: string; societyId: string; name: string; type: string; date: string; note?: string
  contributions: { flatId: string; amount: number; date: string }[]
  volunteers: string[]
  expenses: { label: string; amount: number }[]
}
export interface Vehicle {
  id: string; societyId: string; flatId: string; kind: '2W' | '4W'
  number: string; slot: string; ownerType: string
}
export interface Contact {
  id: string; societyId: string; name: string; role: string; phone: string
  category: 'committee' | 'emergency' | 'service'
}
export interface Adjustment {
  id: string; societyId: string; date: string; flatId?: string
  amount: number; type: 'credit' | 'debit'; reason: string
}

export interface DB {
  version: number
  societies: Society[]
  flats: Flat[]
  bills: Bill[]
  payments: Payment[]
  expenses: Expense[]
  vendors: Vendor[]
  complaints: Complaint[]
  notices: Notice[]
  documents: Doc[]
  polls: Poll[]
  events: SocietyEvent[]
  vehicles: Vehicle[]
  contacts: Contact[]
  adjustments: Adjustment[]
  memberships: Membership[]
  platformBilling: PlatformBillingRecord[]
  leads: PublicLead[]
  unmatchedLoginAttempts: UnmatchedLoginAttempt[]
  impersonationLogs: ImpersonationLog[]
  auditLogs: AuditLogEntry[]
  pendingSync: PendingSyncEntry[]
}
// societyId is the active tenant for this session: for a resident, derived
// from their flat; for society_admin/committee_member/accountant, the
// society they logged into or were switched into via the owner console's
// "enter society" action.
// explicitSociety is false for a brand-new session that hasn't chosen a
// society on purpose yet - the default societyId below always resolves to
// SOMETHING so pages that need an active society never break, but /login
// checks this flag to know whether it's safe to show that society's own
// branding, or whether this is just a generic visitor who hasn't told the
// app which society they belong to. Set true by /s/:slug, a resolved
// membership, or picking a flat in the demo. See src/pages/Login.tsx.
//
// actingAsOwner is true only while the platform owner is inside a society
// via "support mode" (enterSociety) - it's what shows the persistent
// support-mode banner and is logged alongside the reason they gave, kept
// separate from explicitSociety since an owner acting as admin still has
// an explicit society, just also needs the extra visibility/accountability.
// isRealSession is deliberately separate from explicitSociety - both the
// demo's login() (picking a flat) and a real resolved login set
// explicitSociety true, so it can't be trusted to mean "this is genuinely
// Supabase-backed data, fetch real records." Only resolveRealSession (the
// one path AuthCallback.tsx calls after a real magic-link resolves) sets
// isRealSession true; every other session-setting function sets it false.
// See fetchSocietyFinancials in store.tsx, gated on exactly this flag -
// getting this gate wrong would mean demo and production data mixing,
// which the product's own hard separation requirement rules out entirely.
export interface Session {
  role: Role | null; flatId: string | null; societyId: string; explicitSociety: boolean; actingAsOwner: boolean; isRealSession: boolean
  // The mode a live owner support session is in. Only 'readonly' now: the
  // write-capable variant was removed from the product, and the database
  // trigger forces every new session to readonly, so no live session can
  // ever be anything else - the type says so rather than still offering a
  // 'write' a real session can never hold. (ImpersonationLog.mode keeps the
  // 'readonly' | 'write' union on purpose - it has to represent historical
  // rows, including real write-mode ones from before the removal.) Undefined
  // outside of actingAsOwner sessions.
  supportMode?: 'readonly'
}
