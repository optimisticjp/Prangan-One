/**
 * The shared contract every page depends on (useData()) and the React
 * context both data providers - the real, Supabase-backed one in
 * store.tsx and the demo one in demoStore.tsx - implement identically.
 *
 * This file is deliberately neutral: it imports nothing from either
 * provider, and neither provider needs to import from the other to get
 * at this. That's what makes the separation between them structural
 * rather than a convention someone could accidentally break - the demo
 * provider genuinely cannot reach realData.ts or lib/supabase.ts through
 * this file, because this file itself never references them.
 */
import { createContext, useContext } from 'react'
import type {
  Adjustment, AuditLogEntry, Bill, Complaint, ComplaintStatus, DB, Doc, DocPermission, Expense,
  Flat, ImpersonationLog, Membership, ModuleLayer, Notice, PayMode, Payment, PendingSyncEntry, Poll, PublicLead,
  Role, Session, Society, SocietyEvent, SocietyModules, SubscriptionStatus, TenantAccessMode, Vehicle, Vendor,
} from './types'

export interface NewSocietyInput {
  name: string; nameEn: string; address: string; city: string; area: string
  maintenanceAmount: number; dueDay: number; receiptPrefix: string
  themeKey: string; logoDataUrl?: string; supportPhone?: string
  modules: ModuleLayer; tenantAccess: TenantAccessMode
}

export
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
  /** True when the initial real-session data fetch most recently failed -
   * the actual fix for a real, previously silent gap: before this,
   * nothing told anyone the fetch had failed at all, they'd just see
   * whatever was already there. retryFetch forces the fetch effect to
   * run again. */
  fetchError: boolean
  retryFetch: () => void
  /** Why the most recent write attempt was blocked, if it was - null
   * means either nothing's been blocked yet, or the last attempt
   * succeeded. Set by guardedSetDb; check this after a mutation returns
   * false/null to show the person something real instead of nothing
   * happening. */
  lastBlockedReason: string | null
  /**
   * A real write that was permitted locally (unlike lastBlockedReason,
   * which is about permission) but failed when actually reaching the
   * database - previously this class of failure was invisible, the
   * screen would show the change as if it had saved and nothing further
   * would happen. Every real write now goes through attemptRealWrite
   * internally (see its own comment), which populates this list on
   * failure and clears the corresponding entry on success, including a
   * successful retry. Keyed by the item's own id, in insertion order, so
   * the UI can render one entry per failed thing rather than a single
   * generic "something went wrong" message.
   */
  failedWrites: { id: string; label: string }[]
  /** Re-attempts the exact same write that failed - not a generic refetch, the original operation itself, with its original data. */
  retryFailedWrite: (id: string) => void
  /** Removes a failed-write entry without retrying - for someone who's decided to just redo the action manually instead, or doesn't want the notice sitting there anymore. */
  dismissFailedWrite: (id: string) => void
  /* subscription / write guard */
  canWriteNow: boolean
  subscriptionBannerFor: (audience: 'admin' | 'resident') => string | null
  setSubscriptionStatus: (societyId: string, status: SubscriptionStatus) => void
  /* session */
  login: (role: Role, flatId?: string) => void
  logout: () => void
  /**
   * Enters read-only support mode for a real society - this is the only
   * kind of support access that exists now. A previous "write-capable"
   * variant existed here, letting the owner make real changes on a
   * society's behalf; removed entirely, not just hidden, per an explicit
   * decision that full impersonation and write permissions are not
   * something this product does, no matter how it's framed or logged.
   * isRealSession is genuinely true during this - the actual fix for the
   * gap that made this whole thing worth revisiting: the owner now sees
   * this society's real, live data, not a local, disconnected view while
   * appearing to show something real. Write safety doesn't depend on
   * isRealSession being false anymore; it depends on canWriteNow (see
   * guardedSetDb below), which already, independently, blocks every
   * gated write the moment actingAsOwner && supportMode === 'readonly' -
   * confirmed this covers every real write in the app before relying on
   * it here, not assumed.
   */
  enterSociety: (societyId: string, role: Role, reason?: string) => void
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
  /**
   * Points a real owner's own session at a specific society, without
   * touching role or isRealSession - unlike enterSociety, which is for
   * temporarily impersonating a different role for support purposes and
   * deliberately switches to the local data layer while doing that. This
   * is for the owner's own onboarding wizard: the owner is still the
   * owner, their session is still exactly as real as it was, only which
   * society their own real writes are scoped to changes. Using
   * enterSociety here instead was the actual root cause of a real bug -
   * every onboarding step past society creation silently wrote to the
   * local layer only, since enterSociety's whole purpose is flipping
   * isRealSession off.
   */
  setOwnerWorkingSociety: (societyId: string) => void
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

export const Ctx = createContext<Store | null>(null)

export function useData(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData must be used inside <DataProvider> or <DemoDataProvider>')
  return ctx
}
