import { describe, expect, it } from 'vitest'
import { summarizeTransactions, transactionCashDirection } from '../finance'
import type { BusinessTransaction } from '../types'

const tx = (kind: BusinessTransaction['kind'], amount: number, extra: Partial<BusinessTransaction> = {}): BusinessTransaction => ({
  id: crypto.randomUUID(), business_id: 'b', kind, amount, account_id: null, to_account_id: null,
  partner_id: null, category_id: null, counterparty: null, note: null, approval_status: 'not_required',
  payment_status: 'paid', due_date: null, paid_at: '2026-09-21T10:00:00.000Z',
  occurred_at: '2026-09-21T10:00:00.000Z', created_by: 'u', created_at: '2026-09-21T10:00:00.000Z',
  reversed_transaction_id: null, reversed_at: null, reversed_by: null, ...extra,
})

describe('business finance helpers', () => {
  it('separates cash movement from partner-personal spending', () => {
    const summary = summarizeTransactions([
      tx('income', 20000),
      tx('expense', 5000, { account_id: 'cash' }),
      tx('personal_expense', 3000, { partner_id: 'p' }),
      tx('partner_capital', 10000),
    ])
    expect(summary.moneyIn).toBe(30000)
    expect(summary.moneyOut).toBe(5000)
    expect(summary.personalPaid).toBe(3000)
    expect(summary.net).toBe(25000)
  })

  it('does not move cash for an unpaid expense', () => {
    const unpaid = tx('expense', 7000, { payment_status: 'unpaid', paid_at: null })
    expect(transactionCashDirection(unpaid)).toBe('neutral')
    const summary = summarizeTransactions([unpaid])
    expect(summary.moneyOut).toBe(0)
    expect(summary.net).toBe(0)
  })

  it('treats a partner-paid expense as partner spending, not business cash out', () => {
    const partnerPaid = tx('expense', 3000, { partner_id: 'p', account_id: null })
    expect(transactionCashDirection(partnerPaid)).toBe('neutral')
    const summary = summarizeTransactions([partnerPaid])
    expect(summary.moneyOut).toBe(0)
    expect(summary.personalPaid).toBe(3000)
  })

  it('does not count reversed originals in totals', () => {
    const summary = summarizeTransactions([tx('expense', 5000, { account_id: 'cash', reversed_at: '2026-09-21T12:00:00Z' }), tx('reversal', 5000)])
    expect(summary.moneyOut).toBe(0)
    expect(summary.net).toBe(0)
  })

  it('treats transfers and legacy personal-paid expenses as neutral business cash movement', () => {
    expect(transactionCashDirection('transfer')).toBe('neutral')
    expect(transactionCashDirection('personal_expense')).toBe('neutral')
  })
})
