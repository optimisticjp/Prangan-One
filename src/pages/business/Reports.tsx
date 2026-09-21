import { Download } from 'lucide-react'
import { Button } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionLabels, expensePaidByLabel, summarizeTransactions } from '../../lib/business/finance'
import { exportCsv } from '../../lib/csv'

export default function BusinessReports() {
  const { data } = useBusiness()
  const summary = summarizeTransactions(data.transactions)
  const unpaidExpenses = data.transactions.filter(t => t.kind === 'expense' && t.payment_status === 'unpaid' && !t.reversed_at)
  const unpaidAmount = unpaidExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const expenseByCategory = data.categories
    .map(c => ({
      name: c.name,
      amount: data.transactions
        .filter(t => t.category_id === c.id && ['expense','personal_expense'].includes(t.kind) && !t.reversed_at)
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter(x => x.amount > 0)
    .sort((a,b) => b.amount-a.amount)

  const download = () => exportCsv(
    'business-transactions.csv',
    ['Date','Type','Amount','Payment','Paid by','Approval','Counterparty','Note'],
    data.transactions.map(t => [
      new Date(t.occurred_at).toLocaleString('en-IN'),
      businessTransactionLabels[t.kind],
      Number(t.amount),
      t.kind === 'expense' ? t.payment_status : '',
      t.kind === 'expense' ? expensePaidByLabel(t, data.accounts, data.partners) ?? '' : '',
      t.approval_status,
      t.counterparty ?? '',
      t.note ?? '',
    ]),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-bold text-navy-900">Reports</h1>
        <Button variant="soft" className="!min-h-[36px] !px-3 !text-[11px]" onClick={download}><Download size={14} /> CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Metric label="Money in" value={summary.moneyIn} />
        <Metric label="Money out" value={summary.moneyOut} />
        <Metric label="Net cash movement" value={summary.net} />
        <Metric label="Partner paid" value={summary.personalPaid} />
        <Metric label="Unpaid expenses" value={unpaidAmount} />
      </div>

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Expense breakdown</h2>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {expenseByCategory.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-navy-400">No categorized expenses yet.</div>
          ) : expenseByCategory.map(item => (
            <div key={item.name} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2">
              <div className="flex-1 text-[12px] font-semibold text-navy-700 truncate">{item.name}</div>
              <div className="num text-[12.5px] font-bold">{businessMoney(item.amount)}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Partner position</h2>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {data.partnerPositions.map(p => (
            <div key={p.partner_id} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 border-b border-cream-100 last:border-0">
              <div>
                <div className="text-[12px] font-semibold text-navy-800">{p.name}</div>
                <div className="text-[10.5px] text-navy-400">Capital {businessMoney(p.capital)} · Withdrawn {businessMoney(p.withdrawals)}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-navy-400">OWED TO PARTNER</div>
                <div className="num text-[12.5px] font-bold text-pend">{businessMoney(p.outstanding_due)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-3 py-2.5">
      <div className="text-[10px] text-navy-400 font-semibold">{label}</div>
      <div className="num text-[15px] font-bold text-navy-900">{businessMoney(value)}</div>
    </div>
  )
}
