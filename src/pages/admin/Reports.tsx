import { Download } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtMonth, inr, lastMonths, thisMonth } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { exportCsv } from '../../lib/csv'
import { HBars, PairBars } from '../../components/charts'
import { Card, PageHeader, Progress, SectionTitle, StatCard, Button } from '../../components/ui'

export default function Reports() {
  const { db, flatById, flatPending, monthIncome, monthExpense } = useData()
  const months = lastMonths(4)
  const income = months.map(monthIncome)
  const expense = months.map(monthExpense)

  const cur = thisMonth()
  const curBills = db.bills.filter(b => b.month === cur)
  const billed = curBills.reduce((s, b) => s + b.amount, 0)
  const collected = curBills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
  const rate = billed ? Math.round((collected / billed) * 100) : 0

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

  const csvMonthly = () => exportCsv('monthly-summary.csv',
    ['મહિનો', 'આવક', 'ખર્ચ', 'બચત'],
    lastMonths(6).map(m => [fmtMonth(m), monthIncome(m), monthExpense(m), monthIncome(m) - monthExpense(m)]))
  const csvDues = () => exportCsv('dues.csv',
    ['ફ્લેટ', 'નામ', 'ફોન', 'બાકી રકમ'],
    db.flats.map(f => {
      // flatPending(), not a re-derived sum of unpaid bills - that
      // duplicate calculation used to live here and quietly ignored
      // adjustments, so this export could disagree with what the screen
      // itself showed for the same flat. One canonical number, used
      // everywhere pending gets shown or exported.
      const pend = flatPending(f.id)
      return [f.number, f.ownerName, f.phone, pend]
    }).filter(r => Number(r[3]) > 0))

  return (
    <div>
      <PageHeader title="રિપોર્ટ" sub="આવક-ખર્ચ, કલેક્શન અને ખર્ચનું વિશ્લેષણ"
        actions={<>
          <Button variant="soft" onClick={csvMonthly}><Download size={16} /> માસિક CSV</Button>
          <Button variant="soft" onClick={csvDues}><Download size={16} /> બાકી CSV</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={`${fmtMonth(cur)} આવક`} value={inr(income[income.length - 1] ?? 0)} tone="green" />
        <StatCard label={`${fmtMonth(cur)} ખર્ચ`} value={inr(expense[expense.length - 1] ?? 0)} />
        <StatCard label="આ મહિનાની બચત" value={inr((income[income.length - 1] ?? 0) - (expense[expense.length - 1] ?? 0))} tone="saffron" />
        <StatCard label="કલેક્શન રેટ" value={`${rate}%`} tone={rate >= 80 ? 'green' : 'amber'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-2">
        <div>
          <SectionTitle>આવક અને ખર્ચ (છેલ્લા 4 મહિના)</SectionTitle>
          <Card><PairBars labels={months.map(fmtMonth)} a={income} b={expense} aLabel="આવક" bLabel="ખર્ચ" /></Card>

          <SectionTitle>{fmtMonth(cur)} કલેક્શન</SectionTitle>
          <Card>
            <div className="flex items-center gap-3">
              <Progress value={rate} tone={rate >= 80 ? 'green' : 'saffron'} />
              <span className="num font-bold text-navy-800 shrink-0">{rate}%</span>
            </div>
            <div className="text-[13px] text-navy-400 mt-2">₹{collected.toLocaleString('en-IN')} વસૂલ થયા, કુલ બિલ ₹{billed.toLocaleString('en-IN')}</div>
          </Card>
        </div>

        <div>
          <SectionTitle>{fmtMonth(cur)} ખર્ચ, કેટેગરી પ્રમાણે</SectionTitle>
          <Card><HBars items={catRows} /></Card>

          <SectionTitle>વેન્ડર પ્રમાણે ચુકવણી (કુલ)</SectionTitle>
          <Card><HBars items={vendorRows} /></Card>
        </div>
      </div>
    </div>
  )
}
