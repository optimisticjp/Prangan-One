import type {
  BusinessStaffMoney,
  BusinessTransaction,
  BusinessTransactionKind,
  BusinessTransactionPayment,
} from './types'

export const businessMoney = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value ?? 0))

export const businessTransactionLabels: Record<BusinessTransactionKind, string> = {
  income: 'Money in',
  expense: 'Business expense',
  partner_capital: 'Partner capital',
  partner_advance: 'Partner loan to business',
  personal_expense: 'Partner paid personally',
  reimbursement: 'Partner reimbursement',
  withdrawal: 'Partner personal withdrawal',
  transfer: 'Move business money',
  refund: 'Refund received',
  reversal: 'Reversal',
}

export const businessTransactionHelp: Record<Exclude<BusinessTransactionKind, 'reversal' | 'personal_expense'>, { tag: string; help: string }> = {
  income: { tag: 'RECEIVE', help: 'Receive money now into a business money location, or save it to collect later.' },
  expense: { tag: 'EXPENSE', help: 'Record a bill now. It can stay to-pay, be paid from business money, or be paid personally by a partner.' },
  partner_capital: { tag: 'CAPITAL', help: 'Long-term money contributed by a partner to the business.' },
  partner_advance: { tag: 'PARTNER LOAN', help: 'Temporary personal money lent by a partner. The business owes this back.' },
  reimbursement: { tag: 'REPAY', help: 'Business pays back personal money it already owes a partner.' },
  withdrawal: { tag: 'PERSONAL', help: 'A partner takes business money for personal use. This is not money they are holding for business work.' },
  transfer: { tag: 'MOVE', help: 'Move business money between bank, cash, UPI or a partner-held money location without changing total funds.' },
  refund: { tag: 'REFUND', help: 'Money returned back to a business money location.' },
}

export const transactionRemaining = (tx: BusinessTransaction) => {
  const paid = tx.paid_amount ?? (tx.payment_status === 'paid' ? tx.amount : 0)
  return Math.max(0, Number(tx.amount) - Number(paid))
}

export function transactionCashDirection(value: BusinessTransaction | BusinessTransactionKind): 'in' | 'out' | 'neutral' {
  const kind = typeof value === 'string' ? value : value.kind
  if (['partner_capital', 'partner_advance', 'refund'].includes(kind)) return 'in'
  if (kind === 'income' && typeof value !== 'string') return value.payment_status === 'paid' ? 'in' : 'neutral'
  if (kind === 'expense' && typeof value !== 'string') {
    if (value.payment_status !== 'paid' || value.partner_id) return 'neutral'
    return 'out'
  }
  if (['expense', 'reimbursement', 'withdrawal'].includes(kind)) return 'out'
  return 'neutral'
}

export function expensePaidByLabel(
  tx: BusinessTransaction,
  accounts: Array<{ id: string; name: string }>,
  partners: Array<{ id: string; name: string }>,
  payments: BusinessTransactionPayment[] = [],
) {
  if (tx.kind !== 'expense') return null
  if (tx.payment_status === 'unpaid') return 'Not paid yet'
  const txPayments = payments.filter(payment => payment.transaction_id === tx.id)
  if (tx.payment_status === 'partial') return 'Part paid · ' + businessMoney(tx.paid_amount ?? 0)
  if (txPayments.length > 1) return 'Paid from multiple sources'
  const payment = txPayments[0]
  if (payment?.account_id) return accounts.find(account => account.id === payment.account_id)?.name ?? 'Business money'
  if (payment?.partner_id) return partners.find(partner => partner.id === payment.partner_id)?.name ?? 'Partner personally'
  if (tx.account_id) return accounts.find(account => account.id === tx.account_id)?.name ?? 'Business money'
  if (tx.partner_id) return partners.find(partner => partner.id === tx.partner_id)?.name ?? 'Partner personally'
  return 'Paid'
}

export function summarizeTransactions(
  transactions: BusinessTransaction[],
  datePrefix?: string,
  payments: BusinessTransactionPayment[] = [],
  staffMoney: BusinessStaffMoney[] = [],
) {
  let moneyIn = 0
  let moneyOut = 0
  let personalPaid = 0
  const paymentBacked = new Set(payments.map(payment => payment.transaction_id))

  for (const tx of transactions) {
    if (tx.kind === 'reversal' || tx.reversed_at) continue
    if (datePrefix && tx.occurred_at.slice(0, 10) !== datePrefix) continue
    if (paymentBacked.has(tx.id) && ['income', 'expense'].includes(tx.kind)) continue
    const direction = transactionCashDirection(tx)
    if (direction === 'in') moneyIn += Number(tx.amount)
    if (direction === 'out') moneyOut += Number(tx.amount)
    if (tx.kind === 'personal_expense' || (tx.kind === 'expense' && tx.payment_status === 'paid' && !!tx.partner_id)) personalPaid += Number(tx.amount)
  }

  for (const payment of payments) {
    if (datePrefix && payment.occurred_at.slice(0, 10) !== datePrefix) continue
    if (payment.account_id) {
      if (payment.direction === 'in') moneyIn += Number(payment.amount)
      else moneyOut += Number(payment.amount)
    } else if (payment.partner_id && payment.direction === 'out') {
      personalPaid += Number(payment.amount)
    }
  }

  for (const entry of staffMoney) {
    if (datePrefix && entry.occurred_at.slice(0, 10) !== datePrefix) continue
    if (['advance_expense', 'reimbursement', 'salary', 'settlement'].includes(entry.kind)) moneyOut += Number(entry.amount)
    if (entry.kind === 'pocket_expense') personalPaid += Number(entry.amount)
  }

  return { moneyIn, moneyOut, net: moneyIn - moneyOut, personalPaid }
}

export function summarizeBusinessMoney(
  balances: Array<{ account_id: string; balance: number }>,
  staffPositions: Array<{ advance_balance: number }>,
) {
  const moneyInLocations = balances.reduce((sum, item) => sum + Math.max(0, Number(item.balance)), 0)
  const recordGap = balances.reduce((sum, item) => sum + Math.max(0, -Number(item.balance)), 0)
  const staffHeld = staffPositions.reduce((sum, item) => sum + Math.max(0, Number(item.advance_balance)), 0)
  return {
    available: moneyInLocations + staffHeld,
    moneyInLocations,
    staffHeld,
    recordGap,
  }
}

export const accountAvailable = (
  accountId: string | null | undefined,
  balances: Array<{ account_id: string; balance: number }>,
) => Math.max(0, Number(balances.find(item => item.account_id === accountId)?.balance ?? 0))

export const todayBusinessISO = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
