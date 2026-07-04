import { useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, fmtMonth, inr, lastMonths, thisMonth, todayISO } from '../../lib/format'
import { expenseCategories, payModeLabel } from '../../lib/copy'
import { exportCsv } from '../../lib/csv'
import { HBars } from '../../components/charts'
import { Button, Card, Field, Input, PageHeader, SectionTitle, Select, TableWrap, td, th } from '../../components/ui'
import type { PayMode } from '../../lib/types'

export default function Expenses() {
  const { db, addExpense } = useData()
  const [month, setMonth] = useState(thisMonth())
  const [form, setForm] = useState({ date: todayISO(), category: expenseCategories[0], vendorId: '', amount: '', mode: 'bank' as PayMode, note: '', billFile: '' })

  const list = db.expenses.filter(e => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const total = list.reduce((s, e) => s + e.amount, 0)
  const byCat = expenseCategories
    .map(c => ({ label: c, value: list.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
  const vendorName = (id?: string) => db.vendors.find(v => v.id === id)?.name ?? '-'

  const submit = () => {
    const amt = Number(form.amount)
    if (!amt || amt <= 0) return
    addExpense({ date: form.date, category: form.category, vendorId: form.vendorId || undefined, amount: amt, mode: form.mode, note: form.note.trim() || undefined, billFile: form.billFile || undefined })
    setForm({ ...form, amount: '', note: '', billFile: '' })
  }

  const csv = () => exportCsv(`expenses-${month}.csv`,
    ['તારીખ', 'કેટેગરી', 'વેન્ડર', 'રકમ', 'પ્રકાર', 'નોંધ'],
    list.map(e => [e.date, e.category, vendorName(e.vendorId), e.amount, payModeLabel[e.mode], e.note ?? '']))

  return (
    <div>
      <PageHeader title="ખર્ચ" sub="સોસાયટીનો દરેક ખર્ચ પારદર્શક રીતે નોંધો"
        actions={<Button variant="soft" onClick={csv}><Download size={16} /> CSV</Button>} />

      <Card className="animate-fadeUp">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="તારીખ"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="કેટેગરી">
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {expenseCategories.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="વેન્ડર (વૈકલ્પિક)">
            <Select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}>
              <option value="">કોઈ નહીં</option>
              {db.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="રકમ (₹)"><Input type="number" inputMode="numeric" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="ચુકવણી પ્રકાર">
            <Select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as PayMode })}>
              {(Object.keys(payModeLabel) as PayMode[]).map(m => <option key={m} value={m}>{payModeLabel[m]}</option>)}
            </Select>
          </Field>
          <Field label="નોંધ"><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="શેના માટે?" /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-navy-500 border border-dashed border-cream-300 bg-cream-50 rounded-xl px-3.5 py-2.5 cursor-pointer">
            <Paperclip size={16} /> {form.billFile ? `બિલ: ${form.billFile}` : 'બિલનો ફોટો જોડો (ડેમો)'}
            <input type="file" className="hidden" onChange={e => setForm({ ...form, billFile: e.target.files?.[0]?.name ?? '' })} />
          </label>
          <Button variant="accent" onClick={submit} disabled={!Number(form.amount)}>ખર્ચ નોંધો</Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Select value={month} onChange={e => setMonth(e.target.value)} className="!w-44">
              {lastMonths(6).map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </Select>
            <div className="text-[14px]"><span className="text-navy-400">કુલ:</span> <b className="num text-navy-900">{inr(total)}</b></div>
          </div>
          <TableWrap>
            <thead><tr>
              <th className={th}>તારીખ</th><th className={th}>કેટેગરી</th><th className={th}>વેન્ડર</th><th className={th}>રકમ</th><th className={th}>પ્રકાર</th>
            </tr></thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} className="hover:bg-cream-50">
                  <td className={td}>{fmtDate(e.date)}</td>
                  <td className={td}><div className="font-semibold">{e.category}</div>{e.note && <div className="text-[12.5px] text-navy-400">{e.note}</div>}</td>
                  <td className={td}>{vendorName(e.vendorId)}</td>
                  <td className={`${td} num font-bold`}>{inr(e.amount)}</td>
                  <td className={td}>{payModeLabel[e.mode]}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td className={td} colSpan={5}>આ મહિને હજુ કોઈ ખર્ચ નોંધાયો નથી.</td></tr>}
            </tbody>
          </TableWrap>
        </div>
        <div>
          <SectionTitle>કેટેગરી પ્રમાણે</SectionTitle>
          <Card><HBars items={byCat} /></Card>
        </div>
      </div>
    </div>
  )
}
