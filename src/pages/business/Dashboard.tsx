import { ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, HandCoins, ReceiptText } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Badge } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionHelp, businessTransactionLabels, summarizeTransactions, todayBusinessISO, transactionCashDirection } from '../../lib/business/finance'
import type { BusinessOutletContext } from '../../components/business/BusinessLayout'

export default function BusinessDashboard() {
  const { data } = useBusiness()
  const { openTransaction } = useOutletContext<BusinessOutletContext>()
  const today = summarizeTransactions(data.transactions, todayBusinessISO())
  const totalBalance = data.accountBalances.reduce((sum, a) => sum + Number(a.balance), 0)
  const pendingApprovals = data.transactions.filter(t => t.approval_status === 'pending' && !t.reversed_at).length
  const unpaidExpenses = data.transactions.filter(t => t.kind === 'expense' && t.payment_status === 'unpaid' && !t.reversed_at)
  const unpaidAmount = unpaidExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const dueToPartners = data.partnerPositions.reduce((sum, p) => sum + Number(p.outstanding_due), 0)

  return (
    <div className="space-y-3">
      <section className="rounded-2xl bg-navy-900 text-cream-50 px-4 py-3.5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-cream-100/60 font-semibold uppercase tracking-wide">Total business funds</div>
            <div className="num text-[27px] font-bold leading-tight mt-0.5">{businessMoney(totalBalance)}</div>
          </div>
          {pendingApprovals > 0 && <Link to="/business/approvals"><Badge tone="amber">{pendingApprovals} approval{pendingApprovals === 1 ? '' : 's'}</Badge></Link>}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {data.accountBalances.map(a => (
            <div key={a.account_id} className="shrink-0 rounded-xl bg-white/10 border border-white/10 px-3 py-2 min-w-[112px]">
              <div className="text-[10.5px] text-cream-100/55 truncate">{a.name}</div>
              <div className="num text-[14px] font-bold">{businessMoney(a.balance)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1.5">
        <Metric label="Today in" value={businessMoney(today.moneyIn)} tone="green" />
        <Metric label="Today out" value={businessMoney(today.moneyOut)} tone="red" />
        <Metric label="Net cash" value={businessMoney(today.net)} tone={today.net >= 0 ? 'green' : 'red'} />
      </section>

      {unpaidExpenses.length > 0 && (
        <Link to="/business/ledger" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <div>
            <div className="text-[10px] font-bold text-pend tracking-wide">UNPAID EXPENSES · {unpaidExpenses.length}</div>
            <div className="num text-[17px] font-bold text-navy-900">{businessMoney(unpaidAmount)}</div>
            <div className="text-[10.5px] text-navy-500">Recorded, but no Cash/Bank/partner balance has moved yet.</div>
          </div>
          <ArrowRight size={17} className="text-pend shrink-0" />
        </Link>
      )}

      <section className="grid grid-cols-2 gap-1.5">
        <Quick icon={ArrowDownLeft} label="Money in" tag={businessTransactionHelp.income.tag} help="Receive into Cash / Bank" onClick={() => openTransaction('income')} />
        <Quick icon={ArrowUpRight} label="Expense" tag={businessTransactionHelp.expense.tag} help="Paid now or pay later" onClick={() => openTransaction('expense')} />
        <Quick icon={HandCoins} label="Partner capital" tag={businessTransactionHelp.partner_capital.tag} help="Long-term contribution" onClick={() => openTransaction('partner_capital')} />
        <Quick icon={ArrowRightLeft} label="Transfer" tag={businessTransactionHelp.transfer.tag} help="Move between accounts" onClick={() => openTransaction('transfer')} />
      </section>

      {dueToPartners > 0 && (
        <Link to="/business/partners" className="flex items-center justify-between rounded-xl border border-saffron-200 bg-saffron-50 px-3 py-2.5">
          <div>
            <div className="text-[11px] text-saffron-700 font-semibold">Business owes partners</div>
            <div className="num text-[17px] font-bold text-navy-900">{businessMoney(dueToPartners)}</div>
          </div>
          <ArrowRight size={17} className="text-saffron-700" />
        </Link>
      )}

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[14px] font-bold text-navy-900">Recent activity</h2>
          <Link to="/business/ledger" className="text-[11.5px] font-semibold text-saffron-700">View all</Link>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {data.transactions.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-navy-400">No transactions yet. Add your first money movement.</div>
          ) : data.transactions.slice(0, 8).map(tx => {
            const direction = transactionCashDirection(tx)
            return (
              <div key={tx.id} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-cream-100 last:border-0">
                <div className={'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ' + (direction === 'in' ? 'bg-green-50 text-paid' : direction === 'out' ? 'bg-red-50 text-over' : 'bg-navy-50 text-navy-500')}>
                  <ReceiptText size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold text-navy-800 truncate">{businessTransactionLabels[tx.kind]}</span>
                    {tx.kind === 'expense' && tx.payment_status === 'unpaid' && <Badge tone="amber">UNPAID</Badge>}
                  </div>
                  <div className="text-[10.5px] text-navy-400 truncate">{tx.counterparty || tx.note || new Date(tx.occurred_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className={'num text-[13px] font-bold ' + (direction === 'in' ? 'text-paid' : direction === 'out' ? 'text-over' : 'text-navy-700')}>
                  {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}{businessMoney(tx.amount)}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-2.5 py-2">
      <div className="text-[10px] text-navy-400 font-semibold">{label}</div>
      <div className={'num text-[13px] font-bold truncate ' + (tone === 'green' ? 'text-paid' : 'text-over')}>{value}</div>
    </div>
  )
}

function Quick({ icon: Icon, label, tag, help, onClick }: { icon: typeof ArrowDownLeft; label: string; tag: string; help: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-[68px] rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-left flex items-center gap-2.5 active:scale-[0.99]">
      <div className="h-9 w-9 rounded-xl bg-saffron-50 text-saffron-700 flex items-center justify-center shrink-0"><Icon size={18} /></div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold text-saffron-700 tracking-wide">{tag}</div>
        <div className="text-[11.5px] font-bold text-navy-800">{label}</div>
        <div className="text-[10px] text-navy-400 truncate">{help}</div>
      </div>
    </button>
  )
}
