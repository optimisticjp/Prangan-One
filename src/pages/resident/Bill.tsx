import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, MessageCircle, Info, CheckCircle2, Clock } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, fmtMonth, inr, thisMonth } from '../../lib/format'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { payModeLabel } from '../../lib/copy'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '../../components/ui'
import type { Tone } from '../../components/ui'
import type { PayMode } from '../../lib/types'

const statusTone: Record<'paid' | 'pending' | 'overdue', Tone> = { paid: 'green', pending: 'amber', overdue: 'red' }
const statusLabel = { paid: 'ચૂકવેલ', pending: 'બાકી', overdue: 'મુદત વીતી' }

export default function Bill() {
  const { db, session, flatById, billStatus, society, flatPending, recordPayment } = useData()
  const [payOpen, setPayOpen] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [payMode, setPayMode] = useState<PayMode>('upi')
  const [payRef, setPayRef] = useState('')
  const [payNote, setPayNote] = useState('')
  const [justMarked, setJustMarked] = useState(false)
  const flat = session.flatId ? flatById(session.flatId) : undefined
  if (!flat) return null

  const myBills = db.bills.filter(b => b.flatId === flat.id).sort((a, b) => b.month.localeCompare(a.month))
  const cur = myBills.find(b => b.month === thisMonth()) ?? myBills[0]
  const pending = flatPending(flat.id)
  const name = flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName
  const myPendingConfirmations = db.payments.filter(p => p.flatId === flat.id && p.status === 'pending_confirmation')

  const submitMarkPaid = () => {
    if (!cur) return
    recordPayment({ flatId: flat.id, billId: cur.id, amount: cur.amount - cur.paidAmount, mode: payMode, refNo: payRef.trim() || undefined, note: payNote.trim() || undefined, pending: true })
    setMarkingPaid(false); setJustMarked(true); setPayOpen(false)
    setPayRef(''); setPayNote('')
  }

  return (
    <div>
      <PageHeader title="મારું બિલ" sub={`ફ્લેટ ${flat.number} · ${name}`} />

      {cur && (
        <Card className="animate-fadeUp">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] text-navy-400">{fmtMonth(cur.month)} મેન્ટેનન્સ</div>
              <div className="num text-[32px] font-bold text-navy-900 leading-tight">{inr(cur.amount)}</div>
              <div className="text-[13px] text-navy-400 mt-0.5">છેલ્લી તારીખ: {fmtDate(cur.dueDate)}</div>
            </div>
            <Badge tone={statusTone[billStatus(cur)]}>{statusLabel[billStatus(cur)]}</Badge>
          </div>
          {cur.paidAmount > 0 && cur.paidAmount < cur.amount && (
            <div className="mt-2 text-[13.5px] text-pend bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {inr(cur.paidAmount)} ચૂકવેલ છે, {inr(cur.amount - cur.paidAmount)} બાકી છે.
            </div>
          )}
          {billStatus(cur) !== 'paid' && (
            <div className="flex gap-2 mt-4">
              <Button full variant="accent" onClick={() => setPayOpen(true)}><CreditCard size={17} /> મેન્ટેનન્સ ભરો</Button>
              <a href={waShare(`નમસ્તે 🙏 ફ્લેટ ${flat.number} નું ${fmtMonth(cur.month)} મેન્ટેનન્સ ${inr(cur.amount - cur.paidAmount)} ભરવા માંગું છું. UPI વિગત મોકલશો?`)} target="_blank" rel="noreferrer">
                <Button variant="soft"><MessageCircle size={17} /></Button>
              </a>
            </div>
          )}
        </Card>
      )}

      {pending > 0 && (
        <Card className="mt-3 animate-fadeUp">
          <div className="flex items-center justify-between">
            <span className="text-navy-600 font-medium">કુલ બાકી રકમ</span>
            <span className="num text-[20px] font-bold text-over">{inr(pending)}</span>
          </div>
        </Card>
      )}

      {justMarked && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5 text-[13.5px] text-navy-700 animate-fadeUp">
          <Clock size={17} className="text-pend shrink-0 mt-0.5" />
          <span>તમારી ચુકવણીની નોંધ થઈ ગઈ. કમિટી પુષ્ટિ કરશે એટલે રસીદ દેખાશે. (આ હજુ સત્તાવાર ચુકવણી નથી.)</span>
        </div>
      )}
      {myPendingConfirmations.length > 0 && (
        <Card className="mt-3 border-amber-200 bg-amber-50/50">
          <div className="text-[13.5px] font-semibold text-navy-700 mb-1.5">કમિટીની પુષ્ટિ બાકી</div>
          {myPendingConfirmations.map(p => (
            <div key={p.id} className="text-[13px] text-navy-500 flex justify-between">
              <span>{fmtDate(p.date)} · {payModeLabel[p.mode]}</span>
              <span className="num font-semibold">{inr(p.amount)}</span>
            </div>
          ))}
        </Card>
      )}

      <h2 className="font-bold text-navy-800 mt-6 mb-2.5">બિલ ઇતિહાસ</h2>
      <div className="space-y-2">
        {myBills.map(b => {
          const st = billStatus(b)
          const pay = db.payments.find(p => p.billId === b.id && p.status === 'success')
          return (
            <div key={b.id} className="card px-4 py-3 flex items-center justify-between gap-3 animate-fadeUp">
              <div>
                <div className="font-semibold text-navy-800">{fmtMonth(b.month)}</div>
                <div className="text-[12.5px] text-navy-400 num">{inr(b.amount)}{b.paidAmount > 0 && b.paidAmount < b.amount ? ` · ${inr(b.paidAmount)} ચૂકવેલ` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                {st === 'paid' && pay && (
                  <Link to={`/app/receipts/${pay.id}`} className="text-[13px] font-semibold text-navy-600 underline underline-offset-2">રસીદ</Link>
                )}
                <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
              </div>
            </div>
          )
        })}
      </div>

      {/* payment options: gateway placeholder + real manual routes */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="મેન્ટેનન્સ કેવી રીતે ભરવું?">
        <div className="rounded-xl border border-dashed border-saffron-300 bg-saffron-50 px-4 py-3 flex gap-2.5">
          <Info size={18} className="text-saffron-600 shrink-0 mt-0.5" />
          <p className="text-[13.5px] text-navy-700">
            <b>ઓનલાઈન પેમેન્ટ (Razorpay/UPI ગેટવે) જલ્દી આવે છે.</b> હમણાં નીચેની રીતે ચૂકવી શકાય. ચુકવણી પછી ખજાનચી રસીદ બનાવશે અને તમને અહીં દેખાશે.
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="rounded-xl border border-cream-300 bg-white px-4 py-3">
            <div className="font-semibold text-navy-800">UPI</div>
            <div className="text-[13.5px] text-navy-500">સોસાયટી UPI: <b className="num">{society.upiId}</b></div>
          </div>
          <div className="rounded-xl border border-cream-300 bg-white px-4 py-3">
            <div className="font-semibold text-navy-800">રોકડ / ચેક</div>
            <div className="text-[13.5px] text-navy-500">ખજાનચીને ચૂકવો, રસીદ તરત મળશે.</div>
          </div>
        </div>
        <a href={waShare(waTemplates.maintenanceReminder(society.name, name, flat.number, cur ? cur.amount - cur.paidAmount : society.maintenanceAmount, cur?.month ?? thisMonth()))} target="_blank" rel="noreferrer">
          <Button full variant="soft"><MessageCircle size={17} /> ખજાનચીને WhatsApp કરો</Button>
        </a>

        {!markingPaid ? (
          <Button full variant="ghost" onClick={() => setMarkingPaid(true)}><CheckCircle2 size={16} /> મેં ચૂકવ્યું છે, નોંધ કરો</Button>
        ) : (
          <div className="rounded-xl border border-cream-300 bg-cream-50 p-3.5 space-y-2.5">
            <p className="text-[12.5px] text-navy-500">આ સત્તાવાર ચુકવણી નથી, ફક્ત કમિટીને જાણ થાય છે કે તમે ચૂકવ્યું છે. કમિટી ચકાસીને રસીદ બનાવશે.</p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={payMode} onChange={e => setPayMode(e.target.value as PayMode)}>
                {(Object.keys(payModeLabel) as PayMode[]).map(m => <option key={m} value={m}>{payModeLabel[m]}</option>)}
              </Select>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="ટ્રાન્ઝેક્શન નં (વૈકલ્પિક)" />
            </div>
            <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="નોંધ (વૈકલ્પિક)" />
            <div className="flex gap-2">
              <Button variant="soft" full onClick={() => setMarkingPaid(false)}>રદ કરો</Button>
              <Button full onClick={submitMarkPaid}>નોંધ કરો</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
