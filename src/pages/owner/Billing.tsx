import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../../lib/store'
import { inr, thisMonth } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { Badge, Button, Card, Field, Input, PageHeader, Select, TableWrap, td, th } from '../../components/ui'
import type { PayMode } from '../../lib/types'

const statusLabel: Record<string, string> = { unpaid: 'બાકી', partial: 'આંશિક', paid: 'ચૂકવેલ', waived: 'માફ' }
const statusTone: Record<string, 'red' | 'amber' | 'green' | 'gray'> = { unpaid: 'red', partial: 'amber', paid: 'green', waived: 'gray' }

export default function OwnerBilling() {
  const { rawDb, addPlatformBillingRecord, updatePlatformBillingRecord } = useData()
  const [societyId, setSocietyId] = useState(rawDb.societies[0]?.id ?? '')
  const [period, setPeriod] = useState(thisMonth())
  const [received, setReceived] = useState('')
  const [mode, setMode] = useState<PayMode>('upi')
  const [status, setStatus] = useState<'unpaid' | 'partial' | 'paid' | 'waived'>('paid')
  const [note, setNote] = useState('')

  const rows = [...rawDb.platformBilling].sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))
  const societyName = (id: string) => rawDb.societies.find(s => s.id === id)?.name ?? id
  const flatCountFor = (id: string) => rawDb.flats.filter(f => f.societyId === id).length

  const create = () => {
    const flatCount = flatCountFor(societyId)
    const expectedAmount = flatCount * 10
    addPlatformBillingRecord({
      societyId, periodMonth: period, flatCount, ratePerFlat: 10, expectedAmount,
      receivedAmount: Number(received) || 0, mode, status,
      paymentDate: status === 'paid' || status === 'partial' ? new Date().toISOString().slice(0, 10) : undefined,
      internalNote: note.trim() || undefined,
    })
    setReceived(''); setNote('')
  }

  return (
    <div>
      <PageHeader title="પ્લેટફોર્મ બિલિંગ" sub="₹10 / ફ્લેટ / મહિનો, મેન્યુઅલી ટ્રેક કરેલું" />

      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="સોસાયટી">
            <Select value={societyId} onChange={e => setSocietyId(e.target.value)}>
              {rawDb.societies.map(s => <option key={s.id} value={s.id}>{s.name} ({flatCountFor(s.id)} ફ્લેટ)</option>)}
            </Select>
          </Field>
          <Field label="મહિનો"><Input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></Field>
          <Field label="મળેલ રકમ (₹)" hint={`અંદાજિત: ₹${flatCountFor(societyId) * 10}, બદલી શકાય છે`}>
            <Input type="number" value={received} onChange={e => setReceived(e.target.value)} placeholder={String(flatCountFor(societyId) * 10)} />
          </Field>
          <Field label="ચુકવણી પ્રકાર"><Select value={mode} onChange={e => setMode(e.target.value as PayMode)}>{(Object.keys(payModeLabel) as PayMode[]).map(m => <option key={m} value={m}>{payModeLabel[m]}</option>)}</Select></Field>
          <Field label="સ્થિતિ">
            <Select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="unpaid">બાકી</option><option value="partial">આંશિક</option><option value="paid">ચૂકવેલ</option><option value="waived">માફ</option>
            </Select>
          </Field>
          <Field label="આંતરિક નોંધ"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
        </div>
        <Button className="mt-3" variant="accent" onClick={create}><Plus size={16} /> રેકોર્ડ ઉમેરો</Button>
      </Card>

      <div className="mt-4">
        <TableWrap>
          <thead><tr><th className={th}>સોસાયટી</th><th className={th}>મહિનો</th><th className={th}>ફ્લેટ</th><th className={th}>અંદાજિત</th><th className={th}>મળેલ</th><th className={th}>સ્થિતિ</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-cream-50">
                <td className={td}>{societyName(r.societyId)}</td>
                <td className={`${td} num`}>{r.periodMonth}</td>
                <td className={`${td} num`}>{r.flatCount}</td>
                <td className={`${td} num`}>{inr(r.expectedAmount)}</td>
                <td className={`${td} num font-semibold`}>{inr(r.receivedAmount)}</td>
                <td className={td}>
                  <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                  {r.status !== 'paid' && (
                    <button onClick={() => updatePlatformBillingRecord(r.id, { status: 'paid', receivedAmount: r.expectedAmount, paymentDate: new Date().toISOString().slice(0, 10) })}
                      className="ml-2 text-[12px] font-semibold text-saffron-600 hover:text-saffron-700">ચૂકવેલ તરીકે નોંધો</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>
    </div>
  )
}
