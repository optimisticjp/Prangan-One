// Central domain types. Every record carries societyId (SaaS foundation).
//
// Role model (session-level; matches Prangan One roadmap doc section 4):
// - owner: platform-wide, every society, every action.
// - society_admin: full control of their own society only.
// - committee_member: manages enabled modules within their society, but
//   NOT billing/payments/settings unless that's explicitly true for them.
//   In the current localStorage demo this is enforced at the route level
//   (see permissions.ts); a real per-membership override flag is real
//   future work once Supabase memberships exist, not built here.
// - accountant: finance and reports only, unchanged from before.
// - resident_owner / resident_tenant: split out of the old single
//   'resident' role, because tenant access is governed by its own
//   per-society setting (see TenantAccessMode) and needs to be a real
//   permission distinction, not just a display label on the flat.
// - viewer: read-only, optional. Sees admin-level data, changes nothing.
export type Role =
  | 'owner' | 'society_admin' | 'committee_member' | 'accountant'
  | 'resident_owner' | 'resident_tenant' | 'viewer'

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
  maintenanceAmount: number; dueDay: number; upiId: string
  plan: string; flatsLimit: number
  receiptPrefix: string; themeKey: string; logoDataUrl?: string
  supportPhone?: string; modules: ModuleLayer; createdAt: string
  receiptSeq: number
  tenantAccess: TenantAccessMode
  subscriptionStatus: SubscriptionStatus
  graceStartedAt?: string  // set when entering grace; grace auto-reads as expired after 14 days, see subscription.ts
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
  canManageBilling?: boolean  // only meaningful for committee_member
  createdAt: string
}

export interface PublicLead {
  id: string; name: string; phone: string; email: string
  societyName: string; city: string; flatCount: number
  role: string; mainNeed: string; message?: string
  status: 'new' | 'contacted' | 'converted' | 'closed'; internalNote?: string
  createdAt: string
}

// Every owner "view as" / impersonation session gets one row. Read-only
// entry and any escalation to a write-capable session both get logged,
// per the roadmap's non-negotiable on this.
export interface ImpersonationLog {
  id: string; societyId: string; enteredAt: string; mode: 'readonly' | 'write'
  exitedAt?: string
}

export interface AuditLogEntry {
  id: string; societyId: string; at: string; actor: string
  action: string; detail: string
}

export interface Flat {
  id: string; societyId: string; number: string; floor: number
  ownerName: string; phone: string; email?: string; occupancy: 'owner' | 'tenant'
  tenantName?: string; tenantEmail?: string; sqft: number; memberSince: number
}
export interface Bill {
  id: string; societyId: string; flatId: string; month: string
  amount: number; paidAmount: number; dueDate: string; note?: string
}
export interface Payment {
  id: string; societyId: string; flatId: string; billId?: string
  date: string; amount: number; mode: PayMode; refNo?: string
  receiptNo?: string; status: 'success' | 'failed' | 'pending_confirmation'; note?: string
  cancelled?: boolean; cancelReason?: string
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
  hasPhoto?: boolean; photoName?: string; hasVoice?: boolean
}
export interface Notice {
  id: string; societyId: string; title: string; body: string
  date: string; category: string; pinned: boolean
}
export interface Doc {
  id: string; societyId: string; name: string; folder: string
  permission: DocPermission; date: string; size: string
}
export interface Poll {
  id: string; societyId: string; question: string; type: 'yesno' | 'multi'
  options: string[]; votes: Record<string, number>
  status: 'open' | 'closed'; resultVisible: boolean; endDate?: string
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
  impersonationLogs: ImpersonationLog[]
  auditLogs: AuditLogEntry[]
}
// societyId is the active tenant for this session: for a resident, derived
// from their flat; for society_admin/committee_member/accountant, the
// society they logged into or were switched into via the owner console's
// "enter society" action.
export interface Session { role: Role | null; flatId: string | null; societyId: string }
