import { Download } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtMonth, inr, lastMonths, thisMonth } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { exportCsv } from '../../lib/csv'
import { HBars, PairBars } from '../../components/charts'
import { Button, Card, PageHeader, SectionTitle, StatCard } from '../../components/ui'
import type { PayMode } from '../../lib/types'

export default function Reports() {
  const { db, flatById, flatPending, monthIncome, monthExpense } = useData()
  const months = lastMonths(4)
  const income = months.map(monthIncome)
  const expense = months.map(monthExpense)
  const cur = thisMonth()

  const catRows = (() => {
    const m = new Map<string, number>()
    db.expenses.filter(e => e.date.startsWith(cur)).forEach(e => m.set(e.category, (m.get(e.category) ?? 0) + e.amount))
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  })()
  const vendorRows = (() => {
    const m = new Map<string, number>()
    db.expenses.forEach(e => { if (e.vendorId) { const n = db.vendors.find(v => v.id === e.vendorId)?.name ?? '-'; m.set(n, (m.get(n) ?? 0) + e.amount) } })
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6)
  })()

  const csvPayments = () => exportCsv('audit-payments.csv',
    ['રસીદ નં', 'તારીખ', 'ફ્લેટ', 'નામ', 'રકમ', 'પ્રકાર', 'રેફરન્સ', 'સ્થિતિ'],
    db.payments.map(p => { const f = flatById(p.flatId); return [p.receiptNo ?? '', p.date, f?.number, f?.ownerName, p.amount, payModeLabel[p.mode], p.refNo ?? '', p.status === 'success' ? 'સફળ' : 'નિષ્ફળ'] }))
  const csvExpenses = () => exportCsv('audit-expenses.csv',
    ['તારીખ', 'કેટેગરી', 'વેન્ડર', 'રકમ', 'પ્રકાર', 'નોંધ'],
    db.expenses.map(e => [e.date, e.category, db.vendors.find(v => v.id === e.vendorId)?.name ?? '', e.amount, payModeLabel[e.mode], e.note ?? '']))
  const csvMonthly = () => exportCsv('monthly-summary.csv',
    ['મહિનો', 'આવક', 'ખર્ચ', 'બચત'],
    lastMonths(6).map(m => [fmtMonth(m), monthIncome(m), monthExpense(m), monthIncome(m) - monthExpense(m)]))
  const csvDues = () => exportCsv('audit-dues.csv',
    ['ફ્લેટ', 'નામ', 'બાકી રકમ'],
    // flatPending(), same reasoning as admin/Reports.tsx's csvDues - this
    // used to recompute pending from bills alone, ignoring adjustments,
    // and could disagree with the same flat's number shown on screen.
    db.flats.map(f => { const pend = flatPending(f.id); return [f.number, f.ownerName, pend] }).filter(r => Number(r[2]) > 0))

  return (
    <div>
      <PageHeader title="રિપોર્ટ અને ઓડિટ" sub="ઓડિટ માટે તૈયાર એક્સપોર્ટ અને માસિક હિસાબ" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={`${fmtMonth(cur)} આવક`} value={inr(income[income.length - 1] ?? 0)} tone="green" />
        <StatCard label={`${fmtMonth(cur)} ખર્ચ`} value={inr(expense[expense.length - 1] ?? 0)} />
        <StatCard label="બચત" value={inr((income[income.length - 1] ?? 0) - (expense[expense.length - 1] ?? 0))} tone="saffron" />
        <StatCard label="કુલ ચુકવણી એન્ટ્રી" value={String(db.payments.length)} tone="navy" />
      </div>

      <Card className="mt-3">
        <h2 className="font-bold text-navy-800 mb-1">ઓડિટ એક્સપોર્ટ</h2>
        <p className="text-[13px] text-navy-400 mb-3">બધી ફાઈલ Excel-સુસંગત CSV (ગુજરાતી બરાબર ખૂલશે).</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={csvPayments}><Download size={16} /> ચુકવણી</Button>
          <Button variant="soft" onClick={csvExpenses}><Download size={16} /> ખર્ચ</Button>
          <Button variant="soft" onClick={csvMonthly}><Download size={16} /> માસિક સારાંશ</Button>
          <Button variant="soft" onClick={csvDues}><Download size={16} /> બાકી યાદી</Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mt-2">
        <div>
          <SectionTitle>આવક અને ખર્ચ (4 મહિના)</SectionTitle>
          <Card><PairBars labels={months.map(fmtMonth)} a={income} b={expense} aLabel="આવક" bLabel="ખર્ચ" /></Card>
        </div>
        <div>
          <SectionTitle>{fmtMonth(cur)} ખર્ચ કેટેગરી પ્રમાણે</SectionTitle>
          <Card><HBars items={catRows} /></Card>
        </div>
        <div>
          <SectionTitle>વેન્ડર પ્રમાણે ચુકવણી</SectionTitle>
          <Card><HBars items={vendorRows} /></Card>
        </div>
      </div>
    </div>
  )
}
