import { useState } from 'react'
import { Download, MessageCircle, Sparkles } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtMonth, inr, lastMonths, monthAdd, thisMonth } from '../../lib/format'
import { exportCsv } from '../../lib/csv'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { Badge, Button, Card, Modal, PageHeader, Progress, SectionTitle, Select, TableWrap, td, th } from '../../components/ui'
import type { Tone } from '../../components/ui'

const tone: Record<'paid' | 'pending' | 'overdue', Tone> = { paid: 'green', pending: 'amber', overdue: 'red' }
const label = { paid: 'ચૂકવેલ', pending: 'બાકી', overdue: 'મુદત વીતી' }

export default function Billing() {
  const { db, society, flatById, billStatus, previewBillGeneration, generateBills, flatPending } = useData()
  const [month, setMonth] = useState(thisMonth())
  const [msg, setMsg] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const monthOptions = Array.from(new Set([...lastMonths(4), monthAdd(thisMonth(), 1)]))
  const bills = db.bills.filter(b => b.month === month).sort((a, b) => (flatById(a.flatId)?.number ?? '').localeCompare(flatById(b.flatId)?.number ?? ''))
  const billed = bills.reduce((s, b) => s + b.amount, 0)
  const collected = bills.reduce((s, b) => s + Math.min(b.paidAmount, b.amount), 0)
  const paidCount = bills.filter(b => billStatus(b) === 'paid').length
  const pct = billed ? Math.round((collected / billed) * 100) : 0

  const dues = db.flats
    .map(f => ({
      flat: f,
      months: db.bills.filter(b => b.flatId === f.id && b.paidAmount < b.amount).map(b => fmtMonth(b.month)),
      pending: flatPending(f.id),
    }))
    .filter(x => x.pending > 0)
    .sort((a, b) => b.pending - a.pending)

  const preview = previewBillGeneration(month)
  const newBills = preview.filter(p => !p.alreadyExists)
  const newTotal = newBills.reduce((s, p) => s + p.amount, 0)

  const confirmGenerate = () => {
    const n = generateBills(month)
    setMsg(n > 0 ? `${fmtMonth(month)} માટે ${n} નવા બિલ બની ગયા ✓` : `${fmtMonth(month)} ના બિલ પહેલેથી બનેલા છે`)
    setPreviewOpen(false)
  }

  const csvBills = () => exportCsv(`bills-${month}.csv`,
    ['ફ્લેટ', 'નામ', 'મહિનો', 'બિલ રકમ', 'ચૂકવેલ', 'સ્થિતિ'],
    bills.map(b => {
      const f = flatById(b.flatId)
      return [f?.number, f?.ownerName, fmtMonth(b.month), b.amount, b.paidAmount, label[billStatus(b)]]
    }))
  const csvDues = () => exportCsv('dues.csv',
    ['ફ્લેટ', 'નામ', 'ફોન', 'બાકી મહિના', 'બાકી રકમ'],
    dues.map(d => [d.flat.number, d.flat.ownerName, d.flat.phone, d.months.join(' | '), d.pending]))

  return (
    <div>
      <PageHeader title="બિલિંગ અને બાકી" sub="મહિનાના બિલ બનાવો અને કલેક્શન જુઓ"
        actions={<Button variant="soft" onClick={csvBills}><Download size={16} /> બિલ CSV</Button>} />

      <Card className="animate-fadeUp">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <div className="text-[13px] font-semibold text-navy-600 mb-1">મહિનો</div>
            <Select value={month} onChange={e => { setMonth(e.target.value); setMsg('') }}>
              {monthOptions.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </Select>
          </div>
          <Button variant="accent" onClick={() => setPreviewOpen(true)}><Sparkles size={16} /> આ મહિનાના બિલ બનાવો</Button>
          {msg && <div className="text-[13.5px] font-semibold text-paid">{msg}</div>}
        </div>
        <p className="text-[12.5px] text-navy-400 mt-2">દરેક ફ્લેટ માટે ₹{society.maintenanceAmount} નું બિલ બનશે (કોઈ ફ્લેટને અલગ રકમ સેટ કરેલી હોય તો એ પ્રમાણે). જે ફ્લેટનું બિલ પહેલેથી છે તે બેવડાશે નહીં.</p>
      </Card>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`${fmtMonth(month)} ના બિલ`} wide>
        {newBills.length === 0 ? (
          <p className="text-[13.5px] text-navy-500">{fmtMonth(month)} ના બિલ પહેલેથી બધા ફ્લેટ માટે બની ગયેલા છે. કંઈ નવું બનશે નહીં.</p>
        ) : (
          <>
            <p className="text-[13.5px] text-navy-600 mb-3">{newBills.length} નવા બિલ બનશે, કુલ <span className="font-bold num">{inr(newTotal)}</span>. {preview.length - newBills.length > 0 && `(${preview.length - newBills.length} ફ્લેટના બિલ પહેલેથી બનેલા છે, એ છોડી દેવાશે.)`}</p>
            <div className="max-h-64 overflow-y-auto border border-cream-200 rounded-xl">
              <TableWrap>
                <thead><tr><th className={th}>ફ્લેટ</th><th className={th}>રકમ</th></tr></thead>
                <tbody>
                  {newBills.map(p => (
                    <tr key={p.flatId}>
                      <td className={td}>{p.flatNumber}</td>
                      <td className={td}>
                        {inr(p.amount)}
                        {p.amount !== society.maintenanceAmount && <span className="ml-1.5 text-[11px] text-saffron-600 font-semibold">અલગ રકમ</span>}
                        {p.creditApplied > 0 && <span className="ml-1.5 text-[11px] text-paid font-semibold">{inr(p.creditApplied)} ક્રેડિટ લાગુ થશે</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </>
        )}
        <div className="flex gap-2 mt-4">
          <Button variant="soft" full onClick={() => setPreviewOpen(false)}>રદ કરો</Button>
          {newBills.length > 0 && <Button variant="accent" full onClick={confirmGenerate}>પુષ્ટિ કરો, બિલ બનાવો</Button>}
        </div>
      </Modal>

      {bills.length > 0 && (
        <Card className="mt-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
            <div><span className="text-[13px] text-navy-400">કુલ બિલ</span> <b className="num ml-1">{inr(billed)}</b></div>
            <div><span className="text-[13px] text-navy-400">જમા</span> <b className="num ml-1 text-paid">{inr(collected)}</b></div>
            <div><span className="text-[13px] text-navy-400">ચૂકવેલ ફ્લેટ</span> <b className="num ml-1">{paidCount}/{bills.length}</b></div>
            <div className="flex-1 min-w-40 flex items-center gap-2">
              <Progress value={pct} label="પસંદ કરેલા મહિનાનું કલેક્શન પ્રગતિ" tone={pct >= 80 ? 'green' : 'saffron'} />
              <span className="num text-[13.5px] font-bold text-navy-700">{pct}%</span>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-3">
        <TableWrap>
          <thead><tr>
            <th className={th}>ફ્લેટ</th><th className={th}>નામ</th><th className={th}>રકમ</th><th className={th}>ચૂકવેલ</th><th className={th}>સ્થિતિ</th>
          </tr></thead>
          <tbody>
            {bills.map(b => {
              const f = flatById(b.flatId); const s = billStatus(b)
              return (
                <tr key={b.id} className="hover:bg-cream-50">
                  <td className={`${td} font-bold num`}>{f?.number}</td>
                  <td className={td}>{f?.ownerName}</td>
                  <td className={`${td} num`}>{inr(b.amount)}</td>
                  <td className={`${td} num`}>{b.paidAmount > 0 ? inr(b.paidAmount) : '-'}</td>
                  <td className={td}><Badge tone={tone[s]}>{label[s]}</Badge></td>
                </tr>
              )
            })}
            {bills.length === 0 && <tr><td className={td} colSpan={5}>આ મહિનાના બિલ હજુ બન્યા નથી. ઉપરથી બનાવો.</td></tr>}
          </tbody>
        </TableWrap>
      </div>

      <SectionTitle action={<Button variant="soft" onClick={csvDues}><Download size={15} /> બાકી CSV</Button>}>બાકી યાદી (બધા મહિના)</SectionTitle>
      <TableWrap>
        <thead><tr>
          <th className={th}>ફ્લેટ</th><th className={th}>નામ</th><th className={th}>બાકી મહિના</th><th className={th}>રકમ</th><th className={th}>રિમાઇન્ડર</th>
        </tr></thead>
        <tbody>
          {dues.map(d => (
            <tr key={d.flat.id} className="hover:bg-cream-50">
              <td className={`${td} font-bold num`}>{d.flat.number}</td>
              <td className={td}>{d.flat.ownerName}</td>
              <td className={`${td} text-[13px]`}>{d.months.join(', ')}</td>
              <td className={`${td} num font-bold text-over`}>{inr(d.pending)}</td>
              <td className={td}>
                <a target="_blank" rel="noreferrer" href={waShare(waTemplates.maintenanceReminder(society.name, d.flat.ownerName, d.flat.number, d.pending, thisMonth()))}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-paid bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </td>
            </tr>
          ))}
          {dues.length === 0 && <tr><td className={td} colSpan={5}>કોઈ બાકી નથી 🎉</td></tr>}
        </tbody>
      </TableWrap>
    </div>
  )
}
