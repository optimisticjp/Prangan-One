/**
 * The demo's own, genuinely separate data provider. Deliberately does
 * not import realData.ts or lib/supabase.ts anywhere in this file - not
 * gated by a runtime flag, structurally impossible for this module to
 * reach Supabase, since it never references the modules that could.
 *
 * Storage is its own, dedicated namespace (see DEMO_STORAGE_KEY below),
 * completely separate from the real session's own storage key - a real
 * session's cached data can never bleed into a demo session on the same
 * browser, and vice versa, even by accident.
 *
 * Every write here is a plain, synchronous, local state update - no
 * attemptRealWrite, no retry queue, no pendingSync, none of the real-
 * write infrastructure imported at all, since none of it applies to
 * something that only ever lives in this browser's own memory.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type {
  Adjustment, Complaint, ComplaintStatus, DB, Doc, DocPermission, Expense, Flat,
  Membership, Notice, PayMode, Payment, Poll, PublicLead, Role, Session, Society, SocietyModules, Vehicle, Vendor,
} from './types'
import { todayISO } from './format'
import { Ctx, type NewSocietyInput, type Store } from './storeContext'
import { buildDemoSeed, DEMO_SCHEMA_VERSION, DEMO_SOCIETY_ID, demoId } from './demoSeed'
import {
  billStatus, flatAdjustmentNet,
  flatPending as sharedFlatPending, totalPending as sharedTotalPending,
  monthIncome as sharedMonthIncome, monthExpense as sharedMonthExpense,
  moduleEnabled as sharedModuleEnabled, adminCanToggle as sharedAdminCanToggle,
} from './storeHelpers'

const DEMO_STORAGE_KEY = 'prangan_demo_v1_db'
const DEMO_SESSION_KEY = 'prangan_demo_v1_session'

interface DemoSession {
  role: Role | null
  flatId: string | null
}

function freshDemoSession(): DemoSession {
  return { role: null, flatId: null }
}

// Called from Demo.tsx, before any provider exists yet to call through -
// picking a role is what decides whether a demo provider should exist at
// all, so this writes directly to the same storage key the provider
// itself reads from on mount, rather than going through useData().
export function startDemoSession(role: Role, flatId: string | undefined, targetRoute: string) {
  let resolvedRole = role
  if (flatId) {
    try {
      const raw = sessionStorage.getItem(DEMO_STORAGE_KEY)
      const seed: DB = raw ? JSON.parse(raw) : buildDemoSeed()
      const flat = seed.flats.find(f => f.id === flatId)
      resolvedRole = flat?.occupancy === 'tenant' ? 'resident_tenant' : 'resident_owner'
    } catch { /* fall through with the role as given */ }
  }
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ role: resolvedRole, flatId: flatId ?? null }))
  } catch { /* ignore */ }
  // A genuine full reload, not client-side navigation - the switcher
  // (see main.tsx) decides which provider to mount by reading storage at
  // the very start of a fresh load, so this is what makes that decision
  // actually take effect, rather than trying to live-swap two different
  // providers under one already-mounted React tree.
  window.location.href = targetRoute
}

export function isDemoSessionActive(): boolean {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return false
    return JSON.parse(raw).role !== null
  } catch {
    return false
  }
}

// sessionStorage, not localStorage, deliberately - the spec's own stated
// preference, and a real, additional safety property here specifically:
// a demo session clears itself the moment the tab closes, rather than
// sitting around indefinitely the way the real session's own storage
// does.
function loadDemoDb(): DB {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      // A real, working demo schema version check - stale demo state
      // (from a previous version of this seed, or a previous version of
      // this whole app) resets automatically rather than silently
      // persisting in a shape newer code doesn't expect.
      if (parsed.version === DEMO_SCHEMA_VERSION) return parsed
    }
  } catch { /* corrupted or unavailable - fall through to a fresh seed */ }
  return buildDemoSeed()
}

function loadDemoSession(): DemoSession {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (raw) return JSON.parse(raw) as DemoSession
  } catch { /* ignore */ }
  return freshDemoSession()
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(loadDemoDb)
  const [session, setSession] = useState<DemoSession>(loadDemoSession)
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null)

  const persist = (next: DB) => {
    setDb(next)
    try { sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next)) } catch { /* storage full or unavailable */ }
  }
  const persistSession = (next: DemoSession) => {
    setSession(next)
    try { sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const store = useMemo<Store>(() => {
    const society = db.societies[0]
    // Mirrors the real app's own RLS policies for a resident role
    // exactly - flats_select, bills_select, payments_select,
    // complaints_select, and adjustments_select in schema.sql - checked
    // directly against the actual policies, not guessed. A committee
    // member, accountant, or owner role sees everything, matching those
    // same policies' unconditional has_role branch. Vehicles, notices,
    // polls, events, and documents are deliberately not scoped here:
    // confirmed directly that the real policies make those genuinely
    // society-wide (vehicles_select, notices_select, polls_select,
    // events_select), and documents already has its own correct
    // permission-tier filter at the page level, with no equivalent of
    // ReceiptDetail.tsx's unscoped detail-page lookup to worry about.
    const isResident = session.role === 'resident_owner' || session.role === 'resident_tenant'
    const scopedDb: DB = !isResident ? db : {
      ...db,
      flats: db.flats.filter(f => f.id === session.flatId),
      bills: db.bills.filter(b => b.flatId === session.flatId),
      payments: db.payments.filter(p => p.flatId === session.flatId),
      complaints: db.complaints.filter(c => c.flatId === session.flatId || c.visibility === 'community'),
      adjustments: db.adjustments.filter(a => a.flatId === session.flatId),
    }
    const flatById = (id: string) => scopedDb.flats.find(f => f.id === id)

    // canWriteNow is always true in the demo - there's no subscription
    // status, no auditor-in-real-support-mode concern here, since none
    // of those real-world states apply to a fictional, session-only
    // society. lastBlockedReason and failedWrites both stay genuinely
    // empty for the same reason: nothing here is ever a real write that
    // could fail against a real network.
    const guardedSetDb = (updater: (d: DB) => DB): boolean => {
      persist(updater(db))
      setLastBlockedReason(null)
      return true
    }

    const fullSession: Session = {
      role: session.role, flatId: session.flatId, societyId: DEMO_SOCIETY_ID,
      explicitSociety: session.role !== null, actingAsOwner: false, isRealSession: false,
    }

    return {
      db: scopedDb, rawDb: db, session: fullSession, society,
      financialsLoading: false, fetchError: false, retryFetch: () => {},
      lastBlockedReason, failedWrites: [], retryFailedWrite: () => {}, dismissFailedWrite: () => {},
      canWriteNow: true,
      subscriptionBannerFor: () => null,
      setSubscriptionStatus: () => {},

      login: (role, flatId) => {
        if (flatId) {
          const flat = flatById(flatId)
          const derivedRole: Role = flat?.occupancy === 'tenant' ? 'resident_tenant' : 'resident_owner'
          persistSession({ role: role === 'resident_owner' || role === 'resident_tenant' ? derivedRole : role, flatId })
        } else {
          persistSession({ role, flatId: null })
        }
      },
      logout: () => persistSession(freshDemoSession()),
      enterSociety: () => { /* owner support mode has no meaning in the demo - the demo never exposes the owner console at all */ },
      exitImpersonation: () => {},
      findSocietyBySlug: () => undefined,
      setActiveSocietyContext: () => {},
      setOwnerWorkingSociety: () => {},
      findSocietyByJoinCode: () => undefined,
      selfEnrollResident: () => ({ ok: false, error: 'society_not_found' }),
      approveMembership: () => {},
      rejectMembership: () => {},
      logUnmatchedLoginAttempt: () => {},
      resolveRealSession: () => {},

      flatById, billStatus,
      flatPending: (flatId) => sharedFlatPending(scopedDb, flatId),
      totalPending: () => sharedTotalPending(scopedDb),
      monthIncome: (month) => sharedMonthIncome(scopedDb, month),
      monthExpense: (month) => sharedMonthExpense(scopedDb, month),
      moduleEnabled: (key) => sharedModuleEnabled(society, key),
      adminCanToggle: (key) => sharedAdminCanToggle(society, key),

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
        const existing = new Set(scopedDb.bills.filter(b => b.month === month).map(b => b.flatId))
        const newBills: DB['bills'][number][] = []
        const creditAdjustments: Adjustment[] = []
        for (const f of scopedDb.flats) {
          if (existing.has(f.id)) continue
          const amount = f.maintenanceOverride ?? society.maintenanceAmount
          const availableCredit = Math.max(0, -flatAdjustmentNet(scopedDb, f.id))
          const applied = Math.min(amount, availableCredit)
          newBills.push({ id: demoId('bill'), societyId: DEMO_SOCIETY_ID, flatId: f.id, month, amount, paidAmount: applied, dueDate: `${month}-${String(society.dueDay).padStart(2, '0')}` })
          if (applied > 0) {
            creditAdjustments.push({ id: demoId('adj'), societyId: DEMO_SOCIETY_ID, flatId: f.id, date: todayISO(), amount: applied, type: 'debit', reason: `${month} બિલ સામે વપરાયેલ ક્રેડિટ` })
          }
        }
        guardedSetDb(d => ({ ...d, bills: [...newBills, ...d.bills], adjustments: [...creditAdjustments, ...d.adjustments] }))
        return newBills.length
      },

      recordPayment: ({ flatId, billId, amount, mode, refNo, note, failed, date, pending }) => {
        const year = (date ?? todayISO()).slice(0, 4)
        const status: Payment['status'] = failed ? 'failed' : pending ? 'pending_confirmation' : 'success'
        const receiptNo = status === 'success' ? `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}` : undefined
        const pay: Payment = { id: demoId('payment'), societyId: DEMO_SOCIETY_ID, flatId, billId, date: date ?? todayISO(), amount, mode, refNo, status, receiptNo, note }
        const targetBill = billId ? scopedDb.bills.find(b => b.id === billId) : undefined
        const overpayAmount = status === 'success' && targetBill ? Math.max(0, amount - Math.max(0, targetBill.amount - targetBill.paidAmount)) : 0
        const overpayAdj: Adjustment | null = overpayAmount > 0
          ? { id: demoId('adjustment'), societyId: DEMO_SOCIETY_ID, flatId, date: date ?? todayISO(), amount: overpayAmount, type: 'credit', reason: `વધારે ચૂકવણી, ${receiptNo ?? 'રસીદ'} માંથી ક્રેડિટ તરીકે રાખેલ` }
          : null
        guardedSetDb(d => {
          const bills = status === 'success' && billId
            ? d.bills.map(b => b.id === billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + amount) } : b)
            : d.bills
          const societies = status === 'success' ? d.societies.map(s => s.id === DEMO_SOCIETY_ID ? { ...s, receiptSeq: s.receiptSeq + 1 } : s) : d.societies
          return { ...d, bills, societies, payments: [pay, ...d.payments], adjustments: overpayAdj ? [overpayAdj, ...d.adjustments] : d.adjustments }
        })
        return pay
      },
      confirmPendingPayment: (paymentId) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p || p.status !== 'pending_confirmation') return
        const year = p.date.slice(0, 4)
        const receiptNo = `${society.receiptPrefix}-${year}-${String(society.receiptSeq).padStart(4, '0')}`
        guardedSetDb(d => {
          const bills = p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.min(b.amount, b.paidAmount + p.amount) } : b) : d.bills
          return {
            ...d, bills,
            payments: d.payments.map(x => x.id === paymentId ? { ...x, status: 'success' as const, receiptNo } : x),
            societies: d.societies.map(s => s.id === DEMO_SOCIETY_ID ? { ...s, receiptSeq: s.receiptSeq + 1 } : s),
          }
        })
      },
      cancelReceipt: (paymentId, reason) => {
        const p = scopedDb.payments.find(x => x.id === paymentId)
        if (!p) return
        guardedSetDb(d => ({
          ...d,
          bills: p.billId ? d.bills.map(b => b.id === p.billId ? { ...b, paidAmount: Math.max(0, b.paidAmount - p.amount) } : b) : d.bills,
          payments: d.payments.map(x => x.id === paymentId ? { ...x, cancelled: true, cancelReason: reason } : x),
          auditLogs: [{ id: demoId('audit'), societyId: DEMO_SOCIETY_ID, at: new Date().toISOString(), actor: society.name, action: 'receipt_cancelled', detail: `રસીદ ${p.receiptNo ?? p.id} રદ: ${reason}` }, ...d.auditLogs],
        }))
      },

      addComplaint: ({ flatId, category, title, detail, priority, photoName, visibility }) => {
        const flat = flatById(flatId)
        const c: Complaint = {
          id: demoId('complaint'), societyId: DEMO_SOCIETY_ID, flatId, category, title, detail, priority,
          status: 'new', createdAt: todayISO(), internalNotes: [],
          hasPhoto: !!photoName, photoName, visibility: visibility ?? 'personal',
          timeline: [{ date: todayISO(), status: 'new', by: flat?.ownerName ?? 'સભ્ય' }],
        }
        guardedSetDb(d => ({ ...d, complaints: [c, ...d.complaints] }))
        return c
      },
      advanceComplaint: (id, status, note, by, assignedTo) => {
        guardedSetDb(d => ({
          ...d,
          complaints: d.complaints.map(c => c.id === id ? {
            ...c, status, assignedTo: assignedTo ?? c.assignedTo,
            timeline: [...c.timeline, { date: todayISO(), status, note: note || undefined, by }],
          } : c),
        }))
      },
      addInternalNote: (id, note) => {
        guardedSetDb(d => ({
          ...d,
          complaints: d.complaints.map(c => c.id === id ? { ...c, internalNotes: [...c.internalNotes, note] } : c),
        }))
      },
      addFeedback: (id, rating, comment) => {
        guardedSetDb(d => ({ ...d, complaints: d.complaints.map(c => c.id === id ? { ...c, feedback: { rating, comment } } : c) }))
      },
      getComplaintPhotoUrl: async () => { setLastBlockedReason('આ ડેમોમાં ફોટો અપલોડ ખરેખર સચવાયો નથી - સિમ્યુલેટ કરેલ છે.'); return null },
      getPaymentProofUrl: async () => { setLastBlockedReason('આ ડેમોમાં ચુકવણીનો પુરાવો ખરેખર સચવાયો નથી - સિમ્યુલેટ કરેલ છે.'); return null },
      uploadSocietyLogoAndSave: async () => { setLastBlockedReason('આ ડેમોમાં લોગો અપલોડ ખરેખર સચવાયો નથી - સિમ્યુલેટ કરેલ છે.'); return null },

      addNotice: (n) => {
        const notice: Notice = { id: demoId('notice'), societyId: DEMO_SOCIETY_ID, date: todayISO(), ...n }
        guardedSetDb(d => ({ ...d, notices: [notice, ...d.notices] }))
      },
      togglePin: (id) => {
        guardedSetDb(d => ({ ...d, notices: d.notices.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) }))
      },

      addExpense: (e) => {
        const expense: Expense = { id: demoId('expense'), societyId: DEMO_SOCIETY_ID, ...e }
        guardedSetDb(d => ({ ...d, expenses: [expense, ...d.expenses] }))
      },
      addVendor: (v) => {
        const vendor: Vendor = { id: demoId('vendor'), societyId: DEMO_SOCIETY_ID, ...v }
        guardedSetDb(d => ({ ...d, vendors: [...d.vendors, vendor] }))
      },
      updateVendor: (id, patch) => {
        guardedSetDb(d => ({ ...d, vendors: d.vendors.map(v => v.id === id ? { ...v, ...patch } : v) }))
      },
      addDocumentMeta: (doc) => {
        const { file: _file, ...meta } = doc
        const d: Doc = { id: demoId('document'), societyId: DEMO_SOCIETY_ID, date: todayISO(), ...meta }
        guardedSetDb(d2 => ({ ...d2, documents: [d, ...d2.documents] }))
      },
      getDocumentUrl: async () => { setLastBlockedReason('આ ડેમોમાં ડોક્યુમેન્ટ ખરેખર સચવાયેલ નથી - સિમ્યુલેટ કરેલ છે.'); return null },

      addPoll: (p) => {
        const poll: Poll = { id: demoId('poll'), societyId: DEMO_SOCIETY_ID, votes: {}, status: 'open', ...p }
        guardedSetDb(d => ({ ...d, polls: [poll, ...d.polls] }))
      },
      closePoll: (id) => {
        guardedSetDb(d => ({ ...d, polls: d.polls.map(p => p.id === id ? { ...p, status: 'closed', resultVisible: true } : p) }))
      },
      vote: (pollId, flatId, optionIdx) => {
        const poll = scopedDb.polls.find(p => p.id === pollId)
        if (!poll || poll.status !== 'open') return false
        if (poll.votes[flatId] !== undefined) return false
        guardedSetDb(d => ({ ...d, polls: d.polls.map(p => p.id === pollId ? { ...p, votes: { ...p.votes, [flatId]: optionIdx } } : p) }))
        return true
      },

      addEvent: (e) => {
        guardedSetDb(d => ({ ...d, events: [{ id: demoId('event'), societyId: DEMO_SOCIETY_ID, contributions: [], volunteers: [], expenses: [], ...e }, ...d.events] }))
      },
      addContribution: (eventId, flatId, amount) => {
        guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, contributions: [...ev.contributions, { flatId, amount, date: todayISO() }] } : ev) }))
      },
      addVolunteer: (eventId, name) => {
        guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, volunteers: [...ev.volunteers, name] } : ev) }))
      },
      addEventExpense: (eventId, label, amount) => {
        guardedSetDb(d => ({ ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, expenses: [...ev.expenses, { label, amount }] } : ev) }))
      },

      addVehicle: (v) => {
        guardedSetDb(d => ({ ...d, vehicles: [{ id: demoId('vehicle'), societyId: DEMO_SOCIETY_ID, ...v }, ...d.vehicles] }))
      },
      addFlat: (f) => {
        guardedSetDb(d => ({ ...d, flats: [...d.flats, { id: demoId('flat'), societyId: DEMO_SOCIETY_ID, memberSince: new Date().getFullYear(), ...f }] }))
      },
      updateFlat: (flatId, patch) => {
        guardedSetDb(d => ({ ...d, flats: d.flats.map(f => f.id === flatId ? { ...f, ...patch } : f) }))
      },
      addFlatsBulk: (rows) => {
        const existingNumbers = new Set(scopedDb.flats.map(f => f.number))
        const toAdd = rows.filter(r => !existingNumbers.has(r.number))
        guardedSetDb(d => ({ ...d, flats: [...d.flats, ...toAdd.map(r => ({ id: demoId('flat'), societyId: DEMO_SOCIETY_ID, memberSince: new Date().getFullYear(), ...r }))] }))
        return { added: toAdd.length, skippedDuplicates: rows.filter(r => existingNumbers.has(r.number)).map(r => r.number) }
      },
      addAdjustment: (a) => {
        guardedSetDb(d => ({ ...d, adjustments: [{ id: demoId('adjustment'), societyId: DEMO_SOCIETY_ID, ...a }, ...d.adjustments] }))
      },
      updateSociety: (patch) => {
        guardedSetDb(d => ({ ...d, societies: d.societies.map(s => s.id === DEMO_SOCIETY_ID ? { ...s, ...patch } : s) }))
      },

      addMembership: (m) => {
        const membership: Membership = { id: demoId('membership'), status: 'active', ...m } as Membership
        guardedSetDb(d => ({ ...d, memberships: [...d.memberships, membership] }))
        return membership
      },

      // Owner-console-only actions - genuinely unreachable in the demo,
      // since the demo never offers the owner role or exposes /owner/*
      // at all (see Demo.tsx). No-ops, not wired to do anything real,
      // matching the spec's own explicit instruction not to expose the
      // owner console in the public sales demo.
      addSociety: (_s: NewSocietyInput) => society,
      activateSociety: () => {},
      updateSocietyById: () => {},
      addPlatformBillingRecord: () => {},
      updatePlatformBillingRecord: () => {},
      addLead: (_l: Omit<PublicLead, 'id' | 'status' | 'createdAt'>) => {},
      updateLeadStatus: () => {},

      resetAll: () => {
        try { sessionStorage.removeItem(DEMO_STORAGE_KEY) } catch { /* ignore */ }
        try { sessionStorage.removeItem(DEMO_SESSION_KEY) } catch { /* ignore */ }
        setDb(buildDemoSeed())
        setSession(freshDemoSession())
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, session, lastBlockedReason])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
