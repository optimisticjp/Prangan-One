/**
 * Pure, derived-data helpers shared identically between the real
 * (Supabase-backed) data provider and the demo data provider - neither
 * imports the other, and neither imports realData.ts or lib/supabase.ts,
 * so this file exists specifically so both can compute the same numbers
 * the same way without duplicating the logic itself, only the state each
 * one feeds into it.
 *
 * Every function here takes its inputs as plain arguments rather than
 * closing over any provider's own state - that's what makes genuine
 * reuse between two structurally separate providers possible at all.
 */
import type { Bill, DB, Society, SocietyModules } from './types'
import { todayISO } from './format'

export function billStatus(b: Bill): 'paid' | 'pending' | 'overdue' {
  if (b.paidAmount >= b.amount) return 'paid'
  return b.dueDate < todayISO() ? 'overdue' : 'pending'
}

// A debit adjustment (a one-time charge, a correction that increases
// what's owed) adds to pending. A credit adjustment (a discount, a
// refund, an advance payment credited forward) reduces it, and can take
// a flat's pending balance negative - that's a real credit balance, not
// a bug. Only adjustments tied to a specific flat count in flatPending;
// a society-wide adjustment (flatId undefined) doesn't belong to any one
// flat's balance and only shows up in totalPending.
export function flatAdjustmentNet(scopedDb: Pick<DB, 'adjustments'>, flatId: string) {
  return scopedDb.adjustments.filter(a => a.flatId === flatId).reduce((s, a) => s + (a.type === 'debit' ? a.amount : -a.amount), 0)
}
function allAdjustmentNet(scopedDb: Pick<DB, 'adjustments'>) {
  return scopedDb.adjustments.reduce((s, a) => s + (a.type === 'debit' ? a.amount : -a.amount), 0)
}

export function flatPending(scopedDb: Pick<DB, 'bills' | 'adjustments'>, flatId: string): number {
  return scopedDb.bills.filter(b => b.flatId === flatId).reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0) + flatAdjustmentNet(scopedDb, flatId)
}

export function totalPending(scopedDb: Pick<DB, 'bills' | 'adjustments'>): number {
  return scopedDb.bills.reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0) + allAdjustmentNet(scopedDb)
}

// A cancelled receipt keeps status: 'success' (cancelling reverses the
// bill credit but never rewrites status, since 'status' means "did this
// payment succeed at the time", not "is it still valid now" - those are
// different questions). Income specifically needs the second one: money
// that was later reversed was never really collected, so it must not
// count here even though it once did.
export function monthIncome(scopedDb: Pick<DB, 'payments'>, month: string): number {
  return scopedDb.payments.filter(p => p.status === 'success' && !p.cancelled && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)
}

export function monthExpense(scopedDb: Pick<DB, 'expenses'>, month: string): number {
  return scopedDb.expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
}

// A module is usable if the OWNER has enabled it AND the society's own
// admin hasn't hidden it. Both layers must say yes.
export function moduleEnabled(society: Society | undefined, key: keyof SocietyModules): boolean {
  return society?.modules?.ownerEnabled?.[key] !== false && society?.modules?.adminVisible?.[key] !== false
}

// Whether a society_admin is even allowed to toggle this module
// themselves (only if the owner enabled it in the first place).
export function adminCanToggle(society: Society | undefined, key: keyof SocietyModules): boolean {
  return society?.modules?.ownerEnabled?.[key] !== false
}
