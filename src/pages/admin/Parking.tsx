import { useState } from 'react'
import { AlertTriangle, Bike, CarFront, Download, Plus } from 'lucide-react'
import { useData } from '../../lib/store'
import { exportCsv } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, TableWrap, td, th } from '../../components/ui'

export default function Parking() {
  const { db, flatById, addVehicle } = useData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ flatId: db.flats[0]?.id ?? '', kind: '2W' as '2W' | '4W', number: '', slot: '', ownerType: 'owner' })

  // find duplicate slots
  const slotCount = new Map<string, number>()
  db.vehicles.forEach(v => slotCount.set(v.slot, (slotCount.get(v.slot) ?? 0) + 1))
  const dupSlots = new Set([...slotCount.entries()].filter(([, n]) => n > 1).map(([s]) => s))

  const save = () => {
    if (!form.number.trim() || !form.slot.trim()) return
    const flat = flatById(form.flatId)
    addVehicle({ flatId: form.flatId, kind: form.kind, number: form.number.trim().toUpperCase(), slot: form.slot.trim().toUpperCase(), ownerType: flat?.occupancy ?? 'owner' })
    setOpen(false)
    setForm({ flatId: db.flats[0]?.id ?? '', kind: '2W', number: '', slot: '', ownerType: 'owner' })
  }

  const csv = () => exportCsv('vehicles.csv', ['સ્લોટ', 'નંબર', 'પ્રકાર', 'ફ્લેટ', 'નામ', 'માલિક/ભાડૂત'],
    [...db.vehicles].sort((a, b) => a.slot.localeCompare(b.slot)).map(v => {
      const f = flatById(v.flatId)
      return [v.slot, v.number, v.kind, f?.number, f?.ownerName, v.ownerType === 'tenant' ? 'ભાડૂત' : 'માલિક']
    }))

  const rows = [...db.vehicles].sort((a, b) => a.slot.localeCompare(b.slot))

  return (
    <div>
      <PageHeader title="પાર્કિંગ અને વાહન" sub={`કુલ ${db.vehicles.length} વાહન નોંધાયેલા`}
        actions={<>
          <Button variant="soft" onClick={csv}><Download size={16} /> CSV</Button>
          <Button variant="accent" onClick={() => setOpen(true)}><Plus size={16} /> વાહન ઉમેરો</Button>
        </>} />

      {dupSlots.size > 0 && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[14px] text-over">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <b>ધ્યાન આપો:</b> આ સ્લોટમાં એકથી વધુ વાહન નોંધાયેલા છે: <b className="num">{[...dupSlots].join(', ')}</b>. કૃપા કરીને ચકાસો.
          </div>
        </div>
      )}

      <TableWrap>
        <thead><tr>
          <th className={th}>સ્લોટ</th><th className={th}>વાહન નંબર</th><th className={th}>પ્રકાર</th><th className={th}>ફ્લેટ</th><th className={th}>પ્રકાર</th>
        </tr></thead>
        <tbody>
          {rows.map(v => {
            const f = flatById(v.flatId); const dup = dupSlots.has(v.slot)
            return (
              <tr key={v.id} className={dup ? 'bg-red-50/60' : 'hover:bg-cream-50'}>
                <td className={td}><span className="inline-flex items-center gap-1.5"><b className="num">{v.slot}</b>{dup && <AlertTriangle size={14} className="text-over" />}</span></td>
                <td className={`${td} num font-semibold`}>{v.number}</td>
                <td className={td}><span className="inline-flex items-center gap-1.5">{v.kind === '2W' ? <Bike size={15} /> : <CarFront size={15} />} {v.kind}</span></td>
                <td className={td}><b className="num">{f?.number}</b> <span className="text-navy-400 text-[13px]">{f?.ownerName}</span></td>
                <td className={td}><Badge tone={v.ownerType === 'tenant' ? 'blue' : 'gray'}>{v.ownerType === 'tenant' ? 'ભાડૂત' : 'માલિક'}</Badge></td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>

      <Modal open={open} onClose={() => setOpen(false)} title="નવું વાહન">
        <Field label="ફ્લેટ">
          <Select value={form.flatId} onChange={e => setForm({ ...form, flatId: e.target.value })}>
            {[...db.flats].sort((a, b) => a.number.localeCompare(b.number)).map(f => <option key={f.id} value={f.id}>{f.number} · {f.ownerName}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="પ્રકાર"><Select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as '2W' | '4W' })}><option value="2W">ટુ-વ્હીલર</option><option value="4W">ફોર-વ્હીલર</option></Select></Field>
          <Field label="સ્લોટ"><Input value={form.slot} onChange={e => setForm({ ...form, slot: e.target.value })} placeholder="P-25" /></Field>
        </div>
        <Field label="વાહન નંબર"><Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="GJ 05 AB 1234" /></Field>
        <div className="flex gap-2 pt-1"><Button variant="soft" full onClick={() => setOpen(false)}>રદ કરો</Button><Button full onClick={save} disabled={!form.number.trim() || !form.slot.trim()}>ઉમેરો</Button></div>
      </Modal>
    </div>
  )
}
