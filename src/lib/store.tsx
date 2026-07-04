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
  Role, Session, Society, SocietyEvent, SocietyModules, SubscriptionStatus, TenantAccessMode, Vehicle,
} from './types'
import { uid } from './id'

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

// Used when VITE_DEMO_SEED=false: no Rajhans/lead sample data, just enough
// to boot safely (one placeholder society, so activeSociety always resolves
// to something) until the owner creates a real one from /owner/societies/new.
// This is a stopgap for the localStorage era only - once the Supabase swap
// lands, a fresh project is naturally empty and this stops being relevant.
function emptySeed(): DB {
  const placeholder: Society = {
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
  return {
    version: 3, societies: [placeholder], flats: [], bills: [], payments: [],
    expenses: [], vendors: [], complaints: [], notices: [], documents: [],
    polls: [], events: [], vehicles: [], contacts: [], adjustments: [],
    memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: [], auditLogs: [], impersonationLogs: [],
  }
}

// Demo/sample data is on by default (so `npm run dev` with no .env still
// shows a working demo), and can be switched off with VITE_DEMO_SEED=false
// for a deployment that should start clean. See .env.example.
const DEMO_SEED_ENABLED = import.meta.env.VITE_DEMO_SEED !== 'false'

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed && parsed.version === 3) return parsed
    }
  } catch {
    /* corrupted -> reseed */
  }
  return DEMO_SEED_ENABLED ? buildSeed() : emptySeed()
}
function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Session
      if (parsed && parsed.societyId) return parsed
    }
  } catch { /* ignore */ }
  return { role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false }
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
   * phone matches what's already on file for that flat; otherwise creates
   * a 'pending' membership a committee member has to approve. Never lets
   * a tenant in when the society's tenantAccess is 'disabled'. */
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
  generateBills: (month: string) => number
  recordPayment: (p: {
    flatId: string; billId?: string; amount: number; mode: PayMode
    refNo?: string; note?: string; failed?: boolean; date?: string
    pending?: boolean
  }) => Payment | null
  confirmPendingPayment: (paymentId: string) => void
  cancelReceipt: (paymentId: string, reason: string) => void
  /* complaints */
  addComplaint: (c: { flatId: string; category: string; title: string; detail: string; priority: 'normal' | 'urgent'; photoName?: string }) => Complaint | null
  advanceComplaint: (id: string, status: ComplaintStatus, note: string, by: string, assignedTo?: string) => void
  addInternalNote: (id: string, note: string) => void
  addFeedback: (id: string, rating: number, comment: string) => void
  /* content */
  addNotice: (n: { title: string; body: string; category: string; pinned: boolean }) => void
  togglePin: (id: string) => void
  addExpense: (e: { date: string; category: string; vendorId?: string; amount: number; mode: PayMode; note?: string; billFile?: string }) => void
  addVendor: (v: { name: string; service: string; contactPerson: string; phone: string; amcStart?: string; amcEnd?: string; notes?: string }) => void
  updateVendor: (id: string, patch: Partial<Omit<import('./types').Vendor, 'id' | 'societyId'>>) => void
  addDocumentMeta: (d: { name: string; folder: string; permission: DocPermission; size: string }) => void
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
  addFlatsBulk: (rows: { number: string; floor: number; ownerName: string; phone: string; email?: string; occupancy: 'owner' | 'tenant'; tenantName?: string; tenantEmail?: string; sqft: number }[]) => { added: number; skippedDuplicates: string[] }
  addAdjustment: (a: { date: string; flatId?: string; amount: number; type: 'credit' | 'debit'; reason: string }) => void
  updateSociety: (patch: Partial<Society>) => void
  /* membership */
  addMembership: (m: { societyId: string; email: string; role: Role; flatId?: string; phone?: string; whatsapp?: string; canManageBilling?: boolean; name?: string }) => Membership
  /* owner backend */
  addSociety: (s: NewSocietyInput) => Society
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

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* storage full */ }
  }, [db])
  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  }, [session])

  const activeSociety = useMemo(
    () => db.societies.find(s => s.id === session.societyId) ?? db.societies[0],
    [db.societies, session.societyId],
  )
  const activeSocietyId = activeSociety?.id ?? DEFAULT_SOCIETY_ID

  useEffect(() => {
    applyTheme(activeSociety?.themeKey ?? defaultThemeKey)
  }, [activeSociety?.themeKey])

  const store = useMemo<Store>(() => {
    const society = activeSociety
    const canWriteNow = session.role === 'owner' || canWrite(society)

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
        // eslint-disable-next-line no-console
        console.warn(`Write blocked: ${society?.name ?? 'this society'} is not in a writable subscription state.`)
        return false
      }
      setDb(updater)
      return true
    }

    const flatById = (id: string) => scopedDb.flats.find(f => f.id === id)
    const billStatus = (b: Bill): 'paid' | 'pending' | 'overdue' => {
      if (b.paidAmount >= b.amount) return 'paid'
      return b.dueDate < todayISO() ? 'overdue' : 'pending'
    }
    const flatPending = (flatId: string) =>
      scopedDb.bills.filter(b => b.flatId === flatId).reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0)
    const totalPending = () =>
      scopedDb.bills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0)
    const monthIncome = (month: string) =>
      scopedDb.payments.filter(p => p.status === 'success' && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)
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
      db: scopedDb, rawDb: db, session, society, canWriteNow,
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
          setSession({ role: role === 'resident_owner' || role === 'resident_tenant' ? derivedRole : role, flatId, societyId: flat?.societyId ?? DEFAULT_SOCIETY_ID, explicitSociety: true, actingAsOwner: false })
        } else {
          setSession({ role, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false })
        }
      },
      logout: () => setSession({ role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false }),
      enterSociety: (societyId, role, mode = 'readonly', reason) => {
        setDb(d => ({ ...d, impersonationLogs: [{ id: uid('imp'), societyId, enteredAt: new Date().toISOString(), mode, reason }, ...d.impersonationLogs] }))
        setSession({ role, flatId: null, societyId, explicitSociety: true, actingAsOwner: true })
      },
      exitImpersonation: () => {
        setDb(d => ({
          ...d,
          impersonationLogs: d.impersonationLogs.map((l, i) => i === 0 && l.societyId === session.societyId && !l.exitedAt ? { ...l, exitedAt: new Date().toISOString() } : l),
        }))
        setSession({ role: 'owner', flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false })
      },
      findSocietyBySlug: (slug) => db.societies.find(s => s.slug === slug),
      setActiveSocietyContext: (societyId) =>
        setSession(s => ({ ...s, societyId, role: null, flatId: null, explicitSociety: true, actingAsOwner: false })),

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

        const normalize = (p: string) => p.replace(/\D/g, '').slice(-10) // last 10 digits, ignores +91/spaces/dashes
        const phoneMatches = !!flat.phone && normalize(flat.phone) === normalize(input.phone)
        const status: 'active' | 'pending' = phoneMatches ? 'active' : 'pending'

        const mem: Membership = {
          id: uid('mem'), createdAt: todayISO(), status,
          societyId: society.id, email, role: derivedRole, flatId: flat.id, phone: input.phone.trim(), name: input.name.trim(),
        }
        setDb(d => ({ ...d, memberships: [...d.memberships, mem] }))
        return { ok: true, status }
      },

      approveMembership: (membershipId) =>
        setDb(d => ({ ...d, memberships: d.memberships.map(m => m.id === membershipId ? { ...m, status: 'active' } : m) })),

      rejectMembership: (membershipId) =>
        setDb(d => ({ ...d, memberships: d.memberships.filter(m => m.id !== membershipId) })),

      logUnmatchedLoginAttempt: (email) =>
        setDb(d => ({ ...d, unmatchedLoginAttempts: [{ id: uid('ula'), email: email.trim().toLowerCase(), at: new Date().toISOString() }, ...d.unmatchedLoginAttempts] })),

      resolveRealSession: (membership) =>
        setSession({ role: membership.role, flatId: membership.flatId, societyId: membership.societyId, explicitSociety: true, actingAsOwner: false }),

      flatById, billStatus, flatPending, totalPending, monthIncome, monthExpense, moduleEnabled, adminCanToggle,

      generateBills: (month) => {
        let created = 0
        guardedSetDb(d => {
          const existing = new Set(d.bills.filter(b => b.societyId === activeSocietyId && b.month === month).map(b => b.flatId))
          const fresh: Bill[] = d.flats
            .filter(f => f.societyId === activeSocietyId && !existing.has(f.id))
            .map(f => ({
              id: uid('bill'), societyId: activeSocietyId, flatId: f.id,
              month, amount: society.maintenanceAmount, paidAmount: 0,
              dueDate: `${month}-${String(society.dueDay).padStart(2, '0')}`,
            }))
          created = fresh.length
          return fresh.length ? { ...d, bills: [...d.bills, ...fresh] } : d
        })
        return created
      },

      recordPayment: ({ flatId, billId, amount, mode, refNo, note, failed, date, pending }) => {
        const year = (date ?? todayISO()).slice(0, 4)
        const status: Payment['status'] = failed ? 'failed' : pending ? 'pending_confirmation' : 'success'
        const receiptNo = status === 'success' ? `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}` : undefined
        const pay: Payment = {
          id: uid('pay'), societyId: activeSocietyId, flatId, billId,
          date: date ?? todayISO(), amount, mode, refNo, status, receiptNo, note,
        }
        const ok = guardedSetDb(d => {
          const bills = status === 'success' && billId
            ? d.bills.map(b => b.id === billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + amount) } : b)
            : d.bills
          const societies = status === 'success' ? d.societies.map(s => s.id === activeSocietyId ? { ...s, receiptSeq: s.receiptSeq + 1 } : s) : d.societies
          return { ...d, bills, societies, payments: [pay, ...d.payments] }
        })
        return ok ? pay : null
      },
      confirmPendingPayment: (paymentId) => {
        guardedSetDb(d => {
          const p = d.payments.find(x => x.id === paymentId)
          if (!p || p.status !== 'pending_confirmation') return d
          const year = p.date.slice(0, 4)
          const receiptNo = `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}`
          const bills = p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + p.amount) } : b) : d.bills
          return {
            ...d, bills,
            payments: d.payments.map(x => x.id === paymentId ? { ...x, status: 'success' as const, receiptNo } : x),
            societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, receiptSeq: s.receiptSeq + 1 } : s),
          }
        })
      },
      cancelReceipt: (paymentId, reason) => {
        guardedSetDb(d => {
          const p = d.payments.find(x => x.id === paymentId)
          if (!p) return d
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
      },

      addComplaint: ({ flatId, category, title, detail, priority, photoName }) => {
        const flat = flatById(flatId)
        const c: Complaint = {
          id: uid('cmp'), societyId: activeSocietyId, flatId, category, title, detail, priority,
          status: 'new', createdAt: todayISO(), internalNotes: [],
          hasPhoto: !!photoName, photoName,
          timeline: [{ date: todayISO(), status: 'new', by: flat?.ownerName ?? 'સભ્ય' }],
        }
        const ok = guardedSetDb(d => ({ ...d, complaints: [c, ...d.complaints] }))
        return ok ? c : null
      },
      advanceComplaint: (id, status, note, by, assignedTo) =>
        guardedSetDb(d => ({
          ...d,
          complaints: d.complaints.map(c => c.id === id ? {
            ...c, status,
            assignedTo: assignedTo ?? c.assignedTo,
            timeline: [...c.timeline, { date: todayISO(), status, note: note || undefined, by }],
          } : c),
        })),
      addInternalNote: (id, note) =>
        guardedSetDb(d => ({ ...d, complaints: d.complaints.map(c => c.id === id ? { ...c, internalNotes: [...c.internalNotes, note] } : c) })),
      addFeedback: (id, rating, comment) =>
        guardedSetDb(d => ({ ...d, complaints: d.complaints.map(c => c.id === id ? { ...c, feedback: { rating, comment } } : c) })),

      addNotice: (n) =>
        guardedSetDb(d => ({ ...d, notices: [{ id: uid('not'), societyId: activeSocietyId, date: todayISO(), ...n }, ...d.notices] })),
      togglePin: (id) =>
        guardedSetDb(d => ({ ...d, notices: d.notices.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) })),

      addExpense: (e) =>
        guardedSetDb(d => ({ ...d, expenses: [{ id: uid('exp'), societyId: activeSocietyId, ...e }, ...d.expenses] })),
      addVendor: (v) =>
        guardedSetDb(d => ({ ...d, vendors: [...d.vendors, { id: uid('ven'), societyId: activeSocietyId, ...v }] })),
      updateVendor: (id, patch) =>
        guardedSetDb(d => ({ ...d, vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v) })),
      addDocumentMeta: (doc) =>
        guardedSetDb(d => ({ ...d, documents: [{ id: uid('doc'), societyId: activeSocietyId, date: todayISO(), ...doc }, ...d.documents] })),

      addPoll: (p) =>
        guardedSetDb(d => ({ ...d, polls: [{ id: uid('poll'), societyId: activeSocietyId, votes: {}, status: 'open', ...p }, ...d.polls] })),
      closePoll: (id) =>
        guardedSetDb(d => ({ ...d, polls: d.polls.map(p => p.id === id ? { ...p, status: 'closed', resultVisible: true } : p) })),
      vote: (pollId, flatId, optionIdx) => {
        if (!canWriteNow) return false
        const poll = scopedDb.polls.find(p => p.id === pollId)
        if (!poll || poll.status !== 'open') return false
        if (poll.votes[flatId] !== undefined) return false // one vote per flat
        return guardedSetDb(d => ({
          ...d,
          polls: d.polls.map(p => p.id === pollId ? { ...p, votes: { ...p.votes, [flatId]: optionIdx } } : p),
        }))
      },

      addEvent: (e) =>
        guardedSetDb(d => ({ ...d, events: [{ id: uid('evt'), societyId: activeSocietyId, contributions: [], volunteers: [], expenses: [], ...e }, ...d.events] })),
      addContribution: (eventId, flatId, amount) =>
        guardedSetDb(d => ({
          ...d,
          events: d.events.map(ev => ev.id === eventId
            ? { ...ev, contributions: [...ev.contributions, { flatId, amount, date: todayISO() }] } : ev),
        })),
      addVolunteer: (eventId, name) =>
        guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId && !ev.volunteers.includes(name) ? { ...ev, volunteers: [...ev.volunteers, name] } : ev) })),
      addEventExpense: (eventId, label, amount) =>
        guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, expenses: [...ev.expenses, { label, amount }] } : ev) })),

      addVehicle: (v) =>
        guardedSetDb(d => ({ ...d, vehicles: [...d.vehicles, { id: uid('veh'), societyId: activeSocietyId, ...v }] })),
      addFlat: (f) =>
        guardedSetDb(d => ({ ...d, flats: [...d.flats, { id: uid('flat'), societyId: activeSocietyId, memberSince: new Date().getFullYear(), ...f }] })),
      addFlatsBulk: (rows) => {
        const existingNumbers = new Set(scopedDb.flats.map(f => f.number))
        const skippedDuplicates: string[] = []
        const fresh: Flat[] = []
        for (const r of rows) {
          if (existingNumbers.has(r.number)) { skippedDuplicates.push(r.number); continue }
          existingNumbers.add(r.number)
          fresh.push({ id: uid('flat'), societyId: activeSocietyId, memberSince: new Date().getFullYear(), ...r })
        }
        guardedSetDb(d => ({ ...d, flats: [...d.flats, ...fresh] }))
        return { added: fresh.length, skippedDuplicates }
      },
      addAdjustment: (a) =>
        guardedSetDb(d => ({ ...d, adjustments: [{ id: uid('adj'), societyId: activeSocietyId, ...a }, ...d.adjustments] })),
      updateSociety: (patch) =>
        guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, ...patch } : s) })),

      addMembership: (m) => {
        const mem: Membership = { id: uid('mem'), createdAt: todayISO(), status: 'active', ...m }
        setDb(d => ({ ...d, memberships: [...d.memberships, mem] }))
        return mem
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
          id: uid('soc'), upiId: '', plan: 'trial', flatsLimit: 60, slug, joinCode,
          subscriptionStatus: 'trial', receiptSeq: 1, createdAt: todayISO(), ...s,
        }
        setDb(d => ({ ...d, societies: [...d.societies, newSoc] }))
        return newSoc
      },
      updateSocietyById: (id, patch) =>
        setDb(d => ({ ...d, societies: d.societies.map(s => s.id === id ? { ...s, ...patch } : s) })),

      addPlatformBillingRecord: (r) =>
        setDb(d => ({ ...d, platformBilling: [...d.platformBilling, { id: uid('pb'), ...r }] })),
      updatePlatformBillingRecord: (id, patch) =>
        setDb(d => ({ ...d, platformBilling: d.platformBilling.map(r => r.id === id ? { ...r, ...patch } : r) })),

      addLead: (l) =>
        setDb(d => ({ ...d, leads: [{ id: uid('lead'), status: 'new', createdAt: todayISO(), ...l }, ...d.leads] })),
      updateLeadStatus: (id, status, internalNote) =>
        setDb(d => ({ ...d, leads: d.leads.map(l => l.id === id ? { ...l, status, internalNote: internalNote ?? l.internalNote } : l) })),

      resetAll: () => {
        localStorage.removeItem(DB_KEY)
        setDb(DEMO_SEED_ENABLED ? buildSeed() : emptySeed())
      },
    }
  }, [db, session, activeSociety, activeSocietyId])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
