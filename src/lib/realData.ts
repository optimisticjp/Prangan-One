import { supabase } from './supabase'
import type { Adjustment, AuditLogEntry, Bill, Complaint, Contact, Doc, Flat, ImpersonationLog, Membership, Notice, Payment, PlatformBillingRecord, Poll, Society, SocietyEvent, TimelineEntry, Vehicle, Vendor } from './types'

/**
 * The real, Supabase-backed data layer for the core financial loop:
 * flats, bills, payments, adjustments. This is the first slice of the
 * broader "stop being localStorage-only" work - complaints, notices,
 * documents, polls, events, vendors, parking, and contacts all still run
 * on the local demo layer only, that's real future work, not done here.
 *
 * Every function here mirrors a function already in store.tsx exactly -
 * DataProvider calls these when Supabase is configured and the resolved
 * session is real (not the demo), and keeps using the local store
 * otherwise. RLS is the actual security boundary regardless of what a
 * query asks for; these functions are the plumbing to call, they don't
 * decide what's visible or writable, see supabase/schema.sql for the
 * policies that actually do.
 */

// ---------------------------------------------------------------------
// Row <-> app-type mapping. One direction each, kept boring on purpose -
// this is the kind of code that should be obvious at a glance, not clever.
// ---------------------------------------------------------------------

interface FlatRow {
  id: string; society_id: string; number: string; floor: number
  owner_name: string; phone: string; email: string | null; occupancy: 'owner' | 'tenant'
  tenant_name: string | null; tenant_email: string | null; sqft: number; member_since: number
  maintenance_override: number | null
}
const flatFromRow = (r: FlatRow): Flat => ({
  id: r.id, societyId: r.society_id, number: r.number, floor: r.floor,
  ownerName: r.owner_name, phone: r.phone, email: r.email ?? undefined, occupancy: r.occupancy,
  tenantName: r.tenant_name ?? undefined, tenantEmail: r.tenant_email ?? undefined,
  sqft: r.sqft, memberSince: r.member_since, maintenanceOverride: r.maintenance_override ?? undefined,
})

interface BillRow {
  id: string; society_id: string; flat_id: string; month: string
  amount: number; paid_amount: number; due_date: string; note: string | null
}
const billFromRow = (r: BillRow): Bill => ({
  id: r.id, societyId: r.society_id, flatId: r.flat_id, month: r.month,
  amount: r.amount, paidAmount: r.paid_amount, dueDate: r.due_date, note: r.note ?? undefined,
})

interface PaymentRow {
  id: string; society_id: string; flat_id: string; bill_id: string | null
  date: string; amount: number; mode: Payment['mode']; ref_no: string | null
  receipt_no: string | null; status: Payment['status']; note: string | null
  cancelled: boolean; cancel_reason: string | null; proof_path: string | null
}
const paymentFromRow = (r: PaymentRow): Payment => ({
  id: r.id, societyId: r.society_id, flatId: r.flat_id, billId: r.bill_id ?? undefined,
  date: r.date, amount: r.amount, mode: r.mode, refNo: r.ref_no ?? undefined,
  receiptNo: r.receipt_no ?? undefined, status: r.status, note: r.note ?? undefined,
  cancelled: r.cancelled, cancelReason: r.cancel_reason ?? undefined, proofPath: r.proof_path ?? undefined,
})

interface AdjustmentRow {
  id: string; society_id: string; date: string; flat_id: string | null
  amount: number; type: Adjustment['type']; reason: string
}
const adjustmentFromRow = (r: AdjustmentRow): Adjustment => ({
  id: r.id, societyId: r.society_id, date: r.date, flatId: r.flat_id ?? undefined,
  amount: r.amount, type: r.type, reason: r.reason,
})

// ---------------------------------------------------------------------
// Fetch - one call per table, done once when a real society context
// resolves (see DataProvider in store.tsx). RLS decides what actually
// comes back: a resident's fetch of "all bills" only returns their own
// flat's rows, a committee member's returns the whole society's.
// ---------------------------------------------------------------------

export async function fetchSocietyFinancials(societyId: string): Promise<{ flats: Flat[]; bills: Bill[]; payments: Payment[]; adjustments: Adjustment[] }> {
  if (!supabase) return { flats: [], bills: [], payments: [], adjustments: [] }

  const [flatsRes, billsRes, paymentsRes, adjustmentsRes] = await Promise.all([
    supabase.from('flats').select('id, society_id, number, floor, owner_name, phone, email, occupancy, tenant_name, tenant_email, sqft, member_since, maintenance_override').eq('society_id', societyId),
    supabase.from('bills').select('id, society_id, flat_id, month, amount, paid_amount, due_date, note').eq('society_id', societyId),
    supabase.from('payments').select('id, society_id, flat_id, bill_id, date, amount, mode, ref_no, receipt_no, status, note, cancelled, cancel_reason, proof_path').eq('society_id', societyId),
    supabase.from('adjustments').select('id, society_id, date, flat_id, amount, type, reason').eq('society_id', societyId),
  ])

  if (flatsRes.error) throw flatsRes.error
  if (billsRes.error) throw billsRes.error
  if (paymentsRes.error) throw paymentsRes.error
  if (adjustmentsRes.error) throw adjustmentsRes.error

  return {
    flats: (flatsRes.data ?? []).map(flatFromRow),
    bills: (billsRes.data ?? []).map(billFromRow),
    payments: (paymentsRes.data ?? []).map(paymentFromRow),
    adjustments: (adjustmentsRes.data ?? []).map(adjustmentFromRow),
  }
}

// ---------------------------------------------------------------------
// Mutations - each mirrors the matching function in store.tsx exactly.
// ---------------------------------------------------------------------

export async function insertFlatReal(id: string, societyId: string, f: Omit<Flat, 'id' | 'societyId'>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('flats').insert({
    id, society_id: societyId, number: f.number, floor: f.floor, owner_name: f.ownerName, phone: f.phone,
    email: f.email ?? null, occupancy: f.occupancy, tenant_name: f.tenantName ?? null, tenant_email: f.tenantEmail ?? null,
    sqft: f.sqft, member_since: f.memberSince, maintenance_override: f.maintenanceOverride ?? null,
  })
  if (error) throw error
}

export async function updateFlatReal(flatId: string, patch: Partial<Flat>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.number !== undefined) row.number = patch.number
  if (patch.floor !== undefined) row.floor = patch.floor
  if (patch.ownerName !== undefined) row.owner_name = patch.ownerName
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.email !== undefined) row.email = patch.email ?? null
  if (patch.occupancy !== undefined) row.occupancy = patch.occupancy
  if (patch.tenantName !== undefined) row.tenant_name = patch.tenantName ?? null
  if (patch.tenantEmail !== undefined) row.tenant_email = patch.tenantEmail ?? null
  if (patch.sqft !== undefined) row.sqft = patch.sqft
  if (patch.maintenanceOverride !== undefined) row.maintenance_override = patch.maintenanceOverride ?? null
  const { error } = await supabase.from('flats').update(row).eq('id', flatId)
  if (error) throw error
}

export async function insertBillsReal(bills: Bill[]): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  if (bills.length === 0) return
  const { error } = await supabase.from('bills').insert(
    bills.map(b => ({ id: b.id, society_id: b.societyId, flat_id: b.flatId, month: b.month, amount: b.amount, paid_amount: b.paidAmount, due_date: b.dueDate, note: b.note ?? null })),
  )
  if (error) throw error
}

export async function insertPaymentReal(p: Payment): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('payments').insert({
    id: p.id, society_id: p.societyId, flat_id: p.flatId, bill_id: p.billId ?? null, date: p.date, amount: p.amount,
    mode: p.mode, ref_no: p.refNo ?? null, receipt_no: p.receiptNo ?? null, status: p.status, note: p.note ?? null,
  })
  if (error) throw error
}

/** Records a payment and updates the bill's paid_amount together, mirroring recordPayment in store.tsx. */
export async function recordPaymentReal(p: Payment, currentBillPaidAmount: number, billAmount: number): Promise<void> {
  await insertPaymentReal(p)
  if (p.status === 'success' && p.billId) {
    await updateBillPaidAmountReal(p.billId, Math.min(billAmount, currentBillPaidAmount + p.amount))
  }
}

export async function updateBillPaidAmountReal(billId: string, paidAmount: number): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('bills').update({ paid_amount: paidAmount }).eq('id', billId)
  if (error) throw error
}

export async function updatePaymentReal(paymentId: string, patch: { status?: Payment['status']; receiptNo?: string; cancelled?: boolean; cancelReason?: string; proofPath?: string }): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.status !== undefined) row.status = patch.status
  if (patch.receiptNo !== undefined) row.receipt_no = patch.receiptNo
  if (patch.cancelled !== undefined) row.cancelled = patch.cancelled
  if (patch.cancelReason !== undefined) row.cancel_reason = patch.cancelReason
  if (patch.proofPath !== undefined) row.proof_path = patch.proofPath
  const { error } = await supabase.from('payments').update(row).eq('id', paymentId)
  if (error) throw error
}

export async function insertAdjustmentReal(a: Adjustment): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('adjustments').insert({
    id: a.id, society_id: a.societyId, date: a.date, flat_id: a.flatId ?? null, amount: a.amount, type: a.type, reason: a.reason,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------
// Complaints and notices - the second slice of the real data layer,
// following the flats/bills/payments/adjustments work. complaint_timeline
// is a separate real table (complaints.timeline is an embedded array in
// the local demo layer only), so fetching a complaint means fetching
// both and joining them client-side; the reverse for inserts.
// ---------------------------------------------------------------------

interface ComplaintRow {
  id: string; society_id: string; flat_id: string; category: string; title: string; detail: string
  priority: Complaint['priority']; status: Complaint['status']; assigned_to: string | null
  has_photo: boolean; photo_path: string | null; internal_notes: string[]; feedback: { rating: number; comment: string } | null
  visibility: Complaint['visibility']; created_at: string
}
interface TimelineRow { id: string; complaint_id: string; status: TimelineEntry['status']; note: string | null; by_name: string; created_at: string }

export async function fetchSocietyComplaints(societyId: string): Promise<Complaint[]> {
  if (!supabase) return []
  const [complaintsRes, timelineRes] = await Promise.all([
    supabase.from('complaints').select('id, society_id, flat_id, category, title, detail, priority, status, assigned_to, has_photo, photo_path, internal_notes, feedback, visibility, created_at').eq('society_id', societyId),
    // complaint_timeline has no society_id of its own - filtered by RLS
    // itself (see complaint_timeline_select), a plain select() here
    // already only returns rows for complaints this caller can see.
    supabase.from('complaint_timeline').select('id, complaint_id, status, note, by_name, created_at'),
  ])
  if (complaintsRes.error) throw complaintsRes.error
  if (timelineRes.error) throw timelineRes.error

  const timelineByComplaint = new Map<string, TimelineEntry[]>()
  for (const t of (timelineRes.data ?? []) as TimelineRow[]) {
    const entry: TimelineEntry = { date: t.created_at, status: t.status, note: t.note ?? undefined, by: t.by_name }
    const list = timelineByComplaint.get(t.complaint_id) ?? []
    list.push(entry)
    timelineByComplaint.set(t.complaint_id, list)
  }

  return ((complaintsRes.data ?? []) as ComplaintRow[]).map(c => ({
    id: c.id, societyId: c.society_id, flatId: c.flat_id, category: c.category, title: c.title, detail: c.detail,
    priority: c.priority, status: c.status, assignedTo: c.assigned_to ?? undefined, hasPhoto: c.has_photo, photoPath: c.photo_path ?? undefined,
    internalNotes: c.internal_notes ?? [], feedback: c.feedback ?? undefined, visibility: c.visibility,
    createdAt: c.created_at, timeline: (timelineByComplaint.get(c.id) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
  }))
}

/** Inserts a complaint and its initial 'new' timeline entry together - mirrors addComplaint in store.tsx. */
export async function insertComplaintReal(c: Complaint): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('complaints').insert({
    id: c.id, society_id: c.societyId, flat_id: c.flatId, category: c.category, title: c.title, detail: c.detail,
    priority: c.priority, status: c.status, has_photo: c.hasPhoto ?? false, photo_path: c.photoPath ?? null, visibility: c.visibility,
  })
  if (error) throw error
  const first = c.timeline[0]
  if (first) {
    const { error: timelineError } = await supabase.from('complaint_timeline').insert({
      complaint_id: c.id, status: first.status, note: first.note ?? null, by_name: first.by,
    })
    if (timelineError) throw timelineError
  }
}

/** Advances a complaint's status and adds the matching timeline entry - mirrors advanceComplaint in store.tsx. Requires society_admin/committee_member on the real database. */
export async function advanceComplaintReal(complaintId: string, status: Complaint['status'], note: string, byName: string, assignedTo?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = { status }
  if (assignedTo !== undefined) row.assigned_to = assignedTo
  const { error } = await supabase.from('complaints').update(row).eq('id', complaintId)
  if (error) throw error
  const { error: timelineError } = await supabase.from('complaint_timeline').insert({
    complaint_id: complaintId, status, note: note || null, by_name: byName,
  })
  if (timelineError) throw timelineError
}

export async function updateComplaintNotesReal(complaintId: string, internalNotes: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('complaints').update({ internal_notes: internalNotes }).eq('id', complaintId)
  if (error) throw error
}

export async function updateComplaintFeedbackReal(complaintId: string, feedback: { rating: number; comment: string }): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('complaints').update({ feedback }).eq('id', complaintId)
  if (error) throw error
}

/** Called after uploadPrivateFile succeeds - the complaint row has to exist first (see the storage RLS block in schema.sql), so the photo path gets attached in a second step, not as part of the original insert. */
export async function updateComplaintPhotoPathReal(complaintId: string, photoPath: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('complaints').update({ has_photo: true, photo_path: photoPath }).eq('id', complaintId)
  if (error) throw error
}

interface NoticeRow { id: string; society_id: string; title: string; body: string; date: string; category: string; pinned: boolean }

export async function fetchSocietyNotices(societyId: string): Promise<Notice[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('notices').select('id, society_id, title, body, date, category, pinned').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as NoticeRow[]).map(n => ({ id: n.id, societyId: n.society_id, title: n.title, body: n.body, date: n.date, category: n.category, pinned: n.pinned }))
}

export async function insertNoticeReal(n: Notice): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('notices').insert({
    id: n.id, society_id: n.societyId, title: n.title, body: n.body, date: n.date, category: n.category, pinned: n.pinned,
  })
  if (error) throw error
}

export async function updateNoticePinnedReal(noticeId: string, pinned: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('notices').update({ pinned }).eq('id', noticeId)
  if (error) throw error
}

// ---------------------------------------------------------------------
// File storage - society logos (public), complaint photos and payment
// proof (both private, signed-URL only). See the "Storage buckets" block
// at the end of schema.sql for the matching RLS - the path convention
// there and here has to agree exactly: the object's path always starts
// with the id of the row it belongs to, e.g. '{complaintId}/photo.jpg',
// which is how the database policy knows who's allowed to see or write
// it, without a separate ownership column on storage.objects itself.
// ---------------------------------------------------------------------

/** Uploads to the public society-logos bucket and returns a permanent, directly-usable URL. */
export async function uploadSocietyLogo(societyId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${societyId}/logo.${ext}`
  const { error } = await supabase.storage.from('society-logos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('society-logos').getPublicUrl(path)
  return data.publicUrl
}

/** Uploads to a private bucket - complaint-photos or payment-proof. ownerId is the complaint's or payment's own id, already known before this is called (see realUid() in id.ts), which is also the RLS check's join key. Returns the storage path, not a URL - a private file has no public URL, only a signed one, generated separately and only when actually needed for display (getSignedFileUrl below). */
export async function uploadPrivateFile(bucket: 'complaint-photos' | 'payment-proof' | 'documents', ownerId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${ownerId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return path
}

/** A temporary, authenticated URL for a private file - regenerated each time it's actually displayed, not stored anywhere, since a signed URL expires (1 hour here) and a stale stored one would just be a broken image link later. */
export async function getSignedFileUrl(bucket: 'complaint-photos' | 'payment-proof' | 'documents', path: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

// ---------------------------------------------------------------------
// Societies - previously the one thing that stayed local-only even for
// a real, logged-in session. This mattered more than it might look:
// db.societies only ever held the demo seed data, so a real resident or
// admin's activeSociety lookup (find by session.societyId) never matched
// anything real and silently fell back to the first demo society -
// meaning every real login showed the wrong society's name, logo,
// maintenance defaults, due day, and module settings, even though their
// own flats/bills/complaints were already correctly real. Fixing this is
// a correctness fix as much as it is "the next table."
// ---------------------------------------------------------------------

interface SocietyRow {
  id: string; name: string; name_en: string; slug: string; join_code: string; address: string
  city: string; area: string; maintenance_amount: number; due_day: number; upi_id: string
  plan: string; flats_limit: number; receipt_prefix: string; theme_key: string; logo_url: string | null
  support_phone: string | null; owner_enabled_modules: Society['modules']['ownerEnabled']; admin_visible_modules: Society['modules']['adminVisible']
  tenant_access: Society['tenantAccess']; subscription_status: Society['subscriptionStatus']
  grace_started_at: string | null; trial_started_at: string | null; receipt_seq: number; created_at: string
}
const societyFromRow = (r: SocietyRow): Society => ({
  id: r.id, name: r.name, nameEn: r.name_en, slug: r.slug, joinCode: r.join_code, address: r.address,
  city: r.city, area: r.area, maintenanceAmount: r.maintenance_amount, dueDay: r.due_day, upiId: r.upi_id,
  plan: r.plan, flatsLimit: r.flats_limit, receiptPrefix: r.receipt_prefix, themeKey: r.theme_key, logoUrl: r.logo_url ?? undefined,
  supportPhone: r.support_phone ?? undefined, modules: { ownerEnabled: r.owner_enabled_modules, adminVisible: r.admin_visible_modules },
  tenantAccess: r.tenant_access, subscriptionStatus: r.subscription_status, graceStartedAt: r.grace_started_at ?? undefined,
  trialStartedAt: r.trial_started_at ?? undefined, receiptSeq: r.receipt_seq, createdAt: r.created_at,
})
const SOCIETY_COLUMNS = 'id, name, name_en, slug, join_code, address, city, area, maintenance_amount, due_day, upi_id, plan, flats_limit, receipt_prefix, theme_key, logo_url, support_phone, owner_enabled_modules, admin_visible_modules, tenant_access, subscription_status, grace_started_at, trial_started_at, receipt_seq, created_at'

/** For a resident, admin, or accountant's real session - just their own society. */
export async function fetchSociety(societyId: string): Promise<Society | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('societies').select(SOCIETY_COLUMNS).eq('id', societyId).maybeSingle()
  if (error) throw error
  return data ? societyFromRow(data as SocietyRow) : null
}

/** For the owner console - every society the owner can see, which RLS already limits to every society for a real owner (see societies_select), nothing for anyone else. */
export async function fetchAllSocieties(): Promise<Society[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('societies').select(SOCIETY_COLUMNS)
  if (error) throw error
  return ((data ?? []) as SocietyRow[]).map(societyFromRow)
}

export async function insertSocietyReal(s: Society): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('societies').insert({
    id: s.id, name: s.name, name_en: s.nameEn, slug: s.slug, join_code: s.joinCode, address: s.address,
    city: s.city, area: s.area, maintenance_amount: s.maintenanceAmount, due_day: s.dueDay, upi_id: s.upiId,
    plan: s.plan, flats_limit: s.flatsLimit, receipt_prefix: s.receiptPrefix, theme_key: s.themeKey,
    support_phone: s.supportPhone ?? null, owner_enabled_modules: s.modules.ownerEnabled, admin_visible_modules: s.modules.adminVisible,
    tenant_access: s.tenantAccess, subscription_status: s.subscriptionStatus, trial_started_at: s.trialStartedAt ?? null,
  })
  if (error) throw error
}

export async function updateSocietyReal(societyId: string, patch: Partial<Society>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.nameEn !== undefined) row.name_en = patch.nameEn
  if (patch.address !== undefined) row.address = patch.address
  if (patch.city !== undefined) row.city = patch.city
  if (patch.area !== undefined) row.area = patch.area
  if (patch.maintenanceAmount !== undefined) row.maintenance_amount = patch.maintenanceAmount
  if (patch.dueDay !== undefined) row.due_day = patch.dueDay
  if (patch.upiId !== undefined) row.upi_id = patch.upiId
  if (patch.receiptPrefix !== undefined) row.receipt_prefix = patch.receiptPrefix
  if (patch.themeKey !== undefined) row.theme_key = patch.themeKey
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl
  if (patch.supportPhone !== undefined) row.support_phone = patch.supportPhone
  if (patch.modules !== undefined) { row.owner_enabled_modules = patch.modules.ownerEnabled; row.admin_visible_modules = patch.modules.adminVisible }
  if (patch.tenantAccess !== undefined) row.tenant_access = patch.tenantAccess
  // subscription_status, plan, flats_limit, grace/trial dates are
  // deliberately NOT settable here - those are owner-only fields,
  // enforced by enforce_societies_update() in the schema itself, not
  // just by this function choosing not to send them. See updateSocietyById
  // below for the one path that's actually allowed to touch them.
  const { error } = await supabase.from('societies').update(row).eq('id', societyId)
  if (error) throw error
}

/** Owner-only: the fields updateSocietyReal deliberately excludes - subscription status, plan, flat limit, trial/grace dates. Matches enforce_societies_update()'s protected column list exactly. The trigger checks the caller's real, database-verified identity, not the app's local session state - so this works correctly even when the onboarding wizard's own local session shows 'society_admin' while setting up a brand-new society, since the platform owner's real membership row is what the trigger actually checks. */
export async function updateSocietyStatusReal(societyId: string, patch: { subscriptionStatus?: Society['subscriptionStatus']; plan?: string; flatsLimit?: number; graceStartedAt?: string | null; trialStartedAt?: string }): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.subscriptionStatus !== undefined) row.subscription_status = patch.subscriptionStatus
  if (patch.plan !== undefined) row.plan = patch.plan
  if (patch.flatsLimit !== undefined) row.flats_limit = patch.flatsLimit
  if (patch.graceStartedAt !== undefined) row.grace_started_at = patch.graceStartedAt
  if (patch.trialStartedAt !== undefined) row.trial_started_at = patch.trialStartedAt
  const { error } = await supabase.from('societies').update(row).eq('id', societyId)
  if (error) throw error
}

// ---------------------------------------------------------------------
// Documents - the fourth and final storage bucket, and the fifth table
// on the real data layer. Same fetch-once-and-cache shape as complaints
// and notices before it; same upload-after-the-row-exists shape as
// complaint photos and payment proof before it.
// ---------------------------------------------------------------------

interface DocRow { id: string; society_id: string; name: string; folder: string; permission: Doc['permission']; date: string; size_label: string; storage_path: string | null }
const docFromRow = (r: DocRow): Doc => ({
  id: r.id, societyId: r.society_id, name: r.name, folder: r.folder, permission: r.permission, date: r.date, size: r.size_label, storagePath: r.storage_path ?? undefined,
})

export async function fetchSocietyDocuments(societyId: string): Promise<Doc[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('documents').select('id, society_id, name, folder, permission, date, size_label, storage_path').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as DocRow[]).map(docFromRow)
}

export async function insertDocumentReal(d: Doc): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('documents').insert({
    id: d.id, society_id: d.societyId, name: d.name, folder: d.folder, permission: d.permission, date: d.date, size_label: d.size,
  })
  if (error) throw error
}

/** Called after uploadPrivateFile succeeds - same reasoning as updateComplaintPhotoPathReal: the document row has to exist first, so the storage path attaches in a second step. */
export async function updateDocumentStoragePathReal(documentId: string, storagePath: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('documents').update({ storage_path: storagePath }).eq('id', documentId)
  if (error) throw error
}

// ---------------------------------------------------------------------
// Memberships - fetching and approving/rejecting real join requests.
// This closes a real gap: a real resident's /join submission was already
// writing a genuine pending row via submit_join_request (see auth.ts),
// but nothing on the committee's side ever fetched it or wrote an
// approve/reject decision back - the admin's members screen only ever
// showed local demo memberships, meaning a real pending request was
// invisible to the very people meant to review it.
// ---------------------------------------------------------------------

interface MembershipRow {
  id: string; society_id: string; email: string; user_id: string | null; role: Membership['role']
  flat_id: string | null; phone: string | null; whatsapp: string | null; name: string | null
  can_manage_billing: boolean; status: Membership['status']; created_at: string
}
const membershipFromRow = (r: MembershipRow): Membership => ({
  id: r.id, societyId: r.society_id, email: r.email, userId: r.user_id ?? undefined, role: r.role,
  flatId: r.flat_id ?? undefined, phone: r.phone ?? undefined, whatsapp: r.whatsapp ?? undefined, name: r.name ?? undefined,
  canManageBilling: r.can_manage_billing, status: r.status, createdAt: r.created_at,
})

export async function fetchSocietyMemberships(societyId: string): Promise<Membership[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('memberships').select('id, society_id, email, user_id, role, flat_id, phone, whatsapp, name, can_manage_billing, status, created_at').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as MembershipRow[]).map(membershipFromRow)
}

/** Approve: sets status to active. Matches memberships_manage RLS (society_admin/owner only). */
export async function approveMembershipReal(membershipId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('memberships').update({ status: 'active' }).eq('id', membershipId)
  if (error) throw error
}

/** Reject: deletes the row outright, mirroring the local demo's own rejectMembership - a rejected self-enrollment isn't kept around, the person can just try again if it was a genuine mistake. Matches memberships_delete RLS. */
export async function rejectMembershipReal(membershipId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId)
  if (error) throw error
}

/** Used by the owner console specifically - adding a committee/accountant/resident directly by email, or creating the initial admin membership during onboarding. Matches memberships_insert RLS (society_admin/owner). */
export async function insertMembershipReal(m: Membership): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('memberships').insert({
    id: m.id, society_id: m.societyId, email: m.email, role: m.role, flat_id: m.flatId ?? null,
    phone: m.phone ?? null, whatsapp: m.whatsapp ?? null, name: m.name ?? null,
    can_manage_billing: m.canManageBilling ?? false, status: m.status,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------
// Vendors, vehicles (parking), and contacts - three more straightforward
// tables. Contacts has no add function anywhere in the app currently
// (it's seed-data only, no UI to add one), so only a fetch makes sense
// for it right now - nothing to write yet, this just means an existing
// contact list is genuinely real instead of always the local seed set.
// ---------------------------------------------------------------------

interface VendorRow { id: string; society_id: string; name: string; service: string; contact_person: string; phone: string; amc_start: string | null; amc_end: string | null; notes: string | null }
const vendorFromRow = (r: VendorRow): Vendor => ({
  id: r.id, societyId: r.society_id, name: r.name, service: r.service, contactPerson: r.contact_person, phone: r.phone,
  amcStart: r.amc_start ?? undefined, amcEnd: r.amc_end ?? undefined, notes: r.notes ?? undefined,
})

export async function fetchSocietyVendors(societyId: string): Promise<Vendor[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('vendors').select('id, society_id, name, service, contact_person, phone, amc_start, amc_end, notes').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as VendorRow[]).map(vendorFromRow)
}

export async function insertVendorReal(v: Vendor): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('vendors').insert({
    id: v.id, society_id: v.societyId, name: v.name, service: v.service, contact_person: v.contactPerson,
    phone: v.phone, amc_start: v.amcStart ?? null, amc_end: v.amcEnd ?? null, notes: v.notes ?? null,
  })
  if (error) throw error
}

export async function updateVendorReal(vendorId: string, patch: Partial<Vendor>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.service !== undefined) row.service = patch.service
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.amcStart !== undefined) row.amc_start = patch.amcStart
  if (patch.amcEnd !== undefined) row.amc_end = patch.amcEnd
  if (patch.notes !== undefined) row.notes = patch.notes
  const { error } = await supabase.from('vendors').update(row).eq('id', vendorId)
  if (error) throw error
}

interface VehicleRow { id: string; society_id: string; flat_id: string; kind: Vehicle['kind']; number: string; slot: string; owner_type: string }
const vehicleFromRow = (r: VehicleRow): Vehicle => ({
  id: r.id, societyId: r.society_id, flatId: r.flat_id, kind: r.kind, number: r.number, slot: r.slot, ownerType: r.owner_type,
})

export async function fetchSocietyVehicles(societyId: string): Promise<Vehicle[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('vehicles').select('id, society_id, flat_id, kind, number, slot, owner_type').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as VehicleRow[]).map(vehicleFromRow)
}

export async function insertVehicleReal(v: Vehicle): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('vehicles').insert({
    id: v.id, society_id: v.societyId, flat_id: v.flatId, kind: v.kind, number: v.number, slot: v.slot, owner_type: v.ownerType,
  })
  if (error) throw error
}

interface ContactRow { id: string; society_id: string; name: string; role: string; phone: string; category: Contact['category'] }
const contactFromRow = (r: ContactRow): Contact => ({ id: r.id, societyId: r.society_id, name: r.name, role: r.role, phone: r.phone, category: r.category })

export async function fetchSocietyContacts(societyId: string): Promise<Contact[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('contacts').select('id, society_id, name, role, phone, category').eq('society_id', societyId)
  if (error) throw error
  return ((data ?? []) as ContactRow[]).map(contactFromRow)
}

// ---------------------------------------------------------------------
// Polls - votes map comes from whatever poll_votes RLS actually returns
// for the caller (the truth for management, just their own vote for a
// resident); resultCounts comes separately from poll_results(), the
// privacy-preserving aggregate function - see the comment on Poll in
// types.ts for why these can't be the same thing once individual votes
// are actually private.
// ---------------------------------------------------------------------

interface PollRow { id: string; society_id: string; question: string; type: Poll['type']; options: string[]; status: Poll['status']; result_visible: boolean; end_date: string | null }
interface PollVoteRow { poll_id: string; flat_id: string; option_idx: number }

export async function fetchSocietyPolls(societyId: string): Promise<Poll[]> {
  if (!supabase) return []
  const [pollsRes, votesRes] = await Promise.all([
    supabase.from('polls').select('id, society_id, question, type, options, status, result_visible, end_date').eq('society_id', societyId),
    // No .eq() here - poll_votes has no society_id of its own, filtered
    // entirely by poll_votes_select itself (own vote, or every vote for
    // management), same reasoning as complaint_timeline's fetch.
    supabase.from('poll_votes').select('poll_id, flat_id, option_idx'),
  ])
  if (pollsRes.error) throw pollsRes.error
  if (votesRes.error) throw votesRes.error

  const votesByPoll = new Map<string, Record<string, number>>()
  for (const v of (votesRes.data ?? []) as PollVoteRow[]) {
    const map = votesByPoll.get(v.poll_id) ?? {}
    map[v.flat_id] = v.option_idx
    votesByPoll.set(v.poll_id, map)
  }

  const rows = (pollsRes.data ?? []) as PollRow[]
  const resultCounts = await Promise.all(rows.map(async r => {
    const { data, error } = await supabase!.rpc('poll_results', { target_poll: r.id })
    if (error) throw error
    const counts = new Array(r.options.length).fill(0)
    for (const row of (data ?? []) as { option_idx: number; vote_count: number }[]) counts[row.option_idx] = Number(row.vote_count)
    return counts
  }))

  return rows.map((r, i) => ({
    id: r.id, societyId: r.society_id, question: r.question, type: r.type, options: r.options,
    votes: votesByPoll.get(r.id) ?? {}, status: r.status, resultVisible: r.result_visible, endDate: r.end_date ?? undefined,
    resultCounts: resultCounts[i],
  }))
}

export async function insertPollReal(p: Poll): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('polls').insert({
    id: p.id, society_id: p.societyId, question: p.question, type: p.type, options: p.options,
    status: p.status, result_visible: p.resultVisible, end_date: p.endDate ?? null,
  })
  if (error) throw error
}

export async function closePollReal(pollId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('polls').update({ status: 'closed', result_visible: true }).eq('id', pollId)
  if (error) throw error
}

export async function insertPollVoteReal(pollId: string, flatId: string, optionIdx: number): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, flat_id: flatId, option_idx: optionIdx })
  if (error) throw error
}

// ---------------------------------------------------------------------
// Events - contributions, volunteers, and expenses are three separate
// real tables under one event, unlike the local demo where they're just
// arrays embedded directly on the event object. Same join-and-reshape
// approach as complaints/complaint_timeline: fetch all four, stitch the
// three child lists onto their own parent event client-side.
// ---------------------------------------------------------------------

interface EventRow { id: string; society_id: string; name: string; type: string; date: string; note: string | null }
interface ContributionRow { id: string; event_id: string; flat_id: string; amount: number; date: string }
interface VolunteerRow { id: string; event_id: string; name: string; joined_at: string }
interface EventExpenseRow { id: string; event_id: string; label: string; amount: number }

export async function fetchSocietyEvents(societyId: string): Promise<SocietyEvent[]> {
  if (!supabase) return []
  const [eventsRes, contribRes, volRes, expRes] = await Promise.all([
    supabase.from('events').select('id, society_id, name, type, date, note').eq('society_id', societyId),
    // None of these three have a society_id of their own - each is
    // filtered entirely by its own RLS policy joining back through the
    // parent event, same reasoning as complaint_timeline's fetch.
    supabase.from('event_contributions').select('id, event_id, flat_id, amount, date'),
    supabase.from('event_volunteers').select('id, event_id, name, joined_at'),
    supabase.from('event_expenses').select('id, event_id, label, amount'),
  ])
  if (eventsRes.error) throw eventsRes.error
  if (contribRes.error) throw contribRes.error
  if (volRes.error) throw volRes.error
  if (expRes.error) throw expRes.error

  const contribByEvent = new Map<string, SocietyEvent['contributions']>()
  for (const c of (contribRes.data ?? []) as ContributionRow[]) {
    const list = contribByEvent.get(c.event_id) ?? []
    list.push({ flatId: c.flat_id, amount: c.amount, date: c.date })
    contribByEvent.set(c.event_id, list)
  }
  const volByEvent = new Map<string, string[]>()
  for (const v of (volRes.data ?? []) as VolunteerRow[]) {
    const list = volByEvent.get(v.event_id) ?? []
    list.push(v.name)
    volByEvent.set(v.event_id, list)
  }
  const expByEvent = new Map<string, SocietyEvent['expenses']>()
  for (const e of (expRes.data ?? []) as EventExpenseRow[]) {
    const list = expByEvent.get(e.event_id) ?? []
    list.push({ label: e.label, amount: e.amount })
    expByEvent.set(e.event_id, list)
  }

  return ((eventsRes.data ?? []) as EventRow[]).map(r => ({
    id: r.id, societyId: r.society_id, name: r.name, type: r.type, date: r.date, note: r.note ?? undefined,
    contributions: contribByEvent.get(r.id) ?? [], volunteers: volByEvent.get(r.id) ?? [], expenses: expByEvent.get(r.id) ?? [],
  }))
}

export async function insertEventReal(e: SocietyEvent): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('events').insert({ id: e.id, society_id: e.societyId, name: e.name, type: e.type, date: e.date, note: e.note ?? null })
  if (error) throw error
}

export async function insertContributionReal(eventId: string, flatId: string, amount: number, date: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('event_contributions').insert({ event_id: eventId, flat_id: flatId, amount, date })
  if (error) throw error
}

export async function insertVolunteerReal(eventId: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('event_volunteers').insert({ event_id: eventId, name })
  if (error) throw error
}

export async function insertEventExpenseReal(eventId: string, label: string, amount: number): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('event_expenses').insert({ event_id: eventId, label, amount })
  if (error) throw error
}

// ---------------------------------------------------------------------
// Owner console aggregates - flats, memberships, platform billing, the
// audit log, and impersonation history, all across every society at
// once. Every other real fetch in this file is scoped to one society
// (activeSocietyId); the owner's own dashboard genuinely isn't, it's
// platform-wide by design, so these five deliberately have no .eq()
// filter at all - RLS itself is what limits this to the real owner
// (has_role(society_id, ['owner']) on every one of these tables), the
// same way every other table's own policy is what actually enforces
// its own scope, not the shape of the query.
//
// Previously the owner's dashboard, platform billing table, and
// activity log all silently kept showing whatever was in local/demo
// state, since only fetchAllSocieties was ever wired up for a real
// owner session - this closes that gap for the four tables it was
// still open on.
// ---------------------------------------------------------------------

export async function fetchAllFlatsForOwner(): Promise<Flat[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('flats').select('id, society_id, number, floor, owner_name, phone, email, occupancy, tenant_name, tenant_email, sqft, member_since, maintenance_override')
  if (error) throw error
  return ((data ?? []) as FlatRow[]).map(flatFromRow)
}

export async function fetchAllMembershipsForOwner(): Promise<Membership[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('memberships').select('id, society_id, email, user_id, role, flat_id, phone, whatsapp, name, can_manage_billing, status, created_at')
  if (error) throw error
  return ((data ?? []) as MembershipRow[]).map(membershipFromRow)
}

interface PlatformBillingRow {
  id: string; society_id: string; period_month: string; flat_count: number; rate_per_flat: number
  expected_amount: number; received_amount: number; payment_date: string | null; mode: PlatformBillingRecord['mode'] | null
  status: PlatformBillingRecord['status']; internal_note: string | null
}
const platformBillingFromRow = (r: PlatformBillingRow): PlatformBillingRecord => ({
  id: r.id, societyId: r.society_id, periodMonth: r.period_month, flatCount: r.flat_count, ratePerFlat: r.rate_per_flat,
  expectedAmount: r.expected_amount, receivedAmount: r.received_amount, paymentDate: r.payment_date ?? undefined,
  mode: r.mode ?? undefined, status: r.status, internalNote: r.internal_note ?? undefined,
})

export async function fetchAllPlatformBilling(): Promise<PlatformBillingRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('platform_billing').select('id, society_id, period_month, flat_count, rate_per_flat, expected_amount, received_amount, payment_date, mode, status, internal_note')
  if (error) throw error
  return ((data ?? []) as PlatformBillingRow[]).map(platformBillingFromRow)
}

export async function insertPlatformBillingReal(r: PlatformBillingRecord): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('platform_billing').insert({
    id: r.id, society_id: r.societyId, period_month: r.periodMonth, flat_count: r.flatCount, rate_per_flat: r.ratePerFlat,
    expected_amount: r.expectedAmount, received_amount: r.receivedAmount, payment_date: r.paymentDate ?? null,
    mode: r.mode ?? null, status: r.status, internal_note: r.internalNote ?? null,
  })
  if (error) throw error
}

export async function updatePlatformBillingReal(id: string, patch: Partial<PlatformBillingRecord>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.receivedAmount !== undefined) row.received_amount = patch.receivedAmount
  if (patch.paymentDate !== undefined) row.payment_date = patch.paymentDate
  if (patch.mode !== undefined) row.mode = patch.mode
  if (patch.status !== undefined) row.status = patch.status
  if (patch.internalNote !== undefined) row.internal_note = patch.internalNote
  const { error } = await supabase.from('platform_billing').update(row).eq('id', id)
  if (error) throw error
}

interface AuditLogRow { id: string; society_id: string; actor: string; action: string; detail: string; created_at: string }
export async function fetchAllAuditLogs(): Promise<AuditLogEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('audit_logs').select('id, society_id, actor, action, detail, created_at').order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as AuditLogRow[]).map(r => ({ id: r.id, societyId: r.society_id, at: r.created_at, actor: r.actor, action: r.action, detail: r.detail }))
}

interface ImpersonationLogRow { id: string; society_id: string; mode: ImpersonationLog['mode']; reason: string | null; entered_at: string; exited_at: string | null }
export async function fetchAllImpersonationLogs(): Promise<ImpersonationLog[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('impersonation_logs').select('id, society_id, mode, reason, entered_at, exited_at').order('entered_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ImpersonationLogRow[]).map(r => ({ id: r.id, societyId: r.society_id, enteredAt: r.entered_at, mode: r.mode, exitedAt: r.exited_at ?? undefined, reason: r.reason ?? undefined }))
}

/** The owner's genuine identity is real even while the society they're viewing stays on the local data layer for now (see enterSociety in store.tsx) - the log entry itself doesn't have that same limitation, so it's written for real regardless. */
export async function insertImpersonationLogReal(log: ImpersonationLog): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('impersonation_logs').insert({
    id: log.id, society_id: log.societyId, mode: log.mode, reason: log.reason ?? null,
  })
  if (error) throw error
}

export async function exitImpersonationLogReal(logId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('impersonation_logs').update({ exited_at: new Date().toISOString() }).eq('id', logId)
  if (error) throw error
}
