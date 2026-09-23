import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight,
  Camera, CheckSquare2, Clock3, HandCoins, ReceiptText, RefreshCw, UserRound, WalletCards, WifiOff,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import {
  businessMoney, businessTransactionLabels, summarizeBusinessMoney, summarizeTransactions,
  todayBusinessISO, transactionRemaining,
} from '../../lib/business/finance'
import type { SerializableTransactionInput } from '../../lib/business/preferences'
import type { BusinessTransaction } from '../../lib/business/types'
import type { BusinessOutletContext } from '../../components/business/BusinessLayout'
import BusinessStaffHome from './StaffHome'

export default function BusinessDashboard() {
  const { data, userId, offlineQueueCount, syncOfflineQueue, isStaff } = useBusiness()
  const { openTransaction } = useOutletContext<BusinessOutletContext>()

  if (isStaff) return <BusinessStaffHome />

  const todayKey = todayBusinessISO()
  const today = summarizeTransactions(data.transactions, todayKey, data.transactionPayments, data.staffMoney)
  const activeBalances = data.accountBalances.filter(balance => data.accounts.find(account => account.id === balance.account_id)?.active !== false)
  const money = summarizeBusinessMoney(activeBalances, data.staffPositions)
  const negativeAccounts = activeBalances.filter(balance => Number(balance.balance) < 0)
  const pendingReviews = data.transactions.filter(tx => tx.approval_status === 'pending' && !tx.reversed_at)
  const openExpenses = data.transactions.filter(tx => tx.kind === 'expense' && tx.payment_status !== 'paid' && !tx.reversed_at)
  const openReceivables = data.transactions.filter(tx => tx.kind === 'income' && tx.payment_status !== 'paid' && !tx.reversed_at)
  const toPay = openExpenses.reduce((sum, tx) => sum + transactionRemaining(tx), 0)
  const toCollect = openReceivables.reduce((sum, tx) => sum + transactionRemaining(tx), 0)
  const partnerDue = data.partnerPositions.filter(position => Number(position.outstanding_due) > 0)
  const staffDue = data.staffPositions.filter(position => Number(position.outstanding_due) > 0)
  const recurringDue = data.recurringEntries.filter(entry => entry.active && entry.next_date <= todayKey)
  const attachmentIds = new Set(data.attachments.map(attachment => attachment.transaction_id))
  const missingProofs = data.transactions.filter(tx => ['expense', 'refund'].includes(tx.kind) && !tx.reversed_at && !attachmentIds.has(tx.id))
  const cashAccounts = activeBalances.filter(account => account.kind === 'cash' && Number(account.balance) >= 0)
  const todayClosings = data.closings.filter(closing => closing.close_date === todayKey)
  const unclosedCash = cashAccounts.filter(account => !todayClosings.some(closing => closing.account_id === account.account_id))
  const cashDifferences = todayClosings.filter(closing => Math.abs(Number(closing.difference)) > 0.005)
  const lastTransaction = data.transactions.find(tx => tx.kind !== 'reversal' && !tx.reversed_at)

  const repeat = () => {
    if (!lastTransaction) return
    const preset = transactionPreset(lastTransaction)
    openTransaction(preset.kind as Exclude<BusinessTransaction['kind'], 'reversal' | 'personal_expense'>, preset)
  }

  const actionCount =
    negativeAccounts.length
    + (pendingReviews.length ? 1 : 0)
    + (openExpenses.length ? 1 : 0)
    + (openReceivables.length ? 1 : 0)
    + partnerDue.length
    + staffDue.length
    + (recurringDue.length ? 1 : 0)
    + (missingProofs.length ? 1 : 0)
    + (unclosedCash.length ? 1 : 0)
    + cashDifferences.length
    + (offlineQueueCount ? 1 : 0)

  return (
    <div className="space-y-2.5">
      <section className="rounded-2xl bg-navy-900 text-cream-50 px-3.5 py-3.5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] text-cream-100/55 font-bold uppercase tracking-wide">Money available now</div>
            <div className="num text-[27px] font-bold leading-tight mt-0.5">{businessMoney(money.available)}</div>
            <div className="text-[10.5px] text-cream-100/60 mt-1">Money Prangan can locate in cash, bank, UPI, with partners or with staff.</div>
          </div>
          {money.recordGap > 0 && (
            <Link to="/business/accounts" className="shrink-0 rounded-xl bg-red-50/10 border border-red-200/25 px-2.5 py-2 text-right">
              <div className="text-[8.5px] font-bold text-red-200 uppercase">Records need fixing</div>
              <div className="num text-[13px] font-bold text-red-100">{businessMoney(money.recordGap)}</div>
            </Link>
          )}
        </div>

        <div className="dense-scroll mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {activeBalances.map(balance => {
            const account = data.accounts.find(item => item.id === balance.account_id)
            const holder = account?.custodian_partner_id ? data.partners.find(partner => partner.id === account.custodian_partner_id)?.name : null
            const isShort = Number(balance.balance) < 0
            return (
              <div key={balance.account_id} className={'shrink-0 rounded-lg border px-2.5 py-1.5 min-w-[112px] ' + (isShort ? 'bg-red-400/10 border-red-200/25' : 'bg-white/10 border-white/10')}>
                <div className={'text-[9px] uppercase tracking-wide ' + (isShort ? 'text-red-200' : 'text-cream-100/45')}>{account?.kind ?? balance.kind}</div>
                <div className="text-[11px] text-cream-100/80 truncate">{balance.name}</div>
                {holder && !isShort && <div className="text-[9px] text-saffron-300 truncate">with {holder}</div>}
                {isShort ? (
                  <>
                    <div className="num text-[12px] font-bold text-red-100">{businessMoney(Math.abs(Number(balance.balance)))} source missing</div>
                    <div className="text-[8.5px] text-red-200">not a person debt</div>
                  </>
                ) : (
                  <div className="num text-[14px] font-bold">{businessMoney(balance.balance)}</div>
                )}
              </div>
            )
          })}
          {money.staffHeld > 0 && (
            <div className="shrink-0 rounded-lg bg-saffron-500/15 border border-saffron-300/20 px-2.5 py-1.5 min-w-[112px]">
              <div className="text-[9px] uppercase tracking-wide text-saffron-300">staff</div>
              <div className="text-[11px] text-cream-100/80">Business money with staff</div>
              <div className="num text-[14px] font-bold">{businessMoney(money.staffHeld)}</div>
            </div>
          )}
        </div>
      </section>

      {money.recordGap > 0 && (
        <Link to="/business/accounts" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 flex gap-2.5 items-start">
          <AlertTriangle size={17} className="text-over shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-navy-900">Some payment source is missing from the records</div>
            <div className="text-[10.5px] leading-relaxed text-navy-500 mt-0.5">
              {businessMoney(money.recordGap)} was paid from a money location before enough money was recorded there. This does <strong>not</strong> mean somebody owes the business.
            </div>
          </div>
          <ArrowRight size={14} className="text-navy-300 shrink-0 mt-1" />
        </Link>
      )}

      <section className="grid grid-cols-3 gap-1.5">
        <Metric label="Received today" value={businessMoney(today.moneyIn)} tone="green" />
        <Metric label="Paid today" value={businessMoney(today.moneyOut)} tone="red" />
        <Metric label="Today’s change" value={businessMoney(today.net)} tone={today.net >= 0 ? 'green' : 'red'} />
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        <Quick icon={ArrowDownLeft} label="Money received" onClick={() => openTransaction('income')} />
        <Quick icon={ArrowUpRight} label="Business expense" onClick={() => openTransaction('expense')} />
        <Quick icon={UserRound} label="Partner paid personally" onClick={() => openTransaction('expense', { kind: 'expense', amount: 0, paymentStatus: 'paid', paidBy: 'partner' })} />
        <Quick icon={ArrowRightLeft} label="Move business money" onClick={() => openTransaction('transfer')} />
      </section>

      {lastTransaction && (
        <button onClick={repeat} className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 flex items-center gap-2.5 text-left">
          <div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center"><RefreshCw size={16} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold text-saffron-700">DO THE LAST ENTRY AGAIN</div>
            <div className="text-[12px] font-semibold text-navy-800 truncate">{businessTransactionLabels[lastTransaction.kind]} · {businessMoney(lastTransaction.amount)}</div>
          </div>
          <ArrowRight size={15} className="text-navy-300" />
        </button>
      )}

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <h2 className="text-[14px] font-bold text-navy-900">What needs attention?</h2>
            <div className="text-[10px] text-navy-400">Prangan tells you who owes whom and what record needs fixing.</div>
          </div>
          <Badge tone={actionCount ? 'amber' : 'green'}>{actionCount || 'Clear'}</Badge>
        </div>
        <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
          {actionCount === 0 ? (
            <div className="px-4 py-4 text-center">
              <div className="text-[13px] font-semibold text-paid">Everything looks clear.</div>
              <div className="text-[11px] text-navy-400 mt-0.5">No money or record action is waiting.</div>
            </div>
          ) : (
            <>
              {negativeAccounts.map(account => (
                <ActionLink
                  key={'gap-' + account.account_id}
                  to="/business/accounts"
                  icon={AlertTriangle}
                  title={account.name + ' record is short by ' + businessMoney(Math.abs(Number(account.balance)))}
                  sub="Payment was recorded here without enough recorded money. This is a record gap, not money owed by a person."
                  tone="red"
                />
              ))}
              {openReceivables.length > 0 && <ActionLink to="/business/ledger" icon={ArrowDownLeft} title={'Customers owe the business ' + businessMoney(toCollect)} sub="Money still to collect from customers / parties" tone="saffron" />}
              {openExpenses.length > 0 && <ActionLink to="/business/ledger" icon={Clock3} title={'Business needs to pay vendors ' + businessMoney(toPay)} sub="Bills recorded but not fully paid yet" tone="amber" />}
              {partnerDue.map(position => <ActionLink key={'partner-' + position.partner_id} to="/business/partners" icon={HandCoins} title={'Business owes ' + position.name + ' ' + businessMoney(position.outstanding_due)} sub={position.name + ' used personal money or lent money to the business'} tone="saffron" />)}
              {staffDue.map(position => <ActionLink key={'staff-' + position.staff_id} to="/business/staff" icon={UserRound} title={'Business owes ' + position.name + ' ' + businessMoney(position.outstanding_due)} sub="Staff paid a business expense from personal money" tone="saffron" />)}
              {pendingReviews.length > 0 && <ActionLink to="/business/approvals" icon={CheckSquare2} title={String(pendingReviews.length) + ' expense record' + (pendingReviews.length === 1 ? '' : 's') + ' need partner review'} sub="Review the record; payment status is separate" tone="amber" />}
              {recurringDue.length > 0 && <ActionLink to="/business/recurring" icon={RefreshCw} title={String(recurringDue.length) + ' regular entr' + (recurringDue.length === 1 ? 'y is' : 'ies are') + ' due'} sub="Rent, subscription, salary or regular money entry" tone="navy" />}
              {missingProofs.length > 0 && <ActionLink to="/business/ledger" icon={Camera} title={String(missingProofs.length) + ' bill / receipt' + (missingProofs.length === 1 ? ' is' : 's are') + ' missing'} sub="Attach proof if you have it" tone="navy" />}
              {unclosedCash.length > 0 && <ActionLink to="/business/day-close" icon={WalletCards} title="Count today’s cash" sub={String(unclosedCash.length) + ' cash location' + (unclosedCash.length === 1 ? ' has' : 's have') + ' not been checked today'} tone="navy" />}
              {cashDifferences.map(closing => <ActionLink key={closing.id} to="/business/day-close" icon={AlertTriangle} title={'Cash count is ' + (Number(closing.difference) < 0 ? 'short ' : 'over ') + businessMoney(Math.abs(Number(closing.difference)))} sub="Check whether a money entry or handover was missed" tone="red" />)}
              {offlineQueueCount > 0 && (
                <button onClick={() => void syncOfflineQueue()} className="w-full min-h-[56px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0 text-left">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-pend flex items-center justify-center"><WifiOff size={15} /></div>
                  <div className="flex-1"><div className="text-[12px] font-semibold text-navy-800">{offlineQueueCount} offline entr{offlineQueueCount === 1 ? 'y' : 'ies'} waiting</div><div className="text-[10.5px] text-navy-400">Tap to sync now</div></div>
                  <ArrowRight size={14} className="text-navy-300" />
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[14px] font-bold text-navy-900">Recent activity</h2>
          <Link to="/business/ledger" className="text-[11.5px] font-semibold text-saffron-700">See all entries</Link>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {data.activity.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] text-navy-400">Activity will appear here as your team uses Business.</div>
          ) : data.activity.slice(0, 10).map(log => {
            const actor = log.actor_user_id === userId ? 'You' : data.members.find(member => member.user_id === log.actor_user_id)?.display_name || 'Team member'
            return (
              <div key={log.id} className="px-3 py-2 border-b border-cream-100 last:border-0 flex gap-2.5">
                <div className="h-8 w-8 rounded-full bg-navy-50 text-navy-600 flex items-center justify-center shrink-0"><ReceiptText size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-navy-700"><strong>{actor}</strong> {activityLabel(log.action)}</div>
                  <div className="text-[10px] text-navy-400">{new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function transactionPreset(tx: BusinessTransaction): SerializableTransactionInput {
  if (tx.kind === 'personal_expense') {
    return { kind: 'expense', amount: Number(tx.amount), partnerId: tx.partner_id, categoryId: tx.category_id, counterparty: tx.counterparty ?? '', note: tx.note ?? '', paymentStatus: 'paid', paidBy: 'partner' }
  }
  return {
    kind: tx.kind as SerializableTransactionInput['kind'],
    amount: Number(tx.amount),
    accountId: tx.account_id,
    toAccountId: tx.to_account_id,
    partnerId: tx.partner_id,
    categoryId: tx.category_id,
    counterparty: tx.counterparty ?? '',
    note: tx.note ?? '',
    paymentStatus: ['income', 'expense'].includes(tx.kind) ? (tx.payment_status === 'unpaid' ? 'unpaid' : 'paid') : undefined,
    paidBy: tx.kind === 'expense' && tx.payment_status !== 'unpaid' ? (tx.partner_id ? 'partner' : 'business') : undefined,
    dueDate: tx.due_date,
  }
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    transaction_posted: 'added a money entry',
    income_recorded: 'recorded money received',
    expense_recorded: 'recorded a business expense',
    expense_marked_paid: 'marked an expense paid',
    receivable_collected: 'recorded customer payment',
    expense_paid: 'paid an open expense',
    partner_money_settled: 'settled money with a partner',
    transaction_reversed: 'deleted / reversed an entry',
    transaction_edited: 'edited an entry',
    transaction_amount_edited: 'corrected an amount',
    partner_added: 'added a partner',
    partner_edited: 'edited a partner',
    partner_deleted: 'removed a partner',
    account_edited: 'edited a money location',
    account_deleted: 'removed a money location',
    category_added: 'added a category',
    category_edited: 'edited a category',
    category_deleted: 'removed a category',
    business_edited: 'updated Business settings',
    day_closed: 'checked cash for the day',
    day_reopened: 'reopened a cash check',
  }
  return labels[action] ?? action.replace(/_/g, ' ')
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' }) {
  return <div className="rounded-xl border border-cream-200 bg-white px-2.5 py-2"><div className="text-[9.5px] text-navy-400 font-semibold">{label}</div><div className={'num text-[13px] font-bold truncate ' + (tone === 'green' ? 'text-paid' : 'text-over')}>{value}</div></div>
}

function Quick({ icon: Icon, label, onClick }: { icon: typeof ArrowDownLeft; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="min-h-[62px] rounded-xl border border-cream-200 bg-white px-1.5 py-2 flex flex-col items-center justify-center text-center active:scale-[0.99]"><Icon size={18} className="text-saffron-700" /><div className="text-[10px] font-semibold text-navy-700 leading-tight mt-1">{label}</div></button>
}

function ActionLink({ to, icon: Icon, title, sub, tone }: { to: string; icon: typeof AlertTriangle; title: string; sub: string; tone: 'amber' | 'saffron' | 'navy' | 'red' }) {
  const classes = tone === 'red' ? 'bg-red-50 text-over' : tone === 'amber' ? 'bg-amber-50 text-pend' : tone === 'saffron' ? 'bg-saffron-50 text-saffron-700' : 'bg-navy-50 text-navy-600'
  return (
    <Link to={to} className="min-h-[56px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0 active:bg-cream-50">
      <div className={'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ' + classes}><Icon size={15} /></div>
      <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-navy-800">{title}</div><div className="text-[10.5px] text-navy-400 leading-snug">{sub}</div></div>
      <ArrowRight size={14} className="text-navy-300" />
    </Link>
  )
}
