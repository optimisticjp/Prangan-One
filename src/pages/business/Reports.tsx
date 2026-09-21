import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, Input } from '../../components/ui'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionLabels, expensePaidByLabel, summarizeTransactions } from '../../lib/business/finance'
import { exportCsv } from '../../lib/csv'

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function BusinessReports() {
  const { data } = useBusiness()
  const [month, setMonth] = useState(currentMonth())

  const monthTransactions = useMemo(
    () => data.transactions.filter(t => t.occurred_at.slice(0, 7) === month),
    [data.transactions, month],
  )
  const summary = summarizeTransactions(monthTransactions)
  const unpaidExpenses = monthTransactions.filter(t => t.kind === 'expense' && t.payment_status === 'unpaid' && !t.reversed_at)
  const unpaidAmount = unpaidExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const expenseByCategory = data.categories
    .map(c => ({
      name: c.name,
      amount: monthTransactions
        .filter(t => t.category_id === c.id && ['expense','personal_expense'].includes(t.kind) && !t.reversed_at)
        .reduce((sum, t) => sum + Number(t.amount), 0),
    }))
    .filter(x => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const downloadTransactions = () => exportCsv(
    'business-transactions-' + month + '.csv',
    ['Date','Type','Amount','Payment','Paid by','Approval','Counterparty','Category','Note','Proof'],
    monthTransactions.map(t => [
      new Date(t.occurred_at).toLocaleString('en-IN'),
      businessTransactionLabels[t.kind],
      Number(t.amount),
      t.kind === 'expense' ? t.payment_status : '',
      t.kind === 'expense' ? expensePaidByLabel(t, data.accounts, data.partners) ?? '' : '',
      t.approval_status,
      t.counterparty ?? '',
      data.categories.find(c => c.id === t.category_id)?.name ?? '',
      t.note ?? '',
      data.attachments.some(a => a.transaction_id === t.id) ? 'Attached' : '',
    ]),
  )

  const downloadCaPack = () => {
    const rows: Array<Array<string | number>> = []

    for (const account of data.accountBalances) {
      rows.push(['ACCOUNT', account.name, account.kind, Number(account.balance), '', '', '', ''])
    }
    for (const partner of data.partnerPositions) {
      rows.push(['PARTNER', partner.name, 'Outstanding due', Number(partner.outstanding_due), 'Capital ' + String(partner.capital), 'Withdrawn ' + String(partner.withdrawals), '', ''])
    }
    for (const tx of monthTransactions) {
      rows.push([
        'TRANSACTION',
        new Date(tx.occurred_at).toLocaleString('en-IN'),
        businessTransactionLabels[tx.kind],
        Number(tx.amount),
        tx.kind === 'expense' ? tx.payment_status : '',
        tx.kind === 'expense' ? expensePaidByLabel(tx, data.accounts, data.partners) ?? '' : '',
        data.categories.find(c => c.id === tx.category_id)?.name ?? '',
        data.attachments.some(a => a.transaction_id === tx.id) ? 'Proof attached' : 'No proof',
      ])
    }
    for (const closing of data.closings.filter(c => c.close_date.slice(0, 7) === month)) {
      rows.push([
        'DAY CLOSE',
        closing.close_date,
        data.accounts.find(a => a.id === closing.account_id)?.name ?? 'Cash',
        Number(closing.counted_balance),
        'Expected ' + String(closing.expected_balance),
        'Difference ' + String(closing.difference),
        closing.note ?? '',
        '',
      ])
    }

    exportCsv(
      'prangan-ca-pack-' + month + '.csv',
      ['Section','Date / Name','Type / Detail','Amount / Balance','Status 1','Status 2','Category / Note','Proof'],
      rows,
    )
  }

  return (
    <div className="space-y-3 print:bg-white">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-bold text-navy-900">Reports</h1>
          <p className="text-[11px] text-navy-400">Simple monthly numbers for partners and your CA.</p>
        </div>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="!w-[145px] !min-h-[36px] !text-[11px]" />
      </div>

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Button variant="soft" className="!min-h-[38px] !text-[11px]" onClick={downloadTransactions}><Download size={14} /> Transactions</Button>
        <Button variant="soft" className="!min-h-[38px] !text-[11px]" onClick={downloadCaPack}><FileSpreadsheet size={14} /> CA Pack</Button>
      </div>
      <Button variant="soft" full className="print:hidden !min-h-[38px] !text-[11px]" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</Button>

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
            <div className="p-6 text-center text-[12.5px] text-navy-400">No categorized expenses in this month.</div>
          ) : expenseByCategory.map(item => (
            <div key={item.name} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2">
              <div className="flex-1 text-[12px] font-semibold text-navy-700 truncate">{item.name}</div>
              <div className="num text-[12.5px] font-bold">{businessMoney(item.amount)}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Partner settlement position</h2>
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
