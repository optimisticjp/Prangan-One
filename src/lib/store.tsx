/**
 * The real, Supabase-backed data layer - genuinely separate now from the
 * public sales demo, which lives entirely in demoStore.tsx and never
 * imports anything from this file at all (see the comment at the top of
 * demoStore.tsx for why that separation is structural, not just a
 * convention). Both implement the exact same Store interface
 * (storeContext.ts) and both are reached through the same useData()
 * hook, so no page ever needs to know or care which provider it's
 * actually talking to - but which one is actually mounted is decided
 * once, at the root (see main.tsx), not by a runtime branch inside a
 * single shared provider the way it used to work.
 *
 * This file still has its own local-only fallback mode too, for when
 * Supabase isn't configured at all (no VITE_SUPABASE_URL set) - that's
 * what makes `npm run dev` work instantly with no setup, and it's also
 * what the whole existing test suite runs against. Genuinely different
 * purpose from the public demo now, even though the underlying
 * mechanism (login(), resetAll(), the seed data below) is the same code
 * that used to also serve /demo directly, before this build.
 *
 * Real sessions: every core module (societies, flats, bills, payments,
 * adjustments, complaints, notices, documents, memberships, vendors,
 * vehicles, polls, events, expenses, platform billing, audit logs,
 * impersonation logs, leads) reads and writes through Supabase for real -
 * see realData.ts for the actual fetch/insert/update functions, and
 * attemptRealWrite below for how a failed real write surfaces and retries
 * rather than failing silently.
 *
 * Multi-tenancy: db.societies is always the FULL list for a real owner (the
 * owner console needs to see every society on the platform - RLS itself is
 * what actually enforces this is only true for a genuine owner, not the
 * shape of the query). Every other society-owned table is scoped to the
 * active society (session.societyId) before it's handed to pages. The raw,
 * unscoped state lives in this file only; nothing outside it ever sees
 * cross-society data by accident.
 *
 * Write guard: every mutating action goes through guardedSetDb, which
 * checks canWrite() (src/lib/subscription.ts) before touching state. Owner
 * writes are never blocked. This is a real, working guard for local demo
 * state - for real sessions, the same rules are also independently
 * enforced by Supabase's own Row Level Security (see supabase/schema.sql
 * and supabase/tests/run-isolation-tests.sh for the automated, repeatable
 * proof of that), since a browser-side check alone can always be bypassed
 * by someone editing their own client. Real enforcement lives in the
 * database, always, this guard is the local-demo-mode equivalent of it,
 * not a substitute for it.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type {
  Adjustment, AuditLogEntry, Bill, Complaint, ComplaintStatus, DB, Doc, DocPermission, Expense,
  Flat, ImpersonationLog, Membership, ModuleLayer, Notice, PayMode, Payment, PendingSyncEntry, Poll, PublicLead,
  Role, Session, Society, SocietyEvent, SocietyModules, SubscriptionStatus, TenantAccessMode, Vehicle, Vendor,
} from './types'
import { uid, realUid } from './id'
import { Ctx, useData, type Store, type NewSocietyInput } from './storeContext'
export { useData }
export type { Store }
import { supabase, supabaseConfigured } from './supabase'
import {
  billStatus, flatAdjustmentNet,
  flatPending as sharedFlatPending, totalPending as sharedTotalPending,
  monthIncome as sharedMonthIncome, monthExpense as sharedMonthExpense,
  moduleEnabled as sharedModuleEnabled, adminCanToggle as sharedAdminCanToggle,
} from './storeHelpers'
import {
  fetchSocietyFinancials, insertFlatReal, updateFlatReal, insertBillsReal, recordPaymentReal, confirmPendingPaymentReal, cancelReceiptAtomicReal, updatePaymentReal, insertAdjustmentReal,
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
  fetchSocietyExpenses, insertExpenseReal,
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
import { fetchPublicLeads, updateLeadInSupabase } from './leads'

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
    pendingSync: [],
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
    pendingSync: [],
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
  'platformBilling', 'leads', 'unmatchedLoginAttempts', 'auditLogs', 'impersonationLogs', 'pendingSync',
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


export function DataProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [db, setDb] = useState<DB>(loadDB)
  const [session, setSession] = useState<Session>(loadSession)
  const [financialsLoading, setFinancialsLoading] = useState(false)
  // The actual fix for a real, previously silent gap: before this, if the
  // initial real-session fetch failed for any reason, the person was left
  // looking at whatever was already there - possibly stale, possibly
  // completely empty on a first load - with nothing telling them anything
  // had gone wrong at all. fetchError is set true on that failure and
  // cleared the moment a fetch actually succeeds; retryFetch (exposed
  // further down) just increments refetchTrigger, which is in the fetch
  // effect's own dependency array below, to force it to run again.
  const [fetchError, setFetchError] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  // The richer connection-health model layered onto the same fetch tracking
  // above (see dataHealth in the store value below, and DataHealth in
  // storeContext.ts). These are real timestamps, not booleans: fetchError
  // already says whether the last refresh failed, but not when the last good
  // data actually came in, which is what lets the UI show a real age instead
  // of a bare "failed". Set in the one fetch effect below, right where
  // setFetchError already is, so there's no second fetch-tracking path.
  const [lastRefreshSuccessAt, setLastRefreshSuccessAt] = useState<number | null>(null)
  const [lastRefreshFailureAt, setLastRefreshFailureAt] = useState<number | null>(null)
  // Genuinely offline, from the browser's own signal rather than inferred
  // from a failed fetch - a failed fetch and a real disconnection are
  // different situations and the UI should be able to say which. Wired to the
  // window online/offline events in an effect below.
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  // Surfaces WHY a write was just blocked, so a page can show something
  // like "you're in read-only mode" instead of the write just silently
  // doing nothing - before this, guardedSetDb only ever logged a console
  // warning nobody but a developer would ever see.
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null)

  // The retry closures for whatever's still failing THIS session live in
  // a ref (a function isn't something React state is meant to hold), and
  // are purely a fast path - if one isn't there (a fresh page load, most
  // commonly), retrying falls back to resyncPendingWrite below, which
  // rebuilds the retry from db.pendingSync's own persisted data instead.
  // failedWrites itself (returned further down) is a live view of
  // db.pendingSync, not separate state - that's what makes a failure
  // survive a reload now, instead of only existing in memory for as long
  // as the tab stays open.
  const failedWriteRetries = useRef<Map<string, () => void>>(new Map())

  // The one place every real write's failure handling actually lives now,
  // instead of 33 separate ".catch(() => { /* local state already
  // reflects it */ })" blocks that quietly did nothing. label is what a
  // person sees ("ફરિયાદ", "ચુકવણી") if this specific save fails - id is
  // whatever id the local optimistic item already has, so a retry that
  // succeeds removes exactly the right entry, not just "the most recent
  // one." Genuinely re-attempts the original operation on retry, not a
  // refetch or a different write - same writeFn, called again.
  const attemptRealWrite = (id: string, label: string, writeFn: () => Promise<void>, kind: PendingSyncEntry['kind'], context?: Record<string, string>) => {
    writeFn()
      .then(() => {
        failedWriteRetries.current.delete(id)
        setDb(d => (d.pendingSync.some(p => p.id === id) ? { ...d, pendingSync: d.pendingSync.filter(p => p.id !== id) } : d))
      })
      .catch(() => {
        failedWriteRetries.current.set(id, () => attemptRealWrite(id, label, writeFn, kind, context))
        setDb(d => (d.pendingSync.some(p => p.id === id) ? d : { ...d, pendingSync: [...d.pendingSync, { id, label, kind, context }] }))
      })
  }

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* storage full */ }
  }, [db])
  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* ignore */ }
  }, [session])

  // Read fresh inside the listener below, which is set up once (empty
  // dependency array) and would otherwise only ever see whatever
  // session.isRealSession looked like at the moment it first mounted -
  // a stale closure, not the current value.
  const isRealSessionRef = useRef(session.isRealSession)
  useEffect(() => { isRealSessionRef.current = session.isRealSession }, [session.isRealSession])

  // Offline state from the browser itself, not guessed from a failed fetch.
  // navigator.onLine gives the current value; the online/offline window
  // events keep it live as the connection actually comes and goes. Set up
  // once - re-reading navigator.onLine on mount too, in case it changed
  // between the initial useState above and this effect actually running.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    setOffline(navigator.onLine === false)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Notices when a real session has genuinely ended, for any reason, not
  // just someone clicking the logout button - a token that quietly
  // expired, or a refresh token Supabase itself rejected (revoked, or
  // the person's access to a society was removed while they still had
  // the app open). Before this, nothing was actually listening for that:
  // the app would just keep showing whatever real data had last been
  // successfully fetched, with nothing telling the person their session
  // was gone or clearing what was still sitting in this browser. Only
  // reacts if the app's own session was actually real to begin with -
  // otherwise a first-time visitor to the public site, who was never
  // logged in at all, would trip this on the very first page load.
  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event !== 'SIGNED_OUT' || !isRealSessionRef.current) return
      setSession({ role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
      setDb(DEMO_SEED_ENABLED ? buildSeed() : emptySeed())
      navigate('/login')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

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
    // financial bundle scoped to whatever session.societyId happens to
    // currently be (which for an owner session is essentially arbitrary).
    if (session.role === 'owner') {
      Promise.all([
        fetchAllSocieties(), fetchAllFlatsForOwner(), fetchAllMembershipsForOwner(),
        fetchAllPlatformBilling(), fetchAllAuditLogs(), fetchAllImpersonationLogs(), fetchPublicLeads(),
      ])
        .then(([societies, flats, memberships, platformBilling, auditLogs, impersonationLogs, leads]) => {
          if (!cancelled) { setDb(d => ({ ...d, societies, flats, memberships, platformBilling, auditLogs, impersonationLogs, leads })); setFetchError(false); setLastRefreshSuccessAt(Date.now()) }
        })
        .catch(() => { if (!cancelled) { setFetchError(true); setLastRefreshFailureAt(Date.now()) } })
        .finally(() => { if (!cancelled) setFinancialsLoading(false) })
      return () => { cancelled = true }
    }

    Promise.all([
      fetchSocietyFinancials(session.societyId),
      fetchSocietyComplaints(session.societyId),
      fetchSocietyNotices(session.societyId),
      fetchSociety(session.societyId),
      fetchSocietyDocuments(session.societyId),
      fetchSocietyMemberships(session.societyId),
      fetchSocietyVendors(session.societyId),
      fetchSocietyVehicles(session.societyId),
      fetchSocietyContacts(session.societyId),
      fetchSocietyPolls(session.societyId),
      fetchSocietyEvents(session.societyId),
      fetchSocietyExpenses(session.societyId),
    ])
      .then(([{ flats, bills, payments, adjustments }, complaints, notices, society, documents, memberships, vendors, vehicles, contacts, polls, events, expenses]) => {
        if (cancelled) return
        setDb(d => ({
          ...d,
          flats: [...d.flats.filter(f => f.societyId !== session.societyId), ...flats],
          bills: [...d.bills.filter(b => b.societyId !== session.societyId), ...bills],
          payments: [...d.payments.filter(p => p.societyId !== session.societyId), ...payments],
          adjustments: [...d.adjustments.filter(a => a.societyId !== session.societyId), ...adjustments],
          complaints: [...d.complaints.filter(c => c.societyId !== session.societyId), ...complaints],
          notices: [...d.notices.filter(n => n.societyId !== session.societyId), ...notices],
          societies: society ? [...d.societies.filter(s => s.id !== session.societyId), society] : d.societies,
          documents: [...d.documents.filter(doc => doc.societyId !== session.societyId), ...documents],
          memberships: [...d.memberships.filter(m => m.societyId !== session.societyId), ...memberships],
          vendors: [...d.vendors.filter(v => v.societyId !== session.societyId), ...vendors],
          vehicles: [...d.vehicles.filter(v => v.societyId !== session.societyId), ...vehicles],
          contacts: [...d.contacts.filter(c => c.societyId !== session.societyId), ...contacts],
          polls: [...d.polls.filter(p => p.societyId !== session.societyId), ...polls],
          events: [...d.events.filter(ev => ev.societyId !== session.societyId), ...events],
          expenses: [...d.expenses.filter(e => e.societyId !== session.societyId), ...expenses],
        }))
        setFetchError(false)
        setLastRefreshSuccessAt(Date.now())
      })
      .catch(() => { if (!cancelled) { setFetchError(true); setLastRefreshFailureAt(Date.now()) } })
      .finally(() => { if (!cancelled) setFinancialsLoading(false) })
    return () => { cancelled = true }
  }, [session.societyId, session.isRealSession, session.role, refetchTrigger])

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
      pendingSync: db.pendingSync, // not society-scoped - a pending item could be for any society, and resync needs to see all of them
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
    const flatPending = (flatId: string) => sharedFlatPending(scopedDb, flatId)
    const totalPending = () => sharedTotalPending(scopedDb)
    const monthIncome = (month: string) => sharedMonthIncome(scopedDb, month)
    const monthExpense = (month: string) => sharedMonthExpense(scopedDb, month)
    const moduleEnabled = (key: keyof SocietyModules) => sharedModuleEnabled(society, key)
    const adminCanToggle = (key: keyof SocietyModules) => sharedAdminCanToggle(society, key)

    // Rebuilds a real retry from a pending entry's CURRENT data in db,
    // not the original closure (which can't survive being saved to and
    // reloaded from localStorage - it's a function, not data). This is
    // what makes a failed write recoverable across a reload, not just
    // visible for the rest of the current session. Every insert this
    // calls is already safe to attempt again (see realData.ts - each one
    // checks whether its row already exists first, or is naturally
    // idempotent), so retrying with whatever's currently in db is
    // correct even if some of it already reached the database on an
    // earlier, partially-successful attempt.
    const resyncPendingWrite = (entry: DB['pendingSync'][number]) => {
      const { id, kind, context } = entry
      const retry = (writeFn: (() => Promise<void>) | null) => {
        if (!writeFn) {
          // the record this pointed at is gone (deleted locally since,
          // or never actually existed) - nothing left to retry, so drop
          // the pending entry rather than leave a permanently-stuck one
          setDb(d => ({ ...d, pendingSync: d.pendingSync.filter(p => p.id !== id) }))
          return
        }
        attemptRealWrite(id, entry.label, writeFn, kind, context)
      }
      switch (kind) {
        case 'society': { const r = db.societies.find(x => x.id === id); retry(r ? () => insertSocietyReal(r) : null); return }
        case 'society-status': { const r = db.societies.find(x => x.id === id); retry(r ? () => updateSocietyStatusReal(id, { trialStartedAt: r.trialStartedAt, plan: r.plan, flatsLimit: r.flatsLimit, subscriptionStatus: r.subscriptionStatus, graceStartedAt: r.graceStartedAt }) : null); return }
        case 'flat': { const r = db.flats.find(x => x.id === id); retry(r ? () => insertFlatReal(id, r.societyId, r) : null); return }
        case 'flat-update': { const r = db.flats.find(x => x.id === id); retry(r ? () => updateFlatReal(id, r) : null); return }
        case 'membership': { const r = db.memberships.find(x => x.id === id); retry(r ? () => insertMembershipReal(r) : null); return }
        case 'bill-batch': {
          if (!context) { retry(null); return }
          const rows = db.bills.filter(x => x.societyId === context.societyId && x.month === context.month)
          retry(rows.length ? () => insertBillsReal(rows) : null)
          return
        }
        case 'payment': {
          const r = db.payments.find(x => x.id === id)
          retry(r ? () => recordPaymentReal(r).then(() => {}) : null)
          return
        }
        case 'payment-confirm': {
          const r = db.payments.find(x => x.id === id)
          retry(r ? () => confirmPendingPaymentReal(id).then(() => {}) : null)
          return
        }
        case 'receipt-cancel': {
          const r = db.payments.find(x => x.id === id)
          retry(r ? () => cancelReceiptAtomicReal(id, r.cancelReason ?? '') : null)
          return
        }
        case 'adjustment': { const r = db.adjustments.find(x => x.id === id); retry(r ? () => insertAdjustmentReal(r) : null); return }
        case 'complaint': { const r = db.complaints.find(x => x.id === id); retry(r ? () => insertComplaintReal(r) : null); return }
        case 'complaint-advance': { const r = db.complaints.find(x => x.id === id); const t = r?.timeline[r.timeline.length - 1]; retry(r && t ? () => advanceComplaintReal(id, r.status, t.note ?? '', t.by, r.assignedTo) : null); return }
        case 'complaint-notes': { const r = db.complaints.find(x => x.id === id); retry(r ? () => updateComplaintNotesReal(id, r.internalNotes) : null); return }
        case 'complaint-feedback': { const r = db.complaints.find(x => x.id === id); retry(r?.feedback ? () => updateComplaintFeedbackReal(id, r.feedback!) : null); return }
        case 'notice': { const r = db.notices.find(x => x.id === id); retry(r ? () => insertNoticeReal(r) : null); return }
        case 'notice-pin': { const r = db.notices.find(x => x.id === id); retry(r ? () => updateNoticePinnedReal(id, r.pinned) : null); return }
        case 'document': { const r = db.documents.find(x => x.id === id); retry(r ? () => insertDocumentReal(r) : null); return }
        case 'expense': { const r = db.expenses.find(x => x.id === id); retry(r ? () => insertExpenseReal(r) : null); return }
        case 'vendor': { const r = db.vendors.find(x => x.id === id); retry(r ? () => insertVendorReal(r) : null); return }
        case 'vendor-update': { const r = db.vendors.find(x => x.id === id); retry(r ? () => updateVendorReal(id, r) : null); return }
        case 'poll': { const r = db.polls.find(x => x.id === id); retry(r ? () => insertPollReal(r) : null); return }
        case 'poll-close': { const r = db.polls.find(x => x.id === id); retry(r ? () => closePollReal(id) : null); return }
        case 'poll-vote': {
          if (!context) { retry(null); return }
          const poll = db.polls.find(x => x.id === context.pollId)
          const optionIdx = poll?.votes[context.flatId]
          retry(optionIdx !== undefined ? () => insertPollVoteReal(context.pollId, context.flatId, optionIdx) : null)
          return
        }
        case 'event': { const r = db.events.find(x => x.id === id); retry(r ? () => insertEventReal(r) : null); return }
        case 'event-contribution': {
          if (!context) { retry(null); return }
          const ev = db.events.find(x => x.id === context.eventId)
          const c = ev?.contributions.find(x => x.flatId === context.flatId)
          retry(c ? () => insertContributionReal(context.eventId, context.flatId, c.amount, c.date) : null)
          return
        }
        case 'event-volunteer': {
          if (!context) { retry(null); return }
          const ev = db.events.find(x => x.id === context.eventId)
          retry(ev?.volunteers.includes(context.name) ? () => insertVolunteerReal(context.eventId, context.name) : null)
          return
        }
        case 'event-expense': {
          // No client-provided id or natural unique constraint exists for
          // this one (see the honest note on insertEventExpenseReal in
          // realData.ts) - can't reliably confirm the exact line item is
          // still present versus already synced, so this is the one kind
          // that isn't auto-resynced after a reload. Still tracked and
          // shown, just not silently retried, since a second, wrong
          // attempt here could create a genuine duplicate rather than
          // safely no-op the way every other kind's retry does.
          retry(null)
          return
        }
        case 'vehicle': { const r = db.vehicles.find(x => x.id === id); retry(r ? () => insertVehicleReal(r) : null); return }
        case 'platform-billing': { const r = db.platformBilling.find(x => x.id === id); retry(r ? () => insertPlatformBillingReal(r) : null); return }
        case 'platform-billing-update': { const r = db.platformBilling.find(x => x.id === id); retry(r ? () => updatePlatformBillingReal(id, r) : null); return }
        case 'lead': { const r = db.leads.find(x => x.id === id); retry(r ? () => updateLeadInSupabase(id, { status: r.status, internalNote: r.internalNote }) : null); return }
      }
    }

    return {
      db: scopedDb, rawDb: db, session, society, financialsLoading, fetchError, retryFetch: () => setRefetchTrigger(n => n + 1), lastBlockedReason, canWriteNow,
      // One consistent connection-health model, all of it reused from state
      // that already exists: refreshState is the same financialsLoading the
      // spinner uses, pendingWriteCount is the length of the same pendingSync
      // queue failedWrites is a view of, and the two timestamps plus offline
      // are the new signals the old booleans couldn't carry. See DataHealth
      // in storeContext.ts.
      dataHealth: {
        refreshState: financialsLoading ? 'refreshing' : 'idle',
        lastRefreshSuccessAt,
        lastRefreshFailureAt,
        offline,
        pendingWriteCount: db.pendingSync.length,
      },
      failedWrites: db.pendingSync.map(p => ({ id: p.id, label: p.label })),
      retryFailedWrite: (id) => {
        const closure = failedWriteRetries.current.get(id)
        if (closure) { closure(); return }
        const entry = db.pendingSync.find(p => p.id === id)
        if (entry) resyncPendingWrite(entry)
      },
      dismissFailedWrite: (id) => {
        failedWriteRetries.current.delete(id)
        setDb(d => ({ ...d, pendingSync: d.pendingSync.filter(p => p.id !== id) }))
      },
      subscriptionBannerFor: (audience) => statusBanner(society, audience),

      setSubscriptionStatus: (societyId, status) => {
        const graceStartedAt = status === 'grace' ? todayISO() : (status === 'active' || status === 'trial' ? null : undefined)
        setDb(d => ({
          ...d,
          societies: d.societies.map(s => s.id === societyId
            ? { ...s, subscriptionStatus: status, graceStartedAt: graceStartedAt === null ? undefined : (graceStartedAt ?? s.graceStartedAt) }
            : s),
          auditLogs: [{ id: uid('aud'), societyId, at: new Date().toISOString(), actor: 'Prangan One ઓનર', action: 'subscription_status_changed', detail: `સ્થિતિ બદલાઈ: ${status}` }, ...d.auditLogs],
        }))
        if (session.isRealSession) {
          attemptRealWrite(societyId, 'સબ્સ્ક્રિપ્શન સ્થિતિ', () => updateSocietyStatusReal(societyId, { subscriptionStatus: status, graceStartedAt }), 'society-status')
        }
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
      // Resets to a completely fresh baseline for any real session - not a
      // surgical filter of "just this society's four fields," which is
      // what this used to do and was already wrong the moment complaints,
      // notices, documents, memberships, vendors, vehicles, contacts,
      // polls, and events all got their own real fetches: none of those
      // were ever cleared here, so they stayed cached in this browser
      // indefinitely after signing out. A full reset also correctly
      // handles the owner's own session, whose data (every society, every
      // flat, platform billing, the audit log, leads) was never scoped to
      // one society to begin with, so filtering by societyId could never
      // have cleaned it up even if it had been included. On a shared
      // device this means every trace of real data is gone the moment
      // someone signs out - not just readable-until-overwritten, actually
      // gone. Local demo data is unaffected by this in the sense that a
      // fresh demo seed is what real data gets replaced with, so /demo
      // still works normally right after a real logout, not left empty.
      logout: () => {
        const wasReal = session.isRealSession
        setSession({ role: null, flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
        if (wasReal) {
          setDb(DEMO_SEED_ENABLED ? buildSeed() : emptySeed())
          // Fire-and-forget: the app's own state is already cleared above,
          // immediately, for instant feedback - this is what makes the
          // session actually end for real, not just stop being shown
          // locally. Supabase's own onAuthStateChange listener (above)
          // will also see this fire, harmlessly redundant at that point
          // since there's nothing left for it to clear.
          if (supabase) supabase.auth.signOut().catch(() => { /* local state is already cleared either way */ })
        }
      },
      // Entering a society as support is fail-closed for a real owner: the
      // real database session is requested and confirmed FIRST, and only
      // then does the UI switch into the target society's read-only view. If
      // the database refuses or never confirms, the owner stays in the Owner
      // Console with an error, rather than being dropped into a view that
      // looks real but where the read-only safeguard was never actually
      // armed. Returns the outcome so the calling button navigates only on
      // success and can disable itself while the request is in flight, so it
      // can't be double-submitted.
      enterSociety: async (societyId, role, reason) => {
        // session.isRealSession here reflects the owner's own genuine
        // identity, captured before setSession below overwrites it with the
        // impersonated view's session.
        const wasRealOwner = session.isRealSession
        if (!wasRealOwner) {
          // Local/demo owner support mode: there is no real database session
          // to confirm against, so this stays the immediate local switch it
          // always was. Nothing here is real, and canWriteNow blocks writes
          // the same way. Runs synchronously (no await before setSession) so
          // a caller batching a follow-up action in the same tick still sees
          // the pre-switch session, unchanged from before.
          const log: ImpersonationLog = { id: uid('imp'), societyId, enteredAt: new Date().toISOString(), mode: 'readonly', reason }
          setDb(d => ({ ...d, impersonationLogs: [log, ...d.impersonationLogs] }))
          setSession({ role, flatId: null, societyId, explicitSociety: true, actingAsOwner: true, isRealSession: false, supportMode: 'readonly' })
          return { ok: true }
        }
        try {
          // Wait for the database to actually create the session and hand
          // back a real record before touching the UI. insertImpersonationLogReal
          // goes through the open_support_session RPC, which sets
          // owner_user_id server-side from auth.uid() - that identity is
          // exactly what the read-only safeguard matches on, so confirming
          // the record came back is confirming the safeguard is now armed.
          const created = await insertImpersonationLogReal(societyId, reason)
          setDb(d => ({ ...d, impersonationLogs: [created, ...d.impersonationLogs] }))
          setSession({ role, flatId: null, societyId, explicitSociety: true, actingAsOwner: true, isRealSession: true, supportMode: 'readonly' })
          return { ok: true }
        } catch {
          return { ok: false, error: 'સપોર્ટ સેશન શરૂ ન થઈ શક્યું. ફરી પ્રયાસ કરો.' }
        }
      },
      // Exiting is equally explicit: the close is attempted and confirmed
      // against the database before returning to the Owner Console. If it
      // fails, the owner is kept in support mode with an error and a retry,
      // not silently returned as if it worked while they may still be
      // database-blocked for that society. The log id tells us whether the
      // session was real (a server uuid) or local demo (the uid('imp')
      // prefix) - the same check that fixed the older bug where a real owner
      // came back out of support mode stuck in local-only state.
      exitImpersonation: async () => {
        const current = db.impersonationLogs.find((l, i) => i === 0 && l.societyId === session.societyId && !l.exitedAt)
        const wasRealOwner = !!current && !current.id.startsWith('imp_')
        if (!wasRealOwner) {
          setDb(d => ({
            ...d,
            impersonationLogs: d.impersonationLogs.map((l, i) => i === 0 && l.societyId === session.societyId && !l.exitedAt ? { ...l, exitedAt: new Date().toISOString() } : l),
          }))
          setSession({ role: 'owner', flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: false })
          return { ok: true }
        }
        try {
          const closed = await exitImpersonationLogReal(current!.id)
          setDb(d => ({
            ...d,
            impersonationLogs: d.impersonationLogs.map(l => l.id === current!.id ? { ...l, exitedAt: closed.exitedAt ?? new Date().toISOString() } : l),
          }))
          setSession({ role: 'owner', flatId: null, societyId: DEFAULT_SOCIETY_ID, explicitSociety: false, actingAsOwner: false, isRealSession: true })
          return { ok: true }
        } catch {
          return { ok: false, error: 'સપોર્ટ સેશન બંધ ન થઈ શક્યું. ફરી પ્રયાસ કરો.' }
        }
      },
      findSocietyBySlug: (slug) => db.societies.find(s => s.slug === slug),
      setActiveSocietyContext: (societyId) =>
        setSession(s => ({ ...s, societyId, role: null, flatId: null, explicitSociety: true, actingAsOwner: false, isRealSession: false })),

      setOwnerWorkingSociety: (societyId) =>
        setSession(s => ({ ...s, societyId, explicitSociety: true })),

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
          attemptRealWrite(membershipId, 'સભ્યપદ મંજૂરી', () => approveMembershipReal(membershipId), 'membership')
        }
      },

      rejectMembership: (membershipId) => {
        const ok = guardedSetDb(d => ({ ...d, memberships: d.memberships.filter(m => m.id !== membershipId) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(membershipId, 'સભ્યપદ નકારવું', () => rejectMembershipReal(membershipId), 'membership')
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
          const availableCredit = Math.max(0, -flatAdjustmentNet(scopedDb, f.id))
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
          const availableCredit = Math.max(0, -flatAdjustmentNet(scopedDb, f.id))
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
            attemptRealWrite(`bills-${activeSocietyId}-${month}`, `${month} બિલ`, () => insertBillsReal(fresh), 'bill-batch', { societyId: activeSocietyId, month })
            for (const adj of creditAdjustments) attemptRealWrite(adj.id, 'ક્રેડિટ એડજસ્ટમેન્ટ', () => insertAdjustmentReal(adj), 'adjustment')
          }
        }
        return fresh.length
      },

      recordPayment: ({ flatId, billId, amount, mode, refNo, note, failed, date, pending, proofFile }) => {
        const year = (date ?? todayISO()).slice(0, 4)
        const status: Payment['status'] = failed ? 'failed' : pending ? 'pending_confirmation' : 'success'
        // Optimistic only - for a real session, the actual receipt number
        // is whatever record_payment_atomic (schema.sql) allocates under
        // a real lock, reconciled in below once that call returns. Shown
        // immediately anyway for instant feedback; it's very rarely
        // different, but when it is (two people recording payments for
        // the same society at the same instant), the real one always
        // wins.
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
          attemptRealWrite(pay.id, 'ચુકવણી', () =>
            recordPaymentReal(pay).then(async result => {
              // Reconcile the optimistic guess with what the database
              // actually, atomically allocated - almost always identical,
              // but the server's own number is what's authoritative, not
              // the client's.
              setDb(d => ({
                ...d,
                payments: d.payments.map(x => x.id === pay.id ? { ...x, receiptNo: result.receiptNo ?? x.receiptNo } : x),
                adjustments: overpayAdj && result.adjustmentId
                  ? d.adjustments.map(a => a.id === overpayAdj.id ? { ...a, id: result.adjustmentId! } : a)
                  : d.adjustments,
              }))
              // Same reasoning as addComplaint's photo upload - the
              // payment row has to exist in the real database first (the
              // storage policy checks for it), so the proof screenshot
              // uploads as a genuine second step, not part of the
              // original insert.
              if (!proofFile) return
              const path = await uploadPrivateFile('payment-proof', pay.id, proofFile)
              await updatePaymentReal(pay.id, { proofPath: path })
              setDb(d => ({ ...d, payments: d.payments.map(x => x.id === pay.id ? { ...x, proofPath: path } : x) }))
            }), 'payment')
        }
        return ok ? pay : null
      },
      confirmPendingPayment: (paymentId) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p || p.status !== 'pending_confirmation') return
        const year = p.date.slice(0, 4)
        // Optimistic only - see the matching comment in recordPayment
        // above. The real number is whatever confirm_pending_payment_atomic
        // (schema.sql) allocates under a real lock.
        const receiptNo = `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}`
        guardedSetDb(d => {
          const bills = p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + p.amount) } : b) : d.bills
          return {
            ...d, bills,
            payments: d.payments.map(x => x.id === paymentId ? { ...x, status: 'success' as const, receiptNo } : x),
            societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, receiptSeq: s.receiptSeq + 1 } : s),
          }
        })
        if (session.isRealSession) {
          attemptRealWrite(paymentId, 'ચુકવણી પુષ્ટિ', () =>
            confirmPendingPaymentReal(paymentId).then(result => {
              setDb(d => ({ ...d, payments: d.payments.map(x => x.id === paymentId ? { ...x, receiptNo: result.receiptNo ?? x.receiptNo } : x) }))
            }), 'payment-confirm')
        }
      },
      cancelReceipt: (paymentId, reason) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p) return
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
          attemptRealWrite(paymentId, 'રસીદ રદ કરવી', () => cancelReceiptAtomicReal(paymentId, reason), 'receipt-cancel')
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
          // write - insert, then upload, then attach the resulting path
          // back onto the same row. attemptRealWrite retries the whole
          // sequence on failure, not just whichever step happened to fail.
          attemptRealWrite(c.id, 'ફરિયાદ', () =>
            insertComplaintReal(c).then(async () => {
              if (!photoFile) return
              const path = await uploadPrivateFile('complaint-photos', c.id, photoFile)
              await updateComplaintPhotoPathReal(c.id, path)
              setDb(d => ({ ...d, complaints: d.complaints.map(x => x.id === c.id ? { ...x, photoPath: path } : x) }))
            }), 'complaint')
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
          attemptRealWrite(id, 'ફરિયાદ સ્થિતિ', () => advanceComplaintReal(id, status, note, by, assignedTo), 'complaint-advance')
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
          attemptRealWrite(id, 'આંતરિક નોંધ', () => updateComplaintNotesReal(id, updatedNotes), 'complaint-notes')
        }
      },
      addFeedback: (id, rating, comment) => {
        const ok = guardedSetDb(d => ({ ...d, complaints: d.complaints.map(c => c.id === id ? { ...c, feedback: { rating, comment } } : c) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(id, 'પ્રતિભાવ', () => updateComplaintFeedbackReal(id, { rating, comment }), 'complaint-feedback')
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
          attemptRealWrite(notice.id, 'નોટિસ', () => insertNoticeReal(notice), 'notice')
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
          attemptRealWrite(id, 'નોટિસ પિન', () => updateNoticePinnedReal(id, newPinned), 'notice-pin')
        }
      },

      addExpense: (e) => {
        const expense: Expense = { id: session.isRealSession ? realUid() : uid('exp'), societyId: activeSocietyId, ...e }
        const ok = guardedSetDb(d => ({ ...d, expenses: [expense, ...d.expenses] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(expense.id, 'ખર્ચ', () => insertExpenseReal(expense), 'expense')
        }
      },
      addVendor: (v) => {
        const vendor: Vendor = { id: session.isRealSession ? realUid() : uid('ven'), societyId: activeSocietyId, ...v }
        const ok = guardedSetDb(d => ({ ...d, vendors: [...d.vendors, vendor] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(vendor.id, 'વેન્ડર', () => insertVendorReal(vendor), 'vendor')
        }
      },
      updateVendor: (id, patch) => {
        const ok = guardedSetDb(d => ({ ...d, vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(id, 'વેન્ડર સુધારો', () => updateVendorReal(id, patch), 'vendor-update')
        }
      },
      addDocumentMeta: (doc) => {
        const { file, ...meta } = doc
        const d: Doc = { id: session.isRealSession ? realUid() : uid('doc'), societyId: activeSocietyId, date: todayISO(), ...meta }
        const ok = guardedSetDb(d2 => ({ ...d2, documents: [d, ...d2.documents] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(d.id, 'દસ્તાવેજ', () =>
            insertDocumentReal(d).then(async () => {
              if (!file) return
              const path = await uploadPrivateFile('documents', d.id, file)
              await updateDocumentStoragePathReal(d.id, path)
              setDb(d2 => ({ ...d2, documents: d2.documents.map(x => x.id === d.id ? { ...x, storagePath: path } : x) }))
            }), 'document')
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
          attemptRealWrite(poll.id, 'મતદાન', () => insertPollReal(poll), 'poll')
        }
      },
      closePoll: (id) => {
        const ok = guardedSetDb(d => ({ ...d, polls: d.polls.map(p => p.id === id ? { ...p, status: 'closed', resultVisible: true } : p) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(id, 'મતદાન બંધ', () => closePollReal(id), 'poll-close')
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
          attemptRealWrite(`vote-${pollId}-${flatId}`, 'મત', () => insertPollVoteReal(pollId, flatId, optionIdx), 'poll-vote', { pollId, flatId })
        }
        return ok
      },

      addEvent: (e) => {
        const ev: SocietyEvent = { id: session.isRealSession ? realUid() : uid('evt'), societyId: activeSocietyId, contributions: [], volunteers: [], expenses: [], ...e }
        const ok = guardedSetDb(d => ({ ...d, events: [ev, ...d.events] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(ev.id, 'ઇવેન્ટ', () => insertEventReal(ev), 'event')
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
          attemptRealWrite(`contribution-${eventId}-${flatId}`, 'ફાળો', () => insertContributionReal(eventId, flatId, amount, date), 'event-contribution', { eventId, flatId })
        }
      },
      addVolunteer: (eventId, name) => {
        const ok = guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId && !ev.volunteers.includes(name) ? { ...ev, volunteers: [...ev.volunteers, name] } : ev) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(`volunteer-${eventId}-${name}`, 'વોલન્ટિયર', () => insertVolunteerReal(eventId, name), 'event-volunteer', { eventId, name })
        }
      },
      addEventExpense: (eventId, label, amount) => {
        const ok = guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, expenses: [...ev.expenses, { label, amount }] } : ev) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(`event-expense-${eventId}-${label}-${amount}`, 'ઇવેન્ટ ખર્ચ', () => insertEventExpenseReal(eventId, label, amount), 'event-expense', { eventId, label, amount: String(amount) })
        }
      },

      addVehicle: (v) => {
        const vehicle: Vehicle = { id: session.isRealSession ? realUid() : uid('veh'), societyId: activeSocietyId, ...v }
        const ok = guardedSetDb(d => ({ ...d, vehicles: [...d.vehicles, vehicle] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(vehicle.id, 'વાહન', () => insertVehicleReal(vehicle), 'vehicle')
        }
      },
      addFlat: (f) => {
        const newFlat: Flat = { id: session.isRealSession ? realUid() : uid('flat'), societyId: activeSocietyId, memberSince: new Date().getFullYear(), ...f }
        const ok = guardedSetDb(d => ({ ...d, flats: [...d.flats, newFlat] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(newFlat.id, 'ફ્લેટ', () => insertFlatReal(newFlat.id, activeSocietyId, newFlat), 'flat')
        }
      },
      updateFlat: (flatId, patch) => {
        const ok = guardedSetDb(d => ({ ...d, flats: d.flats.map(f => f.id === flatId ? { ...f, ...patch } : f) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(flatId, 'ફ્લેટ સુધારો', () => updateFlatReal(flatId, patch), 'flat-update')
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
          for (const f of fresh) attemptRealWrite(f.id, `ફ્લેટ ${f.number}`, () => insertFlatReal(f.id, activeSocietyId, f), 'flat')
        }
        return { added: fresh.length, skippedDuplicates }
      },
      addAdjustment: (a) => {
        const adj: Adjustment = { id: session.isRealSession ? realUid() : uid('adj'), societyId: activeSocietyId, ...a }
        const ok = guardedSetDb(d => ({ ...d, adjustments: [adj, ...d.adjustments] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(adj.id, 'એડજસ્ટમેન્ટ', () => insertAdjustmentReal(adj), 'adjustment')
        }
      },
      updateSociety: (patch) => {
        const ok = guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === activeSocietyId ? { ...s, ...patch } : s) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(activeSocietyId, 'સોસાયટી સેટિંગ્સ', () => updateSocietyReal(activeSocietyId, patch), 'society')
        }
      },

      addMembership: (m) => {
        const mem: Membership = { id: session.isRealSession ? realUid() : uid('mem'), createdAt: todayISO(), status: 'active', ...m }
        const ok = guardedSetDb(d => ({ ...d, memberships: [...d.memberships, mem] }))
        if (ok && session.isRealSession) {
          attemptRealWrite(mem.id, 'સભ્ય ઉમેરો', () => insertMembershipReal(mem), 'membership')
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
          attemptRealWrite(newSoc.id, 'નવી સોસાયટી', () => insertSocietyReal(newSoc), 'society')
        }
        return newSoc
      },
      activateSociety: (societyId) => {
        const trialStartedAt = new Date().toISOString()
        const ok = guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === societyId ? { ...s, trialStartedAt } : s) }))
        if (ok && session.isRealSession) {
          attemptRealWrite(societyId, 'સોસાયટી સક્રિય કરવી', () => updateSocietyStatusReal(societyId, { trialStartedAt }), 'society-status')
        }
      },
      updateSocietyById: (id, patch) => {
        setDb(d => ({ ...d, societies: d.societies.map(s => s.id === id ? { ...s, ...patch } : s) }))
        if (session.isRealSession) {
          // Split across the two real functions - this is the owner
          // console, the one legitimate place both regular fields (name,
          // address) and owner-only protected ones (plan, flatsLimit,
          // subscriptionStatus) can be set together in a single save.
          // Combined into one retryable operation since they represent
          // one save action from the person's point of view, not two.
          attemptRealWrite(id, 'સોસાયટી સેટિંગ્સ', async () => {
            await updateSocietyReal(id, patch)
            if (patch.plan !== undefined || patch.flatsLimit !== undefined || patch.subscriptionStatus !== undefined || patch.graceStartedAt !== undefined) {
              await updateSocietyStatusReal(id, { plan: patch.plan, flatsLimit: patch.flatsLimit, subscriptionStatus: patch.subscriptionStatus, graceStartedAt: patch.graceStartedAt })
            }
          }, 'society')
        }
      },

      addPlatformBillingRecord: (r) => {
        const rec = { id: session.isRealSession ? realUid() : uid('pb'), ...r }
        setDb(d => ({ ...d, platformBilling: [...d.platformBilling, rec] }))
        if (session.isRealSession) {
          attemptRealWrite(rec.id, 'પ્લેટફોર્મ બિલિંગ', () => insertPlatformBillingReal(rec), 'platform-billing')
        }
      },
      updatePlatformBillingRecord: (id, patch) => {
        setDb(d => ({ ...d, platformBilling: d.platformBilling.map(r => r.id === id ? { ...r, ...patch } : r) }))
        if (session.isRealSession) {
          attemptRealWrite(id, 'પ્લેટફોર્મ બિલિંગ સુધારો', () => updatePlatformBillingReal(id, patch), 'platform-billing-update')
        }
      },

      addLead: (l) =>
        setDb(d => ({ ...d, leads: [{ id: uid('lead'), status: 'new', createdAt: todayISO(), ...l }, ...d.leads] })),
      updateLeadStatus: (id, status, internalNote) => {
        setDb(d => ({ ...d, leads: d.leads.map(l => l.id === id ? { ...l, status, internalNote: internalNote ?? l.internalNote } : l) }))
        if (session.isRealSession) {
          attemptRealWrite(id, 'લીડ', () => updateLeadInSupabase(id, { status, internalNote }), 'lead')
        }
      },

      resetAll: () => {
        localStorage.removeItem(DB_KEY)
        setDb(DEMO_SEED_ENABLED ? buildSeed() : emptySeed())
      },
    }
  }, [db, session, activeSociety, activeSocietyId, financialsLoading, lastBlockedReason, lastRefreshSuccessAt, lastRefreshFailureAt, offline])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
