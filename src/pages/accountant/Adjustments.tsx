import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { useData } from '../../lib/store'
import { useToast } from '../../components/Toast'
import { fmtDate, inr, todayISO } from '../../lib/format'
import { exportCsv } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, PageHeader, Select, TableWrap, td, th } from '../../components/ui'

export default function Adjustments() {
  const { db, flatById, addAdjustment, canWriteNow } = useData()
  const toast = useToast()
  const [form, setForm] = useState({ date: todayISO(), flatId: '', amount: '', type: 'credit' as 'credit' | 'debit', reason: '' })

  const save = () => {
    const amt = Number(form.amount)
    if (!amt || amt <= 0 || !form.reason.trim()) return
    addAdjustment({ date: form.date, flatId: form.flatId || undefined, amount: amt, type: form.type, reason: form.reason.trim() })
    if (!canWriteNow) return
    setForm({ date: todayISO(), flatId: '', amount: '', type: 'credit', reason: '' })
    toast.success(`${form.type === 'credit' ? 'જમા' : 'ઉધાર'} એડજસ્ટમેન્ટ નોંધાયું`)
  }

  const list = [...db.adjustments].sort((a, b) => b.date.localeCompare(a.date))
  const csv = () => exportCsv('adjustments.csv', ['તારીખ', 'ફ્લેટ', 'પ્રકાર', 'રકમ', 'કારણ'],
    list.map(a => [a.date, a.flatId ? flatById(a.flatId)?.number ?? '' : 'સામાન્ય', a.type === 'credit' ? 'જમા' : 'ઉધાર', a.amount, a.reason]))

  return (
    <div>
      <PageHeader title="એડજસ્ટમેન્ટ" sub="રાઉન્ડ-ઓફ, વધારાની ચુકવણી કે સુધારા નોંધો"
        actions={<Button variant="soft" onClick={csv}><Download size={16} /> CSV</Button>} />

      <Card className="animate-fadeUp">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="તારીખ"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="ફ્લેટ (વૈકલ્પિક)">
            <Select value={form.flatId} onChange={e => setForm({ ...form, flatId: e.target.value })}>
              <option value="">સામાન્ય (કોઈ ફ્લેટ નહીં)</option>
              {[...db.flats].sort((a, b) => a.number.localeCompare(b.number)).map(f => <option key={f.id} value={f.id}>{f.number} · {f.ownerName}</option>)}
            </Select>
          </Field>
          <Field label="પ્રકાર">
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'credit' | 'debit' })}>
              <option value="credit">જમા (Credit)</option><option value="debit">ઉધાર (Debit)</option>
            </Select>
          </Field>
          <Field label="રકમ (₹)"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
        </div>
        <div className="mt-3"><Field label="કારણ"><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="દા.ત. ગયા મહિનાનું વધારે ભરાયેલું એડજસ્ટ" /></Field></div>
        <Button className="mt-3" variant="accent" onClick={save} disabled={!Number(form.amount) || !form.reason.trim()}><Plus size={16} /> એડજસ્ટમેન્ટ નોંધો</Button>
      </Card>

      <div className="mt-4">
        <TableWrap>
          <thead><tr><th className={th}>તારીખ</th><th className={th}>ફ્લેટ</th><th className={th}>પ્રકાર</th><th className={th}>રકમ</th><th className={th}>કારણ</th></tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id} className="hover:bg-cream-50">
                <td className={td}>{fmtDate(a.date)}</td>
                <td className={td}>{a.flatId ? <b className="num">{flatById(a.flatId)?.number}</b> : <span className="text-navy-400">સામાન્ય</span>}</td>
                <td className={td}><Badge tone={a.type === 'credit' ? 'green' : 'amber'}>{a.type === 'credit' ? 'જમા' : 'ઉધાર'}</Badge></td>
                <td className={`${td} num font-bold ${a.type === 'credit' ? 'text-paid' : 'text-pend'}`}>{a.type === 'credit' ? '+' : '−'}{inr(a.amount)}</td>
                <td className={td}>{a.reason}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className={td} colSpan={5}>હજુ કોઈ એડજસ્ટમેન્ટ નથી.</td></tr>}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}
