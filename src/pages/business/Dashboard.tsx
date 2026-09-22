import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight,
  Camera, CheckSquare2, Clock3, HandCoins, ReceiptText, RefreshCw, UserRound, WalletCards, WifiOff,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { useBusinessLanguage } from '../../lib/business/i18n'
import {
  businessMoney, businessTransactionLabels, summarizeTransactions, todayBusinessISO,
} from '../../lib/business/finance'
import type { SerializableTransactionInput } from '../../lib/business/preferences'
import type { BusinessTransaction } from '../../lib/business/types'
import type { BusinessOutletContext } from '../../components/business/BusinessLayout'
import BusinessStaffHome from './StaffHome'

export default function BusinessDashboard() {
  const { data, userId, offlineQueueCount, syncOfflineQueue, isStaff } = useBusiness()
  const { openTransaction } = useOutletContext<BusinessOutletContext>()
  const { t } = useBusinessLanguage()

  if (isStaff) return <BusinessStaffHome />

  const todayKey = todayBusinessISO()
  const today = summarizeTransactions(data.transactions, todayKey)
  const activeBalances = data.accountBalances.filter(b => data.accounts.find(a => a.id === b.account_id)?.active !== false)
  const totalBalance = activeBalances.reduce((sum, a) => sum + Number(a.balance), 0)
  const pendingApprovals = data.transactions.filter(tx => tx.approval_status === 'pending' && !tx.reversed_at)
  const unpaidExpenses = data.transactions.filter(tx => tx.kind === 'expense' && tx.payment_status === 'unpaid' && !tx.reversed_at)
  const unpaidAmount = unpaidExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0)
  const dueToPartners = data.partnerPositions.reduce((sum, p) => sum + Number(p.outstanding_due), 0)
  const attachmentIds = new Set(data.attachments.map(a => a.transaction_id))
  const missingProofs = data.transactions.filter(tx =>
    ['expense','refund'].includes(tx.kind) && !tx.reversed_at && !attachmentIds.has(tx.id),
  )
  const cashAccounts = activeBalances.filter(a => a.kind === 'cash')
  const todayClosings = data.closings.filter(c => c.close_date === todayKey)
  const unclosedCash = cashAccounts.filter(a => !todayClosings.some(c => c.account_id === a.account_id))
  const cashDifferences = todayClosings.filter(c => Math.abs(Number(c.difference)) > 0.005)
  const lastTransaction = data.transactions.find(tx => tx.kind !== 'reversal' && !tx.reversed_at)

  const repeat = () => {
    if (!lastTransaction) return
    const preset = transactionPreset(lastTransaction)
    openTransaction(preset.kind as Exclude<BusinessTransaction['kind'], 'reversal' | 'personal_expense'>, preset)
  }

  const actionCount =
    (pendingApprovals.length ? 1 : 0)
    + (unpaidExpenses.length ? 1 : 0)
    + (dueToPartners > 0 ? 1 : 0)
    + (missingProofs.length ? 1 : 0)
    + (unclosedCash.length ? 1 : 0)
    + (cashDifferences.length ? 1 : 0)
    + (offlineQueueCount ? 1 : 0)

  return (
    <div className="space-y-2.5">
      <section className="rounded-xl bg-navy-900 text-cream-50 px-3.5 py-3 shadow-soft">
        <div className="text-[10.5px] text-cream-100/60 font-semibold uppercase tracking-wide">{t('totalFunds')}</div>
        <div className="num text-[25px] font-bold leading-tight mt-0.5">{businessMoney(totalBalance)}</div>
        <div className="dense-scroll mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {activeBalances.map(a => (
            <div key={a.account_id} className="shrink-0 rounded-lg bg-white/10 border border-white/10 px-2.5 py-1.5 min-w-[104px]">
              <div className="text-[9.5px] uppercase tracking-wide text-cream-100/45">{a.kind}</div>
              <div className="text-[11px] text-cream-100/75 truncate">{a.name}</div>
              <div className="num text-[14px] font-bold">{businessMoney(a.balance)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1.5">
        <Metric label={t('todayIn')} value={businessMoney(today.moneyIn)} tone="green" />
        <Metric label={t('todayOut')} value={businessMoney(today.moneyOut)} tone="red" />
        <Metric label={t('net')} value={businessMoney(today.net)} tone={today.net >= 0 ? 'green' : 'red'} />
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        <Quick icon={ArrowDownLeft} label={t('moneyIn')} tag="RECEIVE" onClick={() => openTransaction('income')} />
        <Quick icon={ArrowUpRight} label={t('expense')} tag="EXPENSE" onClick={() => openTransaction('expense')} />
        <Quick icon={UserRound} label={t('partnerPaid')} tag="PARTNER" onClick={() => openTransaction('expense', { kind: 'expense', amount: 0, paymentStatus: 'paid', paidBy: 'partner' })} />
        <Quick icon={ArrowRightLeft} label={t('transfer')} tag="MOVE" onClick={() => openTransaction('transfer')} />
      </section>

      {lastTransaction && (
        <button onClick={repeat} className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2 flex items-center gap-2.5 text-left">
          <div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center"><RefreshCw size={16} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[9.5px] font-bold text-saffron-700">REPEAT LAST</div>
            <div className="text-[12px] font-semibold text-navy-800 truncate">
              {businessTransactionLabels[lastTransaction.kind]} · {businessMoney(lastTransaction.amount)}
            </div>
          </div>
          <ArrowRight size={15} className="text-navy-300" />
        </button>
      )}

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[14px] font-bold text-navy-900">{t('needsYou')}</h2>
          <Badge tone={actionCount ? 'amber' : 'green'}>{actionCount || 'Clear'}</Badge>
        </div>
        <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
          {actionCount === 0 ? (
            <div className="px-4 py-4 text-center">
              <div className="text-[13px] font-semibold text-paid">Nothing needs attention.</div>
              <div className="text-[11px] text-navy-400 mt-0.5">Money book is tidy for now.</div>
            </div>
          ) : (
            <>
              {pendingApprovals.length > 0 && <ActionLink to="/business/approvals" icon={CheckSquare2} title={String(pendingApprovals.length) + ' approval' + (pendingApprovals.length === 1 ? '' : 's') + ' waiting'} sub="Review partner/business expenses" tone="amber" />}
              {unpaidExpenses.length > 0 && <ActionLink to="/business/ledger" icon={Clock3} title={businessMoney(unpaidAmount) + ' unpaid'} sub={String(unpaidExpenses.length) + ' expense' + (unpaidExpenses.length === 1 ? '' : 's') + ' recorded, not paid'} tone="amber" />}
              {dueToPartners > 0 && <ActionLink to="/business/partners" icon={HandCoins} title={'Pay partners ' + businessMoney(dueToPartners)} sub="Settle personal-paid expenses / advances" tone="saffron" />}
              {missingProofs.length > 0 && <ActionLink to="/business/ledger" icon={Camera} title={String(missingProofs.length) + ' proof' + (missingProofs.length === 1 ? '' : 's') + ' missing'} sub="Attach bills or receipts to keep records complete" tone="navy" />}
              {unclosedCash.length > 0 && <ActionLink to="/business/day-close" icon={WalletCards} title="Close today’s cash" sub={String(unclosedCash.length) + ' cash account' + (unclosedCash.length === 1 ? '' : 's') + ' still open'} tone="navy" />}
              {cashDifferences.map(c => (
                <ActionLink key={c.id} to="/business/day-close" icon={AlertTriangle} title={'Cash ' + (Number(c.difference) < 0 ? 'short ' : 'over ') + businessMoney(Math.abs(Number(c.difference)))} sub="Review today’s cash closing difference" tone="red" />
              ))}
              {offlineQueueCount > 0 && (
                <button onClick={() => void syncOfflineQueue()} className="w-full min-h-[56px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0 text-left">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-pend flex items-center justify-center"><WifiOff size={15} /></div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-navy-800">{String(offlineQueueCount) + ' offline entr' + (offlineQueueCount === 1 ? 'y' : 'ies') + ' waiting'}</div>
                    <div className="text-[10.5px] text-navy-400">Tap to sync now</div>
                  </div>
                  <ArrowRight size={14} className="text-navy-300" />
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[14px] font-bold text-navy-900">{t('recent')}</h2>
          <Link to="/business/ledger" className="text-[11.5px] font-semibold text-saffron-700">Ledger</Link>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {data.activity.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] text-navy-400">Activity will appear here as the team uses the money book.</div>
          ) : data.activity.slice(0, 10).map(log => {
            const actor = log.actor_user_id === userId
              ? 'You'
              : data.members.find(m => m.user_id === log.actor_user_id)?.display_name || 'Team member'
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
    return {
      kind: 'expense',
      amount: Number(tx.amount),
      partnerId: tx.partner_id,
      categoryId: tx.category_id,
      counterparty: tx.counterparty ?? '',
      note: tx.note ?? '',
      paymentStatus: 'paid',
      paidBy: 'partner',
    }
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
    paymentStatus: tx.kind === 'expense' ? tx.payment_status : undefined,
    paidBy: tx.kind === 'expense' && tx.payment_status === 'paid' ? (tx.partner_id ? 'partner' : 'business') : undefined,
    dueDate: tx.due_date,
  }
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    transaction_posted: 'added a transaction',
    expense_recorded: 'recorded an expense',
    expense_marked_paid: 'marked an expense paid',
    transaction_reversed: 'deleted / reversed a transaction',
    transaction_edited: 'edited transaction details',
    transaction_amount_edited: 'corrected a transaction amount',
    partner_added: 'added a partner',
    partner_edited: 'edited a partner',
    partner_deleted: 'removed a partner',
    account_edited: 'edited a money account',
    account_deleted: 'removed a money account',
    category_added: 'added a category',
    category_edited: 'edited a category',
    category_deleted: 'removed a category',
    business_edited: 'updated Business settings',
    day_closed: 'closed cash for the day',
    day_reopened: 'reopened a cash closing',
  }
  return labels[action] ?? action.replace(/_/g, ' ')
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-2.5 py-2">
      <div className="text-[9.5px] text-navy-400 font-semibold">{label}</div>
      <div className={'num text-[13px] font-bold truncate ' + (tone === 'green' ? 'text-paid' : 'text-over')}>{value}</div>
    </div>
  )
}

function Quick({ icon: Icon, label, tag, onClick }: { icon: typeof ArrowDownLeft; label: string; tag: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-[58px] rounded-xl border border-cream-200 bg-white px-1.5 py-1.5 flex flex-col items-center justify-center text-center active:scale-[0.99]">
      <Icon size={18} className="text-saffron-700" />
      <div className="text-[8.5px] font-bold text-saffron-700 tracking-wide mt-0.5">{tag}</div>
      <div className="text-[10px] font-semibold text-navy-700 leading-tight">{label}</div>
    </button>
  )
}

function ActionLink({
  to, icon: Icon, title, sub, tone,
}: {
  to: string
  icon: typeof AlertTriangle
  title: string
  sub: string
  tone: 'amber' | 'saffron' | 'navy' | 'red'
}) {
  const classes = tone === 'red'
    ? 'bg-red-50 text-over'
    : tone === 'amber'
      ? 'bg-amber-50 text-pend'
      : tone === 'saffron'
        ? 'bg-saffron-50 text-saffron-700'
        : 'bg-navy-50 text-navy-600'
  return (
    <Link to={to} className="min-h-[52px] px-3 py-1.5 flex items-center gap-2.5 border-b border-cream-100 last:border-0 active:bg-cream-50">
      <div className={'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ' + classes}><Icon size={15} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-navy-800">{title}</div>
        <div className="text-[10.5px] text-navy-400 truncate">{sub}</div>
      </div>
      <ArrowRight size={14} className="text-navy-300" />
    </Link>
  )
}
