/**
 * Local-first data layer, now multi-tenant, with the full role model and
 * subscription write-guard.
 *
 * Everything lives in one DB object persisted to localStorage. First run
 * seeds from /sample-data/*.json. "ડેમો ડેટા રીસેટ" in Settings clears the
 * key and re-seeds.
 *
 * Multi-tenancy: db.societies is always the FULL list (every society on the
 * platform - the owner console needs to see all of them). Every other
 * society-owned table is scoped to the active society (session.societyId)
 * before it's handed to pages. The raw, unscoped state lives in this file
 * only; nothing outside it ever sees cross-society data by accident.
 *
 * Write guard: every mutating action goes through guardedSetDb, which
 * checks canWrite() (src/lib/subscription.ts) before touching state. Owner
 * writes are never blocked. This is a real, working guard against the LOCAL
 * state - it is NOT a substitute for the Supabase RLS enforcement that has
 * to exist once this swaps to a real backend (see supabase/schema.sql),
 * since a browser-side check can always be bypassed by someone editing
 * their own client. Real enforcement lives in the database, always.
 *
 * Swap plan (see CLAUDE_CODE_NEXT_STEPS.md and docs/PRANGAN_ONE_ROADMAP.md):
 * keep this file's public API (useData + action names) and replace the
 * internals with Supabase calls. Pages never touch localStorage directly,
 * so the swap stays contained here. See src/lib/data/ for the adapter split
 * that makes this swap concrete rather than aspirational.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Adjustment, AuditLogEntry, Bill, Complaint, ComplaintStatus, DB, Doc, DocPermission, Expense,
  Flat, ImpersonationLog, Membership, ModuleLayer, Notice, PayMode, Payment, Poll, PublicLead,
  Role, Session, Society, SocietyEvent, SocietyModules, SubscriptionStatus, TenantAccessMode, Vehicle, Vendor,
} from './types'
import { uid, realUid } from './id'
import { supabaseConfigured } from './supabase'
import {
  fetchSocietyFinancials, insertFlatReal, updateFlatReal, insertBillsReal, recordPaymentReal, updateBillPaidAmountReal, updatePaymentReal, insertAdjustmentReal,
  fetchSocietyComplaints, insertComplaintReal, advanceComplaintReal, updateComplaintNotesReal, updateComplaintFeedbackReal, updateComplaintPhotoPathReal,
  fetchSocietyNotices, insertNoticeReal, updateNoticePinnedReal,
  uploadSocietyLogo, uploadPrivateFile, getSignedFileUrl,
  fetchSociety, fetchAllSocieties, insertSocietyReal, updateSocietyReal, updateSocietyStatusReal,
  fetchSocietyDocuments, insertDocumentReal, updateDocumentStoragePathReal,
  fetchSocietyMemberships, approveMembershipReal, rejectMembershipReal, insertMembershipReal,
  fetchSocietyVendors, insertVendorReal, updateVendorReal,
  fetchSocietyVehicles, insertVehicleReal,
  fetchSocietyContacts,
  fetchSocietyPolls, insertPollReal, closePollReal, insertPollVoteReal,
  fetchSocietyEvents, insertEventReal, insertContributionReal, insertVolunteerReal, insertEventExpenseReal,
  fetchAllFlatsForOwner, fetchAllMembershipsForOwner,
  fetchAllPlatformBilling, insertPlatformBillingReal, updatePlatformBillingReal,
  fetchAllAuditLogs, fetchAllImpersonationLogs, insertImpersonationLogReal, exitImpersonationLogReal,
} from './realData'

// A short, human-typeable code a resident enters at /join to find their
// society - like a Google Classroom class code. Derived from the
// society's English name (first consonant-ish letters) plus a couple of
// random digits, so it's memorable and shareable in a WhatsApp group
// message, not a random opaque string. Collision handling (regenerate on
// clash) lives in the addSociety call site below.
function generateJoinCode(nameEn: string): string {
  const letters = nameEn.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'SOCIETY'
  const digits = Math.floor(10 + Math.random() * 89) // 2 digits, 10-98
  return `${letters}${digits}`
}
import { todayISO } from './format'
import { applyTheme } from './theme/apply'
import { defaultThemeKey } from './theme/presets'
import { canWrite, statusBanner } from './subscription'

import societiesJson from '../../sample-data/societies.json'
import flatsJson from '../../sample-data/flats.json'
import billsJson from '../../sample-data/bills.json'
import paymentsJson from '../../sample-data/payments.json'
import expensesJson from '../../sample-data/expenses.json'
import vendorsJson from '../../sample-data/vendors.json'
import complaintsJson from '../../sample-data/complaints.json'
import noticesJson from '../../sample-data/notices.json'
import documentsJson from '../../sample-data/documents.json'
import pollsJson from '../../sample-data/polls.json'
import eventsJson from '../../sample-data/events.json'
import vehiclesJson from '../../sample-data/vehicles.json'
import contactsJson from '../../sample-data/contacts.json'
import adjustmentsJson from '../../sample-data/adjustments.json'
import membershipsJson from '../../sample-data/memberships.json'
import platformBillingJson from '../../sample-data/platformBilling.json'
import leadsJson from '../../sample-data/leads.json'
import auditLogsJson from '../../sample-data/auditLogs.json'
import impersonationLogsJson from '../../sample-data/impersonationLogs.json'

const DB_KEY = 'rt_db_v3'
const SESSION_KEY = 'rt_session_v3'
export const DEFAULT_SOCIETY_ID = 'soc_rajhans'

function buildSeed(): DB {
  return {
    version: 3,
    societies: societiesJson as unknown as Society[],
    flats: flatsJson as unknown as Flat[],
    bills: billsJson as unknown as Bill[],
    payments: paymentsJson as unknown as Payment[],
    expenses: expensesJson as unknown as Expense[],
    vendors: vendorsJson as never,
    complaints: complaintsJson as unknown as Complaint[],
    notices: noticesJson as unknown as Notice[],
    documents: documentsJson as unknown as Doc[],
    polls: pollsJson as unknown as Poll[],
    events: eventsJson as unknown as SocietyEvent[],
    vehicles: vehiclesJson as unknown as Vehicle[],
    contacts: contactsJson as never,
    adjustments: adjustmentsJson as unknown as Adjustment[],
    memberships: membershipsJson as unknown as Membership[],
    platformBilling: platformBillingJson as unknown as import('./types').PlatformBillingRecord[],
    leads: leadsJson as unknown as PublicLead[],
    unmatchedLoginAttempts: [],
    auditLogs: auditLogsJson as unknown as AuditLogEntry[],
    impersonationLogs: impersonationLogsJson as unknown as ImpersonationLog[],
  }
}

// A minimal, safe society object - never null, never crashes anything
// that reads society.whatever. Used both for the VITE_DEMO_SEED=false
// empty-start case below, and as activeSociety's own fallback when
// db.societies is genuinely empty (a real session with zero real
// societies yet, e.g. the owner's very first real login before creating
// one) - that case used to leave activeSociety as literal undefined,
// which crashed the moment any code (there wasn't just one place, which
// is exactly why this needed a structural fix rather than a single
// guard) read a field off it expecting a real object to always be there.
function placeholderSociety(): Society {
  return {
    id: 'soc_placeholder', name: 'તમારી સોસાયટી', nameEn: 'Your Society', slug: 'your-society',
    joinCode: 'WELCOME',
    address: '', city: '', area: '', maintenanceAmount: 1000, dueDay: 10, upiId: '',
    plan: 'trial', flatsLimit: 50, receiptPrefix: 'SOC',
    themeKey: defaultThemeKey, receiptSeq: 1, createdAt: todayISO(),
    tenantAccess: 'full', subscriptionStatus: 'trial',
    modules: {
      ownerEnabled: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
      adminVisible: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
    },
  }
}

// Used when VITE_DEMO_SEED=false: no Rajhans/lead sample data, just enough
// to boot safely (one placeholder society, so activeSociety always resolves
// to something) until the owner creates a real one from /owner/societies/new.
// This is a stopgap for the localStorage era only - once the Supabase swap
// lands, a fresh project is naturally empty and this stops being relevant.
function emptySeed(): DB {
  return {
    version: 3, societies: [placeholderSociety()], flats: [], bills: [], payments: [],
    expenses: [], vendors: [], complaints: [], notices: [], documents: [],
    polls: [], events: [], vehicles: [], contacts: [], adjustments: [],
    memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: [], auditLogs: [], impersonationLogs: [],
  }
}

// Demo/sample data is on by default (so `npm run dev` with no .env still
// shows a working demo), and can be switched off with VITE_DEMO_SEED=false
// for a deployment that should start clean. See .env.example.
const DEMO_SEED_ENABLED = import.meta.env.VITE_DEMO_SEED !== 'false'

// Every array field on DB, used by loadDB below to defensively backfill
// anything missing from an old saved snapshot. The DB shape has grown
// many new fields across sessions (documents, polls, vehicles, contacts,
// unmatchedLoginAttempts, and more) without the version number ever
// being bumped to match - so a browser holding an older saved state
// still passes the version check, but comes back missing whatever was
// added since. That's exactly what caused a real crash: a page assuming
// unmatchedLoginAttempts was always an array, hit an older saved db
// where the field simply didn't exist yet.
const DB_ARRAY_FIELDS: (keyof DB)[] = [
  'societies', 'flats', 'bills', 'payments', 'expenses', 'vendors', 'complaints', 'notices',
  'documents', 'polls', 'events', 'vehicles', 'contacts', 'adjustments', 'memberships',
  'platformBilling', 'leads', 'unmatchedLoginAttempts', 'auditLogs', 'impersonationLogs',
]
function backfillDB(parsed: DB, fresh: DB): DB {
  const result = { ...parsed }
  for (const key of DB_ARRAY_FIELDS) {
    if (!Array.isArray(result[key])) (result[key] as unknown) = fresh[key]
  }
  return result
}

function loadDB(): DB {
  const fresh = DEMO_SEED_ENABLED ? buildSeed() : emptySeed()
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed && parsed.version === 3) return backfillDB(parsed, fresh)
    }
  } catch {
    /* corrupted -> reseed */
  }
  return fresh
}
function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Session
      if (parsed && parsed.societyId) return parsed
    }
  } catch { /* ignore */ }
  return { role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false }
}

/* ------------------------------------------------------------------ */

interface NewSocietyInput {
  name: string; nameEn: string; address: string; city: string; area: string
  maintenanceAmount: number; dueDay: number; receiptPrefix: string
  themeKey: string; logoDataUrl?: string; supportPhone?: string
  modules: ModuleLayer; tenantAccess: TenantAccessMode
}

interface Store {
  db: DB
  /** Unscoped, every society's data. Owner-console pages only - RoleGate
   * already restricts /owner/* to the owner role, so this is safe there.
   * Never read this from a resident/admin/accountant-facing page, that
   * would defeat the entire point of scoping db above. */
  rawDb: DB
  session: Session
  society: Society
  /** True while flats/bills/payments/adjustments are being fetched from
   * the real database for a real (Supabase-backed) session - false for
   * the local demo layer, which never needs it since everything's
   * already in memory. Pages showing money should check this before
   * rendering "nothing owed"/"no bills yet" so a real fetch in progress
   * doesn't briefly look like an empty, all-paid-up account. */
  financialsLoading: boolean
  /** Why the most recent write attempt was blocked, if it was - null
   * means either nothing's been blocked yet, or the last attempt
   * succeeded. Set by guardedSetDb; check this after a mutation returns
   * false/null to show the person something real instead of nothing
   * happening. */
  lastBlockedReason: string | null
  /* subscription / write guard */
  canWriteNow: boolean
  subscriptionBannerFor: (audience: 'admin' | 'resident') => string | null
  setSubscriptionStatus: (societyId: string, status: SubscriptionStatus) => void
  /* session */
  login: (role: Role, flatId?: string) => void
  logout: () => void
  enterSociety: (societyId: string, role: Role, mode?: 'readonly' | 'write', reason?: string) => void
  exitImpersonation: () => void
  /** Public lookup by slug (pranganone.com/s/rajhans-tower) - only exposes
   * non-sensitive metadata the caller already gets: name, logo, theme,
   * area. Works with no session/role at all, since a visitor hasn't
   * logged in yet. */
  findSocietyBySlug: (slug: string) => Society | undefined
  /** Sets which society's branding/theme shows on the login screen, without
   * granting any role or access - the actual login step still happens
   * separately. Used by the share-link handoff. */
  setActiveSocietyContext: (societyId: string) => void
  /** Public lookup by join code (Google Classroom-style, entered at
   * /join) - only exposes non-sensitive metadata, same spirit as
   * findSocietyBySlug. */
  findSocietyByJoinCode: (code: string) => Society | undefined
  /** A resident self-enrolling via /join: society join code + their flat
   * number + name/phone/email. Auto-confirms (status 'active') when the
   * email matches what's already on file for that flat; otherwise creates
   * a 'pending' membership a committee member has to approve. Matches on
   * email, not phone - a phone number isn't a secret, so matching on it
   * would let anyone who knew a resident's number claim their flat with
   * their own email. Never lets a tenant in when the society's
   * tenantAccess is 'disabled'. */
  selfEnrollResident: (input: { joinCode: string; flatNumber: string; name: string; phone: string; email: string }) =>
    { ok: true; status: 'active' | 'pending' } | { ok: false; error: 'society_not_found' | 'flat_not_found' | 'tenant_access_disabled' | 'already_enrolled' }
  /** Committee approves a resident's pending self-enrollment (see
   * selfEnrollResident above). Flips status to 'active', nothing else. */
  approveMembership: (membershipId: string) => void
  /** Committee rejects a pending self-enrollment - removes it outright,
   * rather than leaving a rejected row around; they can just try again
   * with the committee's help if it was a genuine mistake. */
  rejectMembership: (membershipId: string) => void
  /** Logs an email that was typed at /login but matched no membership
   * anywhere - see NoAccess.tsx. Deliberately just the email, no other
   * PII, and separate from the full lead-capture flow on /contact. */
  logUnmatchedLoginAttempt: (email: string) => void
  /** Sets the session directly from a real, claimed Supabase membership
   * (see claimMemberships in auth.ts) - used only by AuthCallback.tsx,
   * once real login has resolved to exactly one membership. Distinct from
   * login()/enterSociety(), which are demo and owner-support-mode paths
   * with their own logging semantics. */
  resolveRealSession: (membership: { role: Role; societyId: string; flatId: string | null }) => void
  /* derived helpers */
  flatById: (id: string) => Flat | undefined
  billStatus: (b: Bill) => 'paid' | 'pending' | 'overdue'
  flatPending: (flatId: string) => number
  totalPending: () => number
  monthIncome: (month: string) => number
  monthExpense: (month: string) => number
  moduleEnabled: (key: keyof SocietyModules) => boolean
  adminCanToggle: (key: keyof SocietyModules) => boolean
  /* billing + payments */
  /** What generateBills(month) would actually do, without doing it - lets the admin see the total, any per-flat overrides, and any existing credit that would auto-apply, before confirming. */
  previewBillGeneration: (month: string) => { flatId: string; flatNumber: string; amount: number; alreadyExists: boolean; creditApplied: number }[]
  generateBills: (month: string) => number
  /** proofFile is only actually uploaded during a real session, same reasoning as addComplaint's photoFile. */
  recordPayment: (p: {
    flatId: string; billId?: string; amount: number; mode: PayMode
    refNo?: string; note?: string; failed?: boolean; date?: string
    pending?: boolean; proofFile?: File
  }) => Payment | null
  confirmPendingPayment: (paymentId: string) => void
  cancelReceipt: (paymentId: string, reason: string) => void
  /* complaints */
  /** photoFile is only actually uploaded during a real session (see realData.ts's uploadPrivateFile) - during the local demo, photoName alone is stored, matching how the demo has always worked. */
  addComplaint: (c: { flatId: string; category: string; title: string; detail: string; priority: 'normal' | 'urgent'; photoName?: string; photoFile?: File; visibility?: 'personal' | 'community' }) => Complaint | null
  advanceComplaint: (id: string, status: ComplaintStatus, note: string, by: string, assignedTo?: string) => void
  addInternalNote: (id: string, note: string) => void
  addFeedback: (id: string, rating: number, comment: string) => void
  /** A temporary, authenticated URL for a real, uploaded complaint photo - regenerated fresh each call, since a signed URL expires and isn't meant to be cached or stored. Only works during a real session; returns null otherwise (the local demo never had real photo bytes to show in the first place). */
  getComplaintPhotoUrl: (photoPath: string) => Promise<string | null>
  /** Same reasoning as getComplaintPhotoUrl - a temporary signed URL for a payment's uploaded proof screenshot, real sessions only. */
  getPaymentProofUrl: (proofPath: string) => Promise<string | null>
  /** Uploads a society's logo and saves the resulting URL onto that society's own record, real sessions only. Returns the URL on success, null otherwise (including during the local demo, which still uses logoDataUrl set directly on the society object instead). */
  uploadSocietyLogoAndSave: (societyId: string, file: File) => Promise<string | null>
  /* content */
  addNotice: (n: { title: string; body: string; category: string; pinned: boolean }) => void
  togglePin: (id: string) => void
  addExpense: (e: { date: string; category: string; vendorId?: string; amount: number; mode: PayMode; note?: string; billFile?: string }) => void
  addVendor: (v: { name: string; service: string; contactPerson: string; phone: string; amcStart?: string; amcEnd?: string; notes?: string }) => void
  updateVendor: (id: string, patch: Partial<Omit<import('./types').Vendor, 'id' | 'societyId'>>) => void
  /** file is only actually uploaded during a real session, same reasoning as addComplaint's photoFile. */
  addDocumentMeta: (d: { name: string; folder: string; permission: DocPermission; size: string; file?: File }) => void
  /** A temporary, authenticated URL for a real, uploaded document - real sessions only, same shape as getComplaintPhotoUrl. */
  getDocumentUrl: (storagePath: string) => Promise<string | null>
  /* polls */
  addPoll: (p: { question: string; type: 'yesno' | 'multi'; options: string[]; resultVisible: boolean; endDate?: string }) => void
  closePoll: (id: string) => void
  vote: (pollId: string, flatId: string, optionIdx: number) => boolean
  /* events */
  addEvent: (e: { name: string; type: string; date: string; note?: string }) => void
  addContribution: (eventId: string, flatId: string, amount: number) => void
  addVolunteer: (eventId: string, name: string) => void
  addEventExpense: (eventId: string, label: string, amount: number) => void
  /* misc */
  addVehicle: (v: { flatId: string; kind: '2W' | '4W'; number: string; slot: string; ownerType: string }) => void
  addFlat: (f: { number: string; floor: number; ownerName: string; phone: string; email?: string; occupancy: 'owner' | 'tenant'; tenantName?: string; tenantEmail?: string; sqft: number }) => void
  /** Currently used for setting/clearing a flat's maintenanceOverride - kept generic (any Flat field) since a fuller edit form is real future work, not built yet. */
  updateFlat: (flatId: string, patch: Partial<Flat>) => void
  addFlatsBulk: (rows: { number: string; floor: number; ownerName: string; phone: string; email?: string; occupancy: 'owner' | 'tenant'; tenantName?: string; tenantEmail?: string; sqft: number }[]) => { added: number; skippedDuplicates: string[] }
  addAdjustment: (a: { date: string; flatId?: string; amount: number; type: 'credit' | 'debit'; reason: string }) => void
  updateSociety: (patch: Partial<Society>) => void
  /* membership */
  addMembership: (m: { societyId: string; email: string; role: Role; flatId?: string; phone?: string; whatsapp?: string; canManageBilling?: boolean; name?: string }) => Membership | null
  /* owner backend */
  addSociety: (s: NewSocietyInput) => Society
  /** Sets trialStartedAt for real - the moment a society is actually ready to use, not the moment its record was created. See the comment on Society.trialStartedAt in types.ts and subscription.ts for why this distinction is a real requirement, not just tidiness: a society with no trialStartedAt yet never has its trial read as expired, since effectiveStatus only checks expiry once a start date actually exists. */
  activateSociety: (societyId: string) => void
  updateSocietyById: (id: string, patch: Partial<Society>) => void
  addPlatformBillingRecord: (r: Omit<import('./types').PlatformBillingRecord, 'id'>) => void
  updatePlatformBillingRecord: (id: string, patch: Partial<import('./types').PlatformBillingRecord>) => void
  addLead: (l: Omit<PublicLead, 'id' | 'status' | 'createdAt'>) => void
  updateLeadStatus: (id: string, status: PublicLead['status'], internalNote?: string) => void
  resetAll: () => void
}

const Ctx = createContext<Store | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDB)
  const [session, setSession] = useState<Session>(loadSession)
  const [financialsLoading, setFinancialsLoading] = useState(false)
  // Surfaces WHY a write was just blocked, so a page can show something
  // like "you're in read-only mode" instead of the write just silently
  // doing nothing - before this, guardedSetDb only ever logged a console
  // warning nobody but a developer would ever see.
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* storage full */ }
  }, [db])
  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  }, [session])

  const activeSociety = useMemo(
    () => db.societies.find(s => s.id === session.societyId) ?? db.societies[0] ?? placeholderSociety(),
    [db.societies, session.societyId],
  )
  const activeSocietyId = activeSociety.id

  // The first slice of the real (Supabase-backed) data layer: flats,
  // bills, payments, adjustments - the core financial loop. Everything
  // else (complaints, notices, documents, polls, events, vendors,
  // parking, contacts) still runs on the local layer only, that's real
  // future work, not done here. Strictly gated on isRealSession, not
  // explicitSociety - see the comment on Session in types.ts for why that
  // distinction matters: getting this gate wrong would mean demo and
  // production data mixing, which the product's own hard separation
  // requirement rules out entirely.
  useEffect(() => {
    if (!supabaseConfigured || !session.isRealSession) return
    let cancelled = false
    setFinancialsLoading(true)

    // The owner doesn't have one meaningful "active society" the way a
    // resident or admin does - their own console shows every society at
    // once, aggregated, not one society's flats/bills/complaints. So
    // their fetch is platform-wide - every flat, every membership, every
    // platform billing record, the full audit log, and impersonation
    // history, across every society at once - not the per-society
    // financial bundle scoped to whatever activeSocietyId happens to
    // currently be (which for an owner session is essentially arbitrary).
    if (session.role === 'owner') {
      Promise.all([
        fetchAllSocieties(), fetchAllFlatsForOwner(), fetchAllMembershipsForOwner(),
        fetchAllPlatformBilling(), fetchAllAuditLogs(), fetchAllImpersonationLogs(),
      ])
        .then(([societies, flats, memberships, platformBilling, auditLogs, impersonationLogs]) => {
          if (!cancelled) setDb(d => ({ ...d, societies, flats, memberships, platformBilling, auditLogs, impersonationLogs }))
        })
        .catch(() => { /* the person still sees whatever was already loaded */ })
        .finally(() => { if (!cancelled) setFinancialsLoading(false) })
      return () => { cancelled = true }
    }

    Promise.all([
      fetchSocietyFinancials(activeSocietyId),
      fetchSocietyComplaints(activeSocietyId),
      fetchSocietyNotices(activeSocietyId),
      fetchSociety(activeSocietyId),
      fetchSocietyDocuments(activeSocietyId),
      fetchSocietyMemberships(activeSocietyId),
      fetchSocietyVendors(activeSocietyId),
      fetchSocietyVehicles(activeSocietyId),
      fetchSocietyContacts(activeSocietyId),
      fetchSocietyPolls(activeSocietyId),
      fetchSocietyEvents(activeSocietyId),
    ])
      .then(([{ flats, bills, payments, adjustments }, complaints, notices, society, documents, memberships, vendors, vehicles, contacts, polls, events]) => {
        if (cancelled) return
        setDb(d => ({
          ...d,
          flats: [...d.flats.filter(f => f.societyId !== activeSocietyId), ...flats],
          bills: [...d.bills.filter(b => b.societyId !== activeSocietyId), ...bills],
          payments: [...d.payments.filter(p => p.societyId !== activeSocietyId), ...payments],
          adjustments: [...d.adjustments.filter(a => a.societyId !== activeSocietyId), ...adjustments],
          complaints: [...d.complaints.filter(c => c.societyId !== activeSocietyId), ...complaints],
          notices: [...d.notices.filter(n => n.societyId !== activeSocietyId), ...notices],
          societies: society ? [...d.societies.filter(s => s.id !== activeSocietyId), society] : d.societies,
          documents: [...d.documents.filter(doc => doc.societyId !== activeSocietyId), ...documents],
          memberships: [...d.memberships.filter(m => m.societyId !== activeSocietyId), ...memberships],
          vendors: [...d.vendors.filter(v => v.societyId !== activeSocietyId), ...vendors],
          vehicles: [...d.vehicles.filter(v => v.societyId !== activeSocietyId), ...vehicles],
          contacts: [...d.contacts.filter(c => c.societyId !== activeSocietyId), ...contacts],
          polls: [...d.polls.filter(p => p.societyId !== activeSocietyId), ...polls],
          events: [...d.events.filter(ev => ev.societyId !== activeSocietyId), ...events],
        }))
      })
      .catch(() => { /* the person still sees whatever was already loaded; a real error-surface for this is worth adding later */ })
      .finally(() => { if (!cancelled) setFinancialsLoading(false) })
    return () => { cancelled = true }
  }, [activeSocietyId, session.isRealSession, session.role])

  useEffect(() => {
    applyTheme(activeSociety?.themeKey ?? defaultThemeKey)
  }, [activeSociety?.themeKey])

  const store = useMemo<Store>(() => {
    const society = activeSociety
    // Auditor is read-only everywhere, full stop. An owner support
    // session in read-only mode is also genuinely blocked now - checked
    // via actingAsOwner + supportMode, not session.role, since entering a
    // society sets role to whatever's being impersonated (society_admin,
    // say), not 'owner' - checking session.role === 'owner' here would
    // never have caught a read-only society_admin impersonation at all.
    const canWriteNow = session.role !== 'auditor'
      && !(session.actingAsOwner && session.supportMode === 'readonly')
      && (session.role === 'owner' || canWrite(society))

    const scope = <T extends { societyId: string }>(arr: T[]): T[] =>
      arr.filter(x => x.societyId === activeSocietyId)

    const scopedDb: DB = {
      version: db.version,
      societies: db.societies,
      flats: scope(db.flats),
      bills: scope(db.bills),
      payments: scope(db.payments),
      expenses: scope(db.expenses),
      vendors: scope(db.vendors),
      complaints: scope(db.complaints),
      notices: scope(db.notices),
      documents: scope(db.documents),
      polls: scope(db.polls),
      events: scope(db.events),
      vehicles: scope(db.vehicles),
      contacts: scope(db.contacts),
      adjustments: scope(db.adjustments),
      memberships: scope(db.memberships),
      platformBilling: db.platformBilling, // owner-only concern, stays global like societies
      leads: db.leads, // owner-only concern, stays global
      unmatchedLoginAttempts: db.unmatchedLoginAttempts, // owner-only concern, stays global
      auditLogs: scope(db.auditLogs),
      impersonationLogs: scope(db.impersonationLogs),
    }

    // Every mutating action funnels through here instead of raw setDb.
    // Blocked writes are a defensive no-op (also logged to the console for
    // visibility during development) - this is a local UX guard, not the
    // real enforcement, which has to live in Supabase RLS once connected.
    const guardedSetDb = (updater: (d: DB) => DB): boolean => {
      if (!canWriteNow) {
        const reason = session.role === 'auditor'
          ? 'ઓડિટર એક્સેસ ફક્ત જોવા માટે છે, કંઈ સેવ થતું નથી.'
          : session.actingAsOwner && session.supportMode === 'readonly'
            ? 'તમે Read-only સપોર્ટ મોડમાં છો, કંઈ સેવ થતું નથી.'
            : `${society?.name ?? 'આ સોસાયટી'} હાલમાં લખવા માટે ખુલ્લી નથી (સબ્સ્ક્રિપ્શન સ્થિતિ).`
        setLastBlockedReason(reason)
        // eslint-disable-next-line no-console
        console.warn(`Write blocked: ${reason}`)
        return false
      }
      setLastBlockedReason(null)
      setDb(updater)
      return true
    }

    const flatById = (id: string) => scopedDb.flats.find(f => f.id === id)
    const billStatus = (b: Bill): 'paid' | 'pending' | 'overdue' => {
      if (b.paidAmount >= b.amount) return 'paid'
      return b.dueDate < todayISO() ? 'overdue' : 'pending'
    }
    // A debit adjustment (a one-time charge, a correction that increases
    // what's owed) adds to pending. A credit adjustment (a discount, a
    // refund, an advance payment credited forward) reduces it, and can
    // take a flat's pending balance negative - that's a real credit
    // balance, not a bug, see billStatus() in Bill.tsx for how the
    // resident-facing UI shows that distinctly rather than as "₹-500 due".
    // Only adjustments tied to a specific flat count here; a society-wide
    // adjustment (flatId undefined) doesn't belong to any one flat's
    // balance and only shows up in totalPending.
    const flatAdjustmentNet = (flatId: string) =>
      scopedDb.adjustments.filter(a => a.flatId === flatId).reduce((s, a) => s + (a.type === 'debit' ? a.amount : -a.amount), 0)
    const allAdjustmentNet = () =>
      scopedDb.adjustments.reduce((s, a) => s + (a.type === 'debit' ? a.amount : -a.amount), 0)
    const flatPending = (flatId: string) =>
      scopedDb.bills.filter(b => b.flatId === flatId).reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0) + flatAdjustmentNet(flatId)
    const totalPending = () =>
      scopedDb.bills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0) + allAdjustmentNet()
    // A cancelled receipt keeps status: 'success' (cancelReceipt reverses
    // the bill credit but never rewrites status, since 'status' means "did
    // this payment succeed at the time", not "is it still valid now" -
    // those are different questions). Income specifically needs the
    // second one: money that was later reversed was never really
    // collected, so it must not count here even though it once did.
    const monthIncome = (month: string) =>
      scopedDb.payments.filter(p => p.status === 'success' && !p.cancelled && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)
    const monthExpense = (month: string) =>
      scopedDb.expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
    // A module is usable if the OWNER has enabled it AND the society's own
    // admin hasn't hidden it. Both layers must say yes - see ModuleLayer.
    const moduleEnabled = (key: keyof SocietyModules) =>
      society?.modules?.ownerEnabled?.[key] !== false && society?.modules?.adminVisible?.[key] !== false
    // Whether a society_admin is even allowed to toggle this module
    // themselves (only if the owner enabled it in the first place).
    const adminCanToggle = (key: keyof SocietyModules) => society?.modules?.ownerEnabled?.[key] !== false

    return {
      db: scopedDb, rawDb: db, session, society, financialsLoading, lastBlockedReason, canWriteNow,
      subscriptionBannerFor: (audience) => statusBanner(society, audience),

      setSubscriptionStatus: (societyId, status) => {
        setDb(d => ({
          ...d,
          societies: d.societies.map(s => s.id === societyId
            ? { ...s, subscriptionStatus: status, graceStartedAt: status === 'grace' ? todayISO() : (status === 'active' || status === 'trial' ? undefined : s.graceStartedAt) }
            : s),
          auditLogs: [{ id: uid('aud'), societyId, at: new Date().toISOString(), actor: 'Prangan One ઓનર', action: 'subscription_status_changed', detail: `સ્થિતિ બદલાઈ: ${status}` }, ...d.auditLogs],
        }))
      },

      login: (role, flatId) => {
        if (flatId) {
          const flat = db.flats.find(f => f.id === flatId)
          const derivedRole: Role = flat?.occupancy === 'tenant' ? 'resident_tenant' : 'resident_owner'
          setSession({ role: role === 'resident_owner' || role === 'resident_tenant' ? derivedRole : role, flatId, societyId: flat?.societyId ?? DEFAULT_SOCIETY_ID, explicitSociety: true, actingAsOwner: false, isRealSession: false })
        } else {
          setSession({ role, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
        }
      },
      // Clears the real (Supabase-fetched) financial data for whichever
      // society this session was actually looking at, if it was a real
      // session at all - this used to not happen, meaning a real login's
      // bills/payments/flats/adjustments stayed cached in this browser's
      // local storage indefinitely. On a shared device that meant the
      // data was still readable after signing out, and a second person
      // from a different society logging in on the same device would add
      // their data alongside the first person's rather than replacing it,
      // since nothing ever cleared it. Local demo data (which belongs to
      // DEFAULT_SOCIETY_ID or another seeded id, never the real society
      // this session was in) is untouched by this.
      logout: () => {
        const wasReal = session.isRealSession
        const leavingSocietyId = activeSocietyId
        setSession({ role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
        if (wasReal) {
          setDb(d => ({
            ...d,
            flats: d.flats.filter(f => f.societyId !== leavingSocietyId),
            bills: d.bills.filter(b => b.societyId !== leavingSocietyId),
            payments: d.payments.filter(p => p.societyId !== leavingSocietyId),
            adjustments: d.adjustments.filter(a => a.societyId !== leavingSocietyId),
          }))
        }
      },
      enterSociety: (societyId, role, mode = 'readonly', reason) => {
        // session.isRealSession here reflects the owner's own genuine
        // identity, captured before setSession below overwrites it with
        // the impersonated view's local session - the log entry itself
        // isn't limited by the impersonated society staying on the local
        // data layer for now, so it's written for real regardless.
        const wasRealOwner = session.isRealSession
        const log: ImpersonationLog = { id: wasRealOwner ? realUid() : uid('imp'), societyId, enteredAt: new Date().toISOString(), mode, reason }
        setDb(d => ({ ...d, impersonationLogs: [log, ...d.impersonationLogs] }))
        if (wasRealOwner) {
          insertImpersonationLogReal(log).catch(() => { /* local state already reflects it */ })
        }
        setSession({ role, flatId: null, societyId, explicitSociety: true, actingAsOwner: true, isRealSession: false, supportMode: mode })
      },
      exitImpersonation: () => {
        const current = db.impersonationLogs.find((l, i) => i === 0 && l.societyId === session.societyId && !l.exitedAt)
        setDb(d => ({
          ...d,
          impersonationLogs: d.impersonationLogs.map((l, i) => i === 0 && l.societyId === session.societyId && !l.exitedAt ? { ...l, exitedAt: new Date().toISOString() } : l),
        }))
        // The log id itself tells us whether it was written for real
        // (realUid()'s shape) vs. the local demo's uid('imp') prefix -
        // simpler than threading the owner's real-session state through
        // a second time here.
        if (current && !current.id.startsWith('imp_')) {
          exitImpersonationLogReal(current.id).catch(() => { /* local state already reflects it */ })
        }
        setSession({ role: 'owner', flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
      },
      findSocietyBySlug: (slug) => db.societies.find(s => s.slug === slug),
      setActiveSocietyContext: (societyId) =>
        setSession(s => ({ ...s, societyId, role: null, flatId: null, explicitSociety: true, actingAsOwner: false, isRealSession: false })),

      findSocietyByJoinCode: (code) =>
        db.societies.find(s => s.joinCode.toLowerCase() === code.trim().toLowerCase()),

      selfEnrollResident: (input) => {
        const society = db.societies.find(s => s.joinCode.toLowerCase() === input.joinCode.trim().toLowerCase())
        if (!society) return { ok: false, error: 'society_not_found' }

        const flat = db.flats.find(f => f.societyId === society.id && f.number.trim().toLowerCase() === input.flatNumber.trim().toLowerCase())
        if (!flat) return { ok: false, error: 'flat_not_found' }

        const derivedRole: Role = flat.occupancy === 'tenant' ? 'resident_tenant' : 'resident_owner'
        if (derivedRole === 'resident_tenant' && society.tenantAccess === 'disabled') {
          return { ok: false, error: 'tenant_access_disabled' }
        }

        const email = input.email.trim().toLowerCase()
        const alreadyThere = db.memberships.some(m => m.societyId === society.id && m.email.toLowerCase() === email)
        if (alreadyThere) return { ok: false, error: 'already_enrolled' }

        // Match on the pre-loaded EMAIL on file for this flat, not the
        // phone number. A phone number isn't a secret, a neighbour, a
        // former tenant, or anyone who's seen a WhatsApp group could
        // know a resident's number - matching on it would let them enter
        // THEIR OWN email alongside someone else's known phone number and
        // get instant access, with the real login link going to the
        // attacker's inbox, not the actual resident's. Email is the
        // actual credential being granted here, so that's what has to
        // match what the committee already put on file, not phone.
        const onFileEmail = (derivedRole === 'resident_tenant' ? flat.tenantEmail : flat.email)?.trim().toLowerCase()
        const status: 'active' | 'pending' = (!!onFileEmail && onFileEmail === email) ? 'active' : 'pending'

        const mem: Membership = {
          id: uid('mem'), createdAt: todayISO(), status,
          societyId: society.id, email, role: derivedRole, flatId: flat.id, phone: input.phone.trim(), name: input.name.trim(),
        }
        setDb(d => ({ ...d, memberships: [...d.memberships, mem] }))
        return { ok: true, status }
      },

      approveMembership: (membershipId) => {
        const ok = guardedSetDb(d => ({ ...d, memberships: d.memberships.map(m => m.id === membershipId ? { ...m, status: 'active' } : m) }))
        if (ok && session.isRealSession) {
          approveMembershipReal(membershipId).catch(() => { /* local state already reflects it */ })
        }
      },

      rejectMembership: (membershipId) => {
        const ok = guardedSetDb(d => ({ ...d, memberships: d.memberships.filter(m => m.id !== membershipId) }))
        if (ok && session.isRealSession) {
          rejectMembershipReal(membershipId).catch(() => { /* local state already reflects it */ })
        }
      },

      logUnmatchedLoginAttempt: (email) =>
        setDb(d => ({ ...d, unmatchedLoginAttempts: [{ id: uid('ula'), email: email.trim().toLowerCase(), at: new Date().toISOString() }, ...d.unmatchedLoginAttempts] })),

      resolveRealSession: (membership) =>
        setSession({ role: membership.role, flatId: membership.flatId, societyId: membership.societyId, explicitSociety: true, actingAsOwner: false, isRealSession: true }),

      flatById, billStatus, flatPending, totalPending, monthIncome, monthExpense, moduleEnabled, adminCanToggle,

      previewBillGeneration: (month) => {
        const existing = new Set(scopedDb.bills.filter(b => b.month === month).map(b => b.flatId))
        return scopedDb.flats.map(f => {
          const amount = f.maintenanceOverride ?? society.maintenanceAmount
          const availableCredit = Math.max(0, -flatAdjustmentNet(f.id))
          return {
            flatId: f.id, flatNumber: f.number, amount,
            alreadyExists: existing.has(f.id),
            creditApplied: existing.has(f.id) ? 0 : Math.min(amount, availableCredit),
          }
        })
      },

      generateBills: (month) => {
        // Computed from the current snapshot BEFORE calling guardedSetDb,
        // not as a side-effect variable set inside the updater callback.
        // React can invoke a setState updater function more than once
        // (StrictMode does this deliberately, to catch exactly this kind
        // of impurity - see main.tsx, StrictMode is really on) - a
        // mutable outer variable reassigned inside the callback isn't
        // safe against that, and returned an incorrect count in testing
        // before this fix, even though the actual bills were created
        // correctly either way. Precomputing the list here means the
        // updater itself just applies a fixed, already-known list, so it
        // produces the same result no matter how many times it's invoked.
        const existing = new Set(scopedDb.bills.filter(b => b.month === month).map(b => b.flatId))
        const fresh: Bill[] = []
        // A flat's existing advance balance (net credit from adjustments -
        // an overpayment, or a credit the committee entered directly) used
        // to just sit there forever unless someone manually applied it.
        // Each new bill below auto-applies whatever credit is available,
        // up to its own amount, and records a matching debit so the
        // credit is actually consumed, not double-counted on the next run.
        const creditAdjustments: Adjustment[] = []
        for (const f of scopedDb.flats) {
          if (existing.has(f.id)) continue
          const amount = f.maintenanceOverride ?? society.maintenanceAmount
          const availableCredit = Math.max(0, -flatAdjustmentNet(f.id))
          const applied = Math.min(amount, availableCredit)
          const billId = session.isRealSession ? realUid() : uid('bill')
          fresh.push({
            id: billId, societyId: activeSocietyId, flatId: f.id, month, amount, paidAmount: applied,
            dueDate: `${month}-${String(society.dueDay).padStart(2, '0')}`,
          })
          if (applied > 0) {
            creditAdjustments.push({
              id: session.isRealSession ? realUid() : uid('adj'), societyId: activeSocietyId, flatId: f.id,
              date: todayISO(), amount: applied, type: 'debit', reason: `${month} બિલમાં હાલની ક્રેડિટ એડજસ્ટ કરી`,
            })
          }
        }
        if (fresh.length) {
          guardedSetDb(d => ({ ...d, bills: [...d.bills, ...fresh], adjustments: [...creditAdjustments, ...d.adjustments] }))
          if (session.isRealSession) {
            insertBillsReal(fresh).catch(() => { /* local state already reflects it; a real error-surface for this is worth adding later */ })
            for (const adj of creditAdjustments) insertAdjustmentReal(adj).catch(() => { /* same */ })
          }
        }
        return fresh.length
      },

      recordPayment: ({ flatId, billId, amount, mode, refNo, note, failed, date, pending, proofFile }) => {
        const year = (date ?? todayISO()).slice(0, 4)
        const status: Payment['status'] = failed ? 'failed' : pending ? 'pending_confirmation' : 'success'
        const receiptNo = status === 'success' ? `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}` : undefined
        const pay: Payment = {
          id: session.isRealSession ? realUid() : uid('pay'), societyId: activeSocietyId, flatId, billId,
          date: date ?? todayISO(), amount, mode, refNo, status, receiptNo, note,
        }
        const targetBill = billId ? scopedDb.bills.find(b => b.id === billId) : undefined
        // Anything paid beyond what this specific bill still owed becomes
        // a real, tracked credit adjustment - this used to just vanish,
        // since the bill's own paidAmount is capped at its own amount and
        // nothing recorded the difference anywhere.
        const overpayAmount = status === 'success' && targetBill
          ? Math.max(0, amount - Math.max(0, targetBill.amount - targetBill.paidAmount))
          : 0
        const overpayAdj: Adjustment | null = overpayAmount > 0
          ? { id: session.isRealSession ? realUid() : uid('adj'), societyId: activeSocietyId, flatId, date: date ?? todayISO(), amount: overpayAmount, type: 'credit', reason: `વધારે ચૂકવણી, ${receiptNo ?? 'રસીદ'} માંથી ક્રેડિટ તરીકે રાખેલ` }
          : null
        const ok = guardedSetDb(d => {
          const bills = status === 'success' && billId
            ? d.bills.map(b => b.id === billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + amount) } : b)
            : d.bills
          const societies = status === 'success' ? d.societies.map(s => s.id === activeSocietyId ? { ...s, receiptSeq: s.receiptSeq + 1 } : s) : d.societies
          return { ...d, bills, societies, payments: [pay, ...d.payments], adjustments: overpayAdj ? [overpayAdj, ...d.adjustments] : d.adjustments }
        })
        if (ok && session.isRealSession) {
          recordPaymentReal(pay, targetBill?.paidAmount ?? 0, targetBill?.amount ?? amount)
            .then(async () => {
              // Same reasoning as addComplaint's photo upload - the
              // payment row has to exist in the real database first (the
              // storage policy checks for it), so the proof screenshot
              // uploads as a genuine second step, not part of the
              // original insert.
              if (!proofFile) return
              const path = await uploadPrivateFile('payment-proof', pay.id, proofFile)
              await updatePaymentReal(pay.id, { proofPath: path })
              setDb(d => ({ ...d, payments: d.payments.map(x => x.id === pay.id ? { ...x, proofPath: path } : x) }))
            })
            .catch(() => { /* local state already reflects the payment itself; a proof upload failure specifically doesn't have its own retry/error surface yet */ })
          if (overpayAdj) insertAdjustmentReal(overpayAdj).catch(() => { /* same */ })
        }
        return ok ? pay : null
      },
      confirmPendingPayment: (paymentId) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p || p.status !== 'pending_confirmation') return
        const year = p.date.slice(0, 4)
        const receiptNo = `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}`
        const targetBill = p.billId ? scopedDb.bills.find(b => b.id === p.billId) : undefined
        guardedSetDb(d => {
          const bills = p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + p.amount) } : b) : d.bills
          return {
            ...d, bills,
            payments: d.payments.map(x => x.id === paymentId ? { ...x, status: 'success' as const, receiptNo } : x),
            societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, receiptSeq: s.receiptSeq + 1 } : s),
          }
        })
        if (session.isRealSession) {
          updatePaymentReal(paymentId, { status: 'success', receiptNo }).catch(() => { /* local state already reflects it */ })
          if (p.billId && targetBill) {
            updateBillPaidAmountReal(p.billId, Math.min(targetBill.amount, targetBill.paidAmount + p.amount)).catch(() => { /* same */ })
          }
        }
      },
      cancelReceipt: (paymentId, reason) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p) return
        const targetBill = p.billId ? scopedDb.bills.find(b => b.id === p.billId) : undefined
        guardedSetDb(d => {
          // Reverse the bill credit so dues stay correct, but never delete
          // the payment row - it stays visible, marked cancelled, with the
          // reason, so there is always an audit trail for money.
          const bills = p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.max(0, b.paidAmount - p.amount) } : b) : d.bills
          return {
            ...d, bills,
            payments: d.payments.map(x => x.id === paymentId ? { ...x, cancelled: true, cancelReason: reason } : x),
            auditLogs: [{ id: uid('aud'), societyId: activeSocietyId, at: new Date().toISOString(), actor: society.name, action: 'receipt_cancelled', detail: `રસીદ ${p.receiptNo ?? p.id} રદ: ${reason}` }, ...d.auditLogs],
          }
        })
        if (session.isRealSession) {
          updatePaymentReal(paymentId, { cancelled: true, cancelReason: reason }).catch(() => { /* local state already reflects it */ })
          if (p.billId && targetBill) {
            updateBillPaidAmountReal(p.billId, Math.max(0, targetBill.paidAmount - p.amount)).catch(() => { /* same */ })
          }
        }
      },

      addComplaint: ({ flatId, category, title, detail, priority, photoName, photoFile, visibility }) => {
        const flat = flatById(flatId)
        const c: Complaint = {
          id: session.isRealSession ? realUid() : uid('cmp'), societyId: activeSocietyId, flatId, category, title, detail, priority,
          status: 'new', createdAt: todayISO(), internalNotes: [],
          hasPhoto: !!photoName || !!photoFile, photoName, visibility: visibility ?? 'personal',
          timeline: [{ date: todayISO(), status: 'new', by: flat?.ownerName ?? 'સભ્ય' }],
        }
        const ok = guardedSetDb(d => ({ ...d, complaints: [c, ...d.complaints] }))
        if (ok && session.isRealSession) {
          // The complaint has to exist in the real database before its
          // photo can be uploaded (the storage policy checks for that
          // row), so this is a real sequence, not a fire-and-forget
          // write like most other real mutations - insert, then upload,
          // then attach the resulting path back onto the same row.
          insertComplaintReal(c)
            .then(async () => {
              if (!photoFile) return
              const path = await uploadPrivateFile('complaint-photos', c.id, photoFile)
              await updateComplaintPhotoPathReal(c.id, path)
              setDb(d => ({ ...d, complaints: d.complaints.map(x => x.id === c.id ? { ...x, photoPath: path } : x) }))
            })
            .catch(() => { /* the complaint itself is already reflected locally; a photo upload failure specifically doesn't have its own retry/error surface yet */ })
        }
        return ok ? c : null
      },
      advanceComplaint: (id, status, note, by, assignedTo) => {
        const ok = guardedSetDb(d => ({
          ...d,
          complaints: d.complaints.map(c => c.id === id ? {
            ...c, status,
            assignedTo: assignedTo ?? c.assignedTo,
            timeline: [...c.timeline, { date: todayISO(), status, note: note || undefined, by }],
          } : c),
        }))
        if (ok && session.isRealSession) {
          advanceComplaintReal(id, status, note, by, assignedTo).catch(() => { /* local state already reflects it */ })
        }
      },
      addInternalNote: (id, note) => {
        let updatedNotes: string[] = []
        const ok = guardedSetDb(d => ({
          ...d,
          complaints: d.complaints.map(c => {
            if (c.id !== id) return c
            updatedNotes = [...c.internalNotes, note]
            return { ...c, internalNotes: updatedNotes }
          }),
        }))
        if (ok && session.isRealSession) {
          updateComplaintNotesReal(id, updatedNotes).catch(() => { /* local state already reflects it */ })
        }
      },
      addFeedback: (id, rating, comment) => {
        const ok = guardedSetDb(d => ({ ...d, complaints: d.complaints.map(c => c.id === id ? { ...c, feedback: { rating, comment } } : c) }))
        if (ok && session.isRealSession) {
          updateComplaintFeedbackReal(id, { rating, comment }).catch(() => { /* local state already reflects it */ })
        }
      },
      getComplaintPhotoUrl: async (photoPath) => {
        if (!session.isRealSession) return null
        try {
          return await getSignedFileUrl('complaint-photos', photoPath)
        } catch {
          return null
        }
      },
      getPaymentProofUrl: async (proofPath) => {
        if (!session.isRealSession) return null
        try {
          return await getSignedFileUrl('payment-proof', proofPath)
        } catch {
          return null
        }
      },
      uploadSocietyLogoAndSave: async (societyId, file) => {
        if (!session.isRealSession) return null
        try {
          const url = await uploadSocietyLogo(societyId, file)
          setDb(d => ({ ...d, societies: d.societies.map(s => s.id === societyId ? { ...s, logoUrl: url } : s) }))
          await updateSocietyReal(societyId, { logoUrl: url })
          return url
        } catch {
          return null
        }
      },

      addNotice: (n) => {
        const notice: Notice = { id: session.isRealSession ? realUid() : uid('not'), societyId: activeSocietyId, date: todayISO(), ...n }
        const ok = guardedSetDb(d => ({ ...d, notices: [notice, ...d.notices] }))
        if (ok && session.isRealSession) {
          insertNoticeReal(notice).catch(() => { /* local state already reflects it */ })
        }
      },
      togglePin: (id) => {
        let newPinned = false
        const ok = guardedSetDb(d => ({
          ...d,
          notices: d.notices.map(n => {
            if (n.id !== id) return n
            newPinned = !n.pinned
            return { ...n, pinned: newPinned }
          }),
        }))
        if (ok && session.isRealSession) {
          updateNoticePinnedReal(id, newPinned).catch(() => { /* local state already reflects it */ })
        }
      },

      addExpense: (e) =>
        guardedSetDb(d => ({ ...d, expenses: [{ id: uid('exp'), societyId: activeSocietyId, ...e }, ...d.expenses] })),
      addVendor: (v) => {
        const vendor: Vendor = { id: session.isRealSession ? realUid() : uid('ven'), societyId: activeSocietyId, ...v }
        const ok = guardedSetDb(d => ({ ...d, vendors: [...d.vendors, vendor] }))
        if (ok && session.isRealSession) {
          insertVendorReal(vendor).catch(() => { /* local state already reflects it */ })
        }
      },
      updateVendor: (id, patch) => {
        const ok = guardedSetDb(d => ({ ...d, vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v) }))
        if (ok && session.isRealSession) {
          updateVendorReal(id, patch).catch(() => { /* local state already reflects it */ })
        }
      },
      addDocumentMeta: (doc) => {
        const { file, ...meta } = doc
        const d: Doc = { id: session.isRealSession ? realUid() : uid('doc'), societyId: activeSocietyId, date: todayISO(), ...meta }
        const ok = guardedSetDb(d2 => ({ ...d2, documents: [d, ...d2.documents] }))
        if (ok && session.isRealSession) {
          insertDocumentReal(d)
            .then(async () => {
              if (!file) return
              const path = await uploadPrivateFile('documents', d.id, file)
              await updateDocumentStoragePathReal(d.id, path)
              setDb(d2 => ({ ...d2, documents: d2.documents.map(x => x.id === d.id ? { ...x, storagePath: path } : x) }))
            })
            .catch(() => { /* the document record itself is already reflected locally; an upload failure specifically doesn't have its own retry/error surface yet */ })
        }
      },
      getDocumentUrl: async (storagePath) => {
        if (!session.isRealSession) return null
        try {
          return await getSignedFileUrl('documents', storagePath)
        } catch {
          return null
        }
      },

      addPoll: (p) => {
        const poll: Poll = { id: session.isRealSession ? realUid() : uid('poll'), societyId: activeSocietyId, votes: {}, status: 'open', ...p }
        const ok = guardedSetDb(d => ({ ...d, polls: [poll, ...d.polls] }))
        if (ok && session.isRealSession) {
          insertPollReal(poll).catch(() => { /* local state already reflects it */ })
        }
      },
      closePoll: (id) => {
        const ok = guardedSetDb(d => ({ ...d, polls: d.polls.map(p => p.id === id ? { ...p, status: 'closed', resultVisible: true } : p) }))
        if (ok && session.isRealSession) {
          closePollReal(id).catch(() => { /* local state already reflects it */ })
        }
      },
      vote: (pollId, flatId, optionIdx) => {
        if (!canWriteNow) return false
        const poll = scopedDb.polls.find(p => p.id === pollId)
        if (!poll || poll.status !== 'open') return false
        if (poll.votes[flatId] !== undefined) return false // one vote per flat
        const ok = guardedSetDb(d => ({
          ...d,
          polls: d.polls.map(p => p.id === pollId ? { ...p, votes: { ...p.votes, [flatId]: optionIdx } } : p),
        }))
        if (ok && session.isRealSession) {
          insertPollVoteReal(pollId, flatId, optionIdx).catch(() => { /* local state already reflects it */ })
        }
        return ok
      },

      addEvent: (e) => {
        const ev: SocietyEvent = { id: session.isRealSession ? realUid() : uid('evt'), societyId: activeSocietyId, contributions: [], volunteers: [], expenses: [], ...e }
        const ok = guardedSetDb(d => ({ ...d, events: [ev, ...d.events] }))
        if (ok && session.isRealSession) {
          insertEventReal(ev).catch(() => { /* local state already reflects it */ })
        }
      },
      addContribution: (eventId, flatId, amount) => {
        const date = todayISO()
        const ok = guardedSetDb(d => ({
          ...d,
          events: d.events.map(ev => ev.id === eventId
            ? { ...ev, contributions: [...ev.contributions, { flatId, amount, date }] } : ev),
        }))
        if (ok && session.isRealSession) {
          insertContributionReal(eventId, flatId, amount, date).catch(() => { /* local state already reflects it */ })
        }
      },
      addVolunteer: (eventId, name) => {
        const ok = guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId && !ev.volunteers.includes(name) ? { ...ev, volunteers: [...ev.volunteers, name] } : ev) }))
        if (ok && session.isRealSession) {
          insertVolunteerReal(eventId, name).catch(() => { /* local state already reflects it */ })
        }
      },
      addEventExpense: (eventId, label, amount) => {
        const ok = guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, expenses: [...ev.expenses, { label, amount }] } : ev) }))
        if (ok && session.isRealSession) {
          insertEventExpenseReal(eventId, label, amount).catch(() => { /* local state already reflects it */ })
        }
      },

      addVehicle: (v) => {
        const vehicle: Vehicle = { id: session.isRealSession ? realUid() : uid('veh'), societyId: activeSocietyId, ...v }
        const ok = guardedSetDb(d => ({ ...d, vehicles: [...d.vehicles, vehicle] }))
        if (ok && session.isRealSession) {
          insertVehicleReal(vehicle).catch(() => { /* local state already reflects it */ })
        }
      },
      addFlat: (f) => {
        const newFlat: Flat = { id: session.isRealSession ? realUid() : uid('flat'), societyId: activeSocietyId, memberSince: new Date().getFullYear(), ...f }
        const ok = guardedSetDb(d => ({ ...d, flats: [...d.flats, newFlat] }))
        if (ok && session.isRealSession) {
          insertFlatReal(newFlat.id, activeSocietyId, newFlat).catch(() => { /* local state already reflects it */ })
        }
      },
      updateFlat: (flatId, patch) => {
        const ok = guardedSetDb(d => ({ ...d, flats: d.flats.map(f => f.id === flatId ? { ...f, ...patch } : f) }))
        if (ok && session.isRealSession) {
          updateFlatReal(flatId, patch).catch(() => { /* local state already reflects it */ })
        }
      },
      addFlatsBulk: (rows) => {
        const existingNumbers = new Set(scopedDb.flats.map(f => f.number))
        const skippedDuplicates: string[] = []
        const fresh: Flat[] = []
        for (const r of rows) {
          if (existingNumbers.has(r.number)) { skippedDuplicates.push(r.number); continue }
          existingNumbers.add(r.number)
          fresh.push({ id: session.isRealSession ? realUid() : uid('flat'), societyId: activeSocietyId, memberSince: new Date().getFullYear(), ...r })
        }
        guardedSetDb(d => ({ ...d, flats: [...d.flats, ...fresh] }))
        if (session.isRealSession) {
          for (const f of fresh) insertFlatReal(f.id, activeSocietyId, f).catch(() => { /* local state already reflects it */ })
        }
        return { added: fresh.length, skippedDuplicates }
      },
      addAdjustment: (a) => {
        const adj: Adjustment = { id: session.isRealSession ? realUid() : uid('adj'), societyId: activeSocietyId, ...a }
        const ok = guardedSetDb(d => ({ ...d, adjustments: [adj, ...d.adjustments] }))
        if (ok && session.isRealSession) {
          insertAdjustmentReal(adj).catch(() => { /* local state already reflects it */ })
        }
      },
      updateSociety: (patch) => {
        const ok = guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, ...patch } : s) }))
        if (ok && session.isRealSession) {
          updateSocietyReal(activeSocietyId, patch).catch(() => { /* local state already reflects it */ })
        }
      },

      addMembership: (m) => {
        const mem: Membership = { id: session.isRealSession ? realUid() : uid('mem'), createdAt: todayISO(), status: 'active', ...m }
        const ok = guardedSetDb(d => ({ ...d, memberships: [...d.memberships, mem] }))
        if (ok && session.isRealSession) {
          insertMembershipReal(mem).catch(() => { /* local state already reflects it */ })
        }
        return ok ? mem : null
      },

      addSociety: (s) => {
        const base = s.nameEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'society'
        const taken = new Set(db.societies.map(x => x.slug))
        let slug = base, n = 2
        while (taken.has(slug)) { slug = `${base}-${n}`; n++ }
        const takenCodes = new Set(db.societies.map(x => x.joinCode))
        let joinCode = generateJoinCode(s.nameEn)
        while (takenCodes.has(joinCode)) joinCode = generateJoinCode(s.nameEn)
        const newSoc: Society = {
          id: session.isRealSession ? realUid() : uid('soc'), upiId: '', plan: 'trial', flatsLimit: 60, slug, joinCode,
          subscriptionStatus: 'trial', receiptSeq: 1, createdAt: todayISO(),
          // trialStartedAt deliberately NOT set here - see the comment on
          // Society.trialStartedAt in types.ts. It gets set later, by
          // activateSociety, once the society is actually ready to use,
          // not at the moment this bare record is created. A 'trial'
          // society with no trialStartedAt yet is fully writable in the
          // meantime (see canWrite/effectiveStatus in subscription.ts),
          // its trial simply hasn't started counting down yet.
          ...s,
        }
        setDb(d => ({ ...d, societies: [...d.societies, newSoc] }))
        if (session.isRealSession) {
          insertSocietyReal(newSoc).catch(() => { /* local state already reflects it */ })
        }
        return newSoc
      },
      activateSociety: (societyId) => {
        const trialStartedAt = new Date().toISOString()
        const ok = guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === societyId ? { ...s, trialStartedAt } : s) }))
        if (ok && session.isRealSession) {
          updateSocietyStatusReal(societyId, { trialStartedAt }).catch(() => { /* local state already reflects it */ })
        }
      },
      updateSocietyById: (id, patch) => {
        setDb(d => ({ ...d, societies: d.societies.map(s => s.id === id ? { ...s, ...patch } : s) }))
        if (session.isRealSession) {
          // Split across the two real functions - this is the owner
          // console, the one legitimate place both regular fields (name,
          // address) and owner-only protected ones (plan, flatsLimit,
          // subscriptionStatus) can be set together in a single save.
          updateSocietyReal(id, patch).catch(() => { /* local state already reflects it */ })
          if (patch.plan !== undefined || patch.flatsLimit !== undefined || patch.subscriptionStatus !== undefined || patch.graceStartedAt !== undefined) {
            updateSocietyStatusReal(id, { plan: patch.plan, flatsLimit: patch.flatsLimit, subscriptionStatus: patch.subscriptionStatus, graceStartedAt: patch.graceStartedAt })
              .catch(() => { /* same */ })
          }
        }
      },

      addPlatformBillingRecord: (r) => {
        const rec = { id: session.isRealSession ? realUid() : uid('pb'), ...r }
        setDb(d => ({ ...d, platformBilling: [...d.platformBilling, rec] }))
        if (session.isRealSession) {
          insertPlatformBillingReal(rec).catch(() => { /* local state already reflects it */ })
        }
      },
      updatePlatformBillingRecord: (id, patch) => {
        setDb(d => ({ ...d, platformBilling: d.platformBilling.map(r => r.id === id ? { ...r, ...patch } : r) }))
        if (session.isRealSession) {
          updatePlatformBillingReal(id, patch).catch(() => { /* local state already reflects it */ })
        }
      },

      addLead: (l) =>
        setDb(d => ({ ...d, leads: [{ id: uid('lead'), status: 'new', createdAt: todayISO(), ...l }, ...d.leads] })),
      updateLeadStatus: (id, status, internalNote) =>
        setDb(d => ({ ...d, leads: d.leads.map(l => l.id === id ? { ...l, status, internalNote: internalNote ?? l.internalNote } : l) })),

      resetAll: () => {
        localStorage.removeItem(DB_KEY)
        setDb(DEMO_SEED_ENABLED ? buildSeed() : emptySeed())
      },
    }
  }, [db, session, activeSociety, activeSocietyId, financialsLoading, lastBlockedReason])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
