import { useState } from 'react'
import { Download, MessageCircle, ReceiptText, XCircle, Ban } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, fmtMonth, inr } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { exportCsv } from '../../lib/csv'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { ReceiptView } from '../../components/ReceiptView'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, TableWrap, td, th } from '../../components/ui'
import type { PayMode, Payment } from '../../lib/types'

export default function Payments() {
  const { db, flatById, recordPayment, cancelReceipt, confirmPendingPayment, society } = useData()
  const [flatId, setFlatId] = useState(db.flats[0]?.id ?? '')
  const [billId, setBillId] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<PayMode>('upi')
  const [refNo, setRefNo] = useState('')
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)
  const [receiptFor, setReceiptFor] = useState<Payment | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Payment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [failMsg, setFailMsg] = useState('')

  const flats = [...db.flats].sort((a, b) => a.number.localeCompare(b.number))
  const pendingBills = db.bills
    .filter(b => b.flatId === flatId && b.paidAmount < b.amount)
    .sort((a, b) => a.month.localeCompare(b.month))

  const pickBill = (id: string) => {
    setBillId(id)
    const b = db.bills.find(x => x.id === id)
    if (b) setAmount(String(b.amount - b.paidAmount))
  }
  const pickFlat = (id: string) => { setFlatId(id); setBillId(''); setAmount('') }

  const submit = () => {
    const amt = Number(amount)
    if (!flatId || !amt || amt <= 0) return
    const pay = recordPayment({ flatId, billId: billId || undefined, amount: amt, mode, refNo: refNo.trim() || undefined, note: note.trim() || undefined, failed })
    if (!pay) { setFailMsg('સોસાયટીની સબ્સ્ક્રિપ્શન સ્થિતિના કારણે નવી ચુકવણી નોંધી શકાતી નથી.'); return }
    setBillId(''); setAmount(''); setRefNo(''); setNote(''); setFailed(false)
    if (pay.status === 'success') setReceiptFor(pay)
    else setFailMsg('ફેલ થયેલી ચુકવણી નોંધાઈ. બિલ પર અસર નહીં થાય, રસીદ નહીં બને.')
  }

  // Cancelled overrides whatever the underlying status says - the old
  // binary check here (success vs everything-else-is-"ફેલ") meant a
  // cancelled receipt still showed as successful, and a payment still
  // awaiting confirmation showed as failed, neither of which is true.
  const csvStatusLabel = (p: Payment) => p.cancelled ? 'રદ થયેલ' : p.status === 'success' ? 'સફળ' : p.status === 'pending_confirmation' ? 'મંજૂરી બાકી' : 'ફેલ'

  const csv = () => exportCsv('payments.csv',
    ['રસીદ નં', 'તારીખ', 'ફ્લેટ', 'નામ', 'રકમ', 'પ્રકાર', 'રેફરન્સ', 'સ્થિતિ', 'નોંધ'],
    db.payments.map(p => {
      const f = flatById(p.flatId)
      return [p.receiptNo ?? '', p.date, f?.number, f?.ownerName, p.amount, payModeLabel[p.mode], p.refNo ?? '', csvStatusLabel(p), p.note ?? '']
    }))

  const receiptFlat = receiptFor ? flatById(receiptFor.flatId) : undefined
  const receiptMonth = receiptFor?.billId ? db.bills.find(b => b.id === receiptFor.billId)?.month : undefined

  return (
    <div>
      <PageHeader title="ચુકવણી અને રસીદ" sub="રોકડ / UPI / ચેક, બધું અહીં નોંધો. રસીદ આપોઆપ બનશે."
        actions={<Button variant="soft" onClick={csv}><Download size={16} /> CSV</Button>} />

      {db.payments.some(p => p.status === 'pending_confirmation') && (
        <Card className="mb-3 border-amber-200 bg-amber-50/60">
          <h2 className="font-bold text-navy-800 mb-2">રહેવાસીએ "મેં ચૂકવ્યું" કહ્યું છે, પુષ્ટિ બાકી</h2>
          <div className="space-y-2">
            {db.payments.filter(p => p.status === 'pending_confirmation').map(p => {
              const f = flatById(p.flatId)
              return (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-cream-200 px-3 py-2.5">
                  <div className="text-[13.5px]">
                    <b className="num">{f?.number}</b> <span className="text-navy-500">{f?.ownerName}</span>
                    <div className="text-[12px] text-navy-400">{fmtDate(p.date)} · {payModeLabel[p.mode]} {p.refNo ? `· ${p.refNo}` : ''} {p.note ? `· ${p.note}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num font-bold text-navy-800">{inr(p.amount)}</span>
                    <Button variant="accent" onClick={() => confirmPendingPayment(p.id)}>પુષ્ટિ કરો</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="animate-fadeUp">
        <form onSubmit={e => { e.preventDefault(); submit() }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ફ્લેટ">
              <Select value={flatId} onChange={e => pickFlat(e.target.value)}>
                {flats.map(f => <option key={f.id} value={f.id}>{f.number} · {f.ownerName}</option>)}
              </Select>
            </Field>
            <Field label="કયા બિલ સામે?" hint={pendingBills.length === 0 ? 'આ ફ્લેટનું કોઈ બિલ બાકી નથી' : undefined}>
              <Select value={billId} onChange={e => pickBill(e.target.value)}>
                <option value="">બિલ વગર (એડવાન્સ / અન્ય)</option>
                {pendingBills.map(b => <option key={b.id} value={b.id}>{fmtMonth(b.month)} · બાકી {inr(b.amount - b.paidAmount)}</option>)}
              </Select>
            </Field>
            <Field label="રકમ (₹)" hint="આંશિક ચુકવણી પણ ચાલશે">
              <Input type="number" inputMode="numeric" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1200" required />
            </Field>
            <Field label="ચુકવણી પ્રકાર">
              <Select value={mode} onChange={e => setMode(e.target.value as PayMode)}>
                {(Object.keys(payModeLabel) as PayMode[]).map(m => <option key={m} value={m}>{payModeLabel[m]}</option>)}
              </Select>
            </Field>
            <Field label="રેફરન્સ નં (UPI/ચેક)"><Input value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="UPI123456" /></Field>
            <Field label="એડજસ્ટમેન્ટ / નોંધ"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="દા.ત. ₹200 ગયા મહિનાનું એડજસ્ટ" /></Field>
          </div>
          <label className="mt-3 flex items-center gap-2.5 text-[14px] text-navy-600 cursor-pointer">
            <input type="checkbox" checked={failed} onChange={e => setFailed(e.target.checked)} className="h-4.5 w-4.5 accent-saffron-500" style={{ width: 18, height: 18 }} />
            ફેલ થયેલી ચુકવણી તરીકે નોંધો (ડેમો: પેમેન્ટ ફેલ થાય તો કેવું દેખાય)
          </label>
          {failMsg && <div className="mt-2 text-[13.5px] text-over bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2"><XCircle size={15} /> {failMsg}</div>}
          <Button type="submit" className="mt-4" variant="accent" disabled={!Number(amount)}>ચુકવણી નોંધો</Button>
        </form>
      </Card>

      <div className="mt-4">
        <TableWrap>
          <thead><tr>
            <th className={th}>રસીદ</th><th className={th}>તારીખ</th><th className={th}>ફ્લેટ</th><th className={th}>રકમ</th><th className={th}>પ્રકાર</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {db.payments.slice(0, 15).map(p => {
              const f = flatById(p.flatId)
              return (
                <tr key={p.id} className={`hover:bg-cream-50 ${p.cancelled ? 'opacity-50' : ''}`}>
                  <td className={`${td} num`}>
                    {p.status === 'failed' ? <Badge tone="red">ફેલ</Badge>
                      : p.cancelled ? <span className="line-through text-navy-400">{p.receiptNo}</span>
                      : <span className="font-semibold">{p.receiptNo}</span>}
                    {p.cancelled && <Badge tone="red">રદ</Badge>}
                  </td>
                  <td className={td}>{fmtDate(p.date)}</td>
                  <td className={td}><b className="num">{f?.number}</b> <span className="text-navy-400 text-[13px]">{f?.ownerName}</span></td>
                  <td className={`${td} num font-bold`}>{inr(p.amount)}</td>
                  <td className={td}>{payModeLabel[p.mode]}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {p.status === 'success' && !p.cancelled && (
                      <span className="inline-flex gap-1.5">
                        <button onClick={() => setReceiptFor(p)} title="રસીદ જુઓ"
                          className="h-8 w-8 rounded-lg bg-navy-50 border border-navy-100 text-navy-600 inline-flex items-center justify-center hover:bg-navy-100"><ReceiptText size={15} /></button>
                        <a target="_blank" rel="noreferrer" title="WhatsApp"
                          href={waShare(waTemplates.paymentReceived(society.name, f?.ownerName ?? '', f?.number ?? '', p.amount, p.receiptNo ?? ''))}
                          className="h-8 w-8 rounded-lg bg-green-50 border border-green-200 text-paid inline-flex items-center justify-center hover:bg-green-100"><MessageCircle size={15} /></a>
                        <button onClick={() => setCancelTarget(p)} title="રસીદ રદ કરો"
                          className="h-8 w-8 rounded-lg bg-red-50 border border-red-100 text-over inline-flex items-center justify-center hover:bg-red-100"><Ban size={15} /></button>
                      </span>
                    )}
                    {p.cancelled && p.cancelReason && <span className="text-[12px] text-navy-400">કારણ: {p.cancelReason}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        <p className="text-[12.5px] text-navy-400 mt-2">છેલ્લી 15 એન્ટ્રી દેખાય છે. આખો રેકોર્ડ CSV માં મળશે. રસીદ ડિલીટ થતી નથી, ફક્ત રદ થાય છે, કારણ સાથે.</p>
      </div>

      <Modal open={!!receiptFor} onClose={() => setReceiptFor(null)} title="રસીદ" wide>
        {receiptFor && receiptFlat && (
          <ReceiptView payment={receiptFor} flat={receiptFlat} society={society} month={receiptMonth} />
        )}
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => { setCancelTarget(null); setCancelReason('') }} title="રસીદ રદ કરો">
        <p className="text-[13.5px] text-navy-500">
          રસીદ <b className="num">{cancelTarget?.receiptNo}</b> રદ કરવાની છે. આ ડિલીટ થશે નહીં, રદ તરીકે નોંધાશે અને કારણ કાયમ દેખાશે. ફ્લેટની બાકી રકમમાં આ રકમ પાછી ઉમેરાશે.
        </p>
        <Field label="કારણ (જરૂરી)"><Input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="દા.ત. ડબલ એન્ટ્રી થઈ ગઈ હતી" /></Field>
        <div className="flex gap-2 pt-1">
          <Button variant="soft" full onClick={() => { setCancelTarget(null); setCancelReason('') }}>રહેવા દો</Button>
          <Button variant="danger" full disabled={!cancelReason.trim()}
            onClick={() => { if (cancelTarget) cancelReceipt(cancelTarget.id, cancelReason.trim()); setCancelTarget(null); setCancelReason('') }}>
            રસીદ રદ કરો
          </Button>
        </div>
      </Modal>
    </div>
  )
}
