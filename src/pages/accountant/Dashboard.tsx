import { useState } from 'react'
import { IndianRupee, Wallet, TrendingUp, AlertTriangle } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, fmtMonth, inr, lastMonths, thisMonth } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { HBars } from '../../components/charts'
import { Card, PageHeader, Select, StatCard, TableWrap, td, th, SectionTitle } from '../../components/ui'
import type { PayMode } from '../../lib/types'

export default function Dashboard() {
  const { db, flatById, monthIncome, monthExpense, totalPending } = useData()
  const [month, setMonth] = useState(thisMonth())

  const income = monthIncome(month)
  const expense = monthExpense(month)
  const modeRows = (Object.keys(payModeLabel) as PayMode[]).map(m => ({
    label: payModeLabel[m],
    value: db.payments.filter(p => p.status === 'success' && p.date.startsWith(month) && p.mode === m).reduce((s, p) => s + p.amount, 0),
  })).filter(x => x.value > 0)

  const recent = db.payments.filter(p => p.status === 'success' && p.date.startsWith(month)).slice(0, 12)

  return (
    <div>
      <PageHeader title="હિસાબ ડેશબોર્ડ" sub="આવક, ખર્ચ અને ચુકવણીનો રેકોર્ડ"
        actions={<Select value={month} onChange={e => setMonth(e.target.value)} className="!w-44">{lastMonths(6).map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}</Select>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="આવક" value={inr(income)} tone="green" icon={<IndianRupee size={19} />} />
        <StatCard label="ખર્ચ" value={inr(expense)} icon={<Wallet size={19} />} />
        <StatCard label="બચત" value={inr(income - expense)} tone="saffron" icon={<TrendingUp size={19} />} />
        <StatCard label="કુલ બાકી (બધા મહિના)" value={inr(totalPending())} tone={totalPending() > 0 ? 'red' : 'green'} icon={<AlertTriangle size={19} />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-2">
        <div className="lg:col-span-2">
          <SectionTitle>{fmtMonth(month)} ની ચુકવણી</SectionTitle>
          <TableWrap>
            <thead><tr><th className={th}>રસીદ</th><th className={th}>તારીખ</th><th className={th}>ફ્લેટ</th><th className={th}>રકમ</th><th className={th}>પ્રકાર</th></tr></thead>
            <tbody>
              {recent.map(p => {
                const f = flatById(p.flatId)
                return (
                  <tr key={p.id} className="hover:bg-cream-50">
                    <td className={`${td} num`}>{p.receiptNo}</td>
                    <td className={td}>{fmtDate(p.date)}</td>
                    <td className={td}><b className="num">{f?.number}</b> <span className="text-navy-400 text-[13px]">{f?.ownerName}</span></td>
                    <td className={`${td} num font-bold`}>{inr(p.amount)}</td>
                    <td className={td}>{payModeLabel[p.mode]}</td>
                  </tr>
                )
              })}
              {recent.length === 0 && <tr><td className={td} colSpan={5}>આ મહિને હજુ કોઈ ચુકવણી નથી.</td></tr>}
            </tbody>
          </TableWrap>
        </div>
        <div>
          <SectionTitle>ચુકવણી પ્રકાર પ્રમાણે</SectionTitle>
          <Card><HBars items={modeRows} /></Card>
        </div>
      </div>
    </div>
  )
}
