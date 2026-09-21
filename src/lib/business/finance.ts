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

export function transactionCashDirection(kind: BusinessTransactionKind): 'in' | 'out' | 'neutral' {
  if (['income', 'partner_capital', 'partner_advance', 'refund'].includes(kind)) return 'in'
  if (['expense', 'reimbursement', 'withdrawal'].includes(kind)) return 'out'
  return 'neutral'
}

export function summarizeTransactions(transactions: BusinessTransaction[], datePrefix?: string) {
  const filtered = datePrefix ? transactions.filter(t => t.occurred_at.slice(0, 10) === datePrefix) : transactions
  let moneyIn = 0
  let moneyOut = 0
  let personalPaid = 0
  for (const tx of filtered) {
    if (tx.kind === 'reversal' || tx.reversed_at) continue
    const direction = transactionCashDirection(tx.kind)
    if (direction === 'in') moneyIn += Number(tx.amount)
    if (direction === 'out') moneyOut += Number(tx.amount)
    if (tx.kind === 'personal_expense') personalPaid += Number(tx.amount)
  }
  return { moneyIn, moneyOut, net: moneyIn - moneyOut, personalPaid }
}

export const todayBusinessISO = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
