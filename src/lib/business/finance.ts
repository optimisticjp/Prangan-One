import type { BusinessTransaction, BusinessTransactionKind } from './types'

export const businessMoney = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value ?? 0))

export const businessTransactionLabels: Record<BusinessTransactionKind, string> = {
  income: 'Money in',
  expense: 'Business expense',
  partner_capital: 'Partner capital',
  partner_advance: 'Partner advance',
  personal_expense: 'Partner paid personally',
  reimbursement: 'Partner reimbursement',
  withdrawal: 'Partner withdrawal',
  transfer: 'Account transfer',
  refund: 'Refund received',
  reversal: 'Reversal',
}

export const businessTransactionHelp: Record<Exclude<BusinessTransactionKind, 'reversal' | 'personal_expense'>, { tag: string; help: string }> = {
  income: { tag: 'RECEIVE', help: 'Money received by the business into Cash or Bank.' },
  expense: { tag: 'EXPENSE', help: 'Record a bill now. It can stay unpaid or be marked paid by business funds or a partner.' },
  partner_capital: { tag: 'CAPITAL', help: 'Long-term money contributed by a partner to the business.' },
  partner_advance: { tag: 'ADVANCE', help: 'Temporary money lent by a partner that the business may repay.' },
  reimbursement: { tag: 'REPAY', help: 'Business pays back money it already owes a partner.' },
  withdrawal: { tag: 'DRAWING', help: 'A partner takes money out of a business account.' },
  transfer: { tag: 'MOVE', help: 'Move money between two business accounts without changing total funds.' },
  refund: { tag: 'REFUND', help: 'Money returned back to the business.' },
}

export function transactionCashDirection(value: BusinessTransaction | BusinessTransactionKind): 'in' | 'out' | 'neutral' {
  const kind = typeof value === 'string' ? value : value.kind
  if (['income', 'partner_capital', 'partner_advance', 'refund'].includes(kind)) return 'in'

  if (kind === 'expense' && typeof value !== 'string') {
    if (value.payment_status === 'unpaid' || value.partner_id) return 'neutral'
    return 'out'
  }

  if (['expense', 'reimbursement', 'withdrawal'].includes(kind)) return 'out'
  return 'neutral'
}

export function expensePaidByLabel(tx: BusinessTransaction, accounts: Array<{ id: string; name: string }>, partners: Array<{ id: string; name: string }>) {
  if (tx.kind !== 'expense') return null
  if (tx.payment_status === 'unpaid') return 'Not paid yet'
  if (tx.account_id) return accounts.find(a => a.id === tx.account_id)?.name ?? 'Business funds'
  if (tx.partner_id) return partners.find(p => p.id === tx.partner_id)?.name ?? 'Partner'
  return 'Paid'
}

export function summarizeTransactions(transactions: BusinessTransaction[], datePrefix?: string) {
  const filtered = datePrefix ? transactions.filter(t => t.occurred_at.slice(0, 10) === datePrefix) : transactions
  let moneyIn = 0
  let moneyOut = 0
  let personalPaid = 0

  for (const tx of filtered) {
    if (tx.kind === 'reversal' || tx.reversed_at) continue
    const direction = transactionCashDirection(tx)
    if (direction === 'in') moneyIn += Number(tx.amount)
    if (direction === 'out') moneyOut += Number(tx.amount)
    if (tx.kind === 'personal_expense' || (tx.kind === 'expense' && tx.payment_status === 'paid' && !!tx.partner_id)) {
      personalPaid += Number(tx.amount)
    }
  }

  return { moneyIn, moneyOut, net: moneyIn - moneyOut, personalPaid }
}

export const todayBusinessISO = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
