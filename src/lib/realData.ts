import { supabase } from './supabase'
import type { Adjustment, Bill, Flat, Payment } from './types'

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
  cancelled: boolean; cancel_reason: string | null
}
const paymentFromRow = (r: PaymentRow): Payment => ({
  id: r.id, societyId: r.society_id, flatId: r.flat_id, billId: r.bill_id ?? undefined,
  date: r.date, amount: r.amount, mode: r.mode, refNo: r.ref_no ?? undefined,
  receiptNo: r.receipt_no ?? undefined, status: r.status, note: r.note ?? undefined,
  cancelled: r.cancelled, cancelReason: r.cancel_reason ?? undefined,
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
    supabase.from('payments').select('id, society_id, flat_id, bill_id, date, amount, mode, ref_no, receipt_no, status, note, cancelled, cancel_reason').eq('society_id', societyId),
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

export async function updatePaymentReal(paymentId: string, patch: { status?: Payment['status']; receiptNo?: string; cancelled?: boolean; cancelReason?: string }): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const row: Record<string, unknown> = {}
  if (patch.status !== undefined) row.status = patch.status
  if (patch.receiptNo !== undefined) row.receipt_no = patch.receiptNo
  if (patch.cancelled !== undefined) row.cancelled = patch.cancelled
  if (patch.cancelReason !== undefined) row.cancel_reason = patch.cancelReason
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
