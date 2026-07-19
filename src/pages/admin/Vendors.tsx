import { useState } from 'react'
import { Download, Plus, Phone, Store as StoreIcon, Pencil } from 'lucide-react'
import { useData } from '../../lib/store'
import { useToast } from '../../components/Toast'
import { fmtDate, inr, todayISO } from '../../lib/format'
import { exportCsv } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Textarea, EmptyState } from '../../components/ui'
import type { Vendor } from '../../lib/types'

const days = (d?: string) => d ? Math.ceil((new Date(d).getTime() - new Date(todayISO()).getTime()) / 86400000) : null

function amcBadge(v: Vendor) {
  const d = days(v.amcEnd)
  if (d === null) return <Badge tone="gray">AMC નથી</Badge>
  if (d < 0) return <Badge tone="red">પૂરું થયું</Badge>
  if (d <= 60) return <Badge tone="amber">{d} દિવસ બાકી</Badge>
  return <Badge tone="green">ચાલુ છે</Badge>
}

export default function Vendors() {
  const { db, addVendor, updateVendor, canWriteNow } = useData()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const blank = { name: '', service: '', contactPerson: '', phone: '', amcStart: '', amcEnd: '', notes: '' }
  const [form, setForm] = useState(blank)

  const startAdd = () => { setEditId(null); setForm(blank); setOpen(true) }
  const startEdit = (v: Vendor) => {
    setEditId(v.id)
    setForm({ name: v.name, service: v.service, contactPerson: v.contactPerson, phone: v.phone, amcStart: v.amcStart ?? '', amcEnd: v.amcEnd ?? '', notes: v.notes ?? '' })
    setOpen(true)
  }
  const save = () => {
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(), service: form.service.trim(), contactPerson: form.contactPerson.trim(), phone: form.phone.trim(),
      amcStart: form.amcStart || undefined, amcEnd: form.amcEnd || undefined, notes: form.notes.trim() || undefined,
    }
    if (editId) updateVendor(editId, payload)
    else addVendor(payload)
    if (!canWriteNow) return
    setOpen(false)
    toast.success(editId ? 'વેન્ડરની વિગત સચવાઈ' : 'નવો વેન્ડર ઉમેરાયો')
  }

  const serviceHistory = (id: string) => {
    const rows = db.expenses.filter(e => e.vendorId === id)
    return { count: rows.length, total: rows.reduce((s, e) => s + e.amount, 0) }
  }

  const csv = () => exportCsv('vendors.csv',
    ['નામ', 'સેવા', 'સંપર્ક', 'ફોન', 'AMC શરૂ', 'AMC પૂરું', 'કુલ ચુકવણી', 'નોંધ'],
    db.vendors.map(v => {
      const h = serviceHistory(v.id)
      return [v.name, v.service, v.contactPerson, v.phone, v.amcStart ?? '', v.amcEnd ?? '', h.total, v.notes ?? '']
    }))

  return (
    <div>
      <PageHeader title="વેન્ડર અને AMC" sub="સર્વિસ આપનારા અને એમના કોન્ટ્રાક્ટની મુદત"
        actions={<>
          <Button variant="soft" onClick={csv}><Download size={16} /> CSV</Button>
          <Button variant="accent" onClick={startAdd}><Plus size={16} /> વેન્ડર ઉમેરો</Button>
        </>} />

      {db.vendors.length === 0 && <Card><EmptyState icon={<StoreIcon size={22} />} title="હજુ કોઈ વેન્ડર નથી" /></Card>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {db.vendors.map(v => {
          const h = serviceHistory(v.id)
          return (
            <Card key={v.id} className="animate-fadeUp flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-navy-900">{v.name}</div>
                  <div className="text-[13px] text-navy-400">{v.service}</div>
                </div>
                {amcBadge(v)}
              </div>
              <div className="mt-2.5 space-y-1 text-[13.5px] text-navy-600">
                {v.contactPerson && <div>સંપર્ક: <b className="text-navy-700">{v.contactPerson}</b></div>}
                {v.phone && <div className="num inline-flex items-center gap-1.5"><Phone size={13} /> {v.phone}</div>}
                {v.amcEnd && <div className="text-[12.5px] text-navy-400">AMC: {v.amcStart ? fmtDate(v.amcStart) : '-'} થી {fmtDate(v.amcEnd)}</div>}
              </div>
              {v.notes && <div className="mt-2 text-[12.5px] text-navy-500 bg-cream-100 border border-cream-200 rounded-lg px-2.5 py-1.5">{v.notes}</div>}
              <div className="mt-auto pt-3 flex items-center justify-between">
                <div className="text-[12.5px] text-navy-400">{h.count > 0 ? <>ચૂકવ્યું: <b className="num text-navy-600">{inr(h.total)}</b> · {h.count} વાર</> : 'હજુ ચુકવણી નથી'}</div>
                <button onClick={() => startEdit(v)} className="text-[13px] font-semibold text-saffron-600 inline-flex items-center gap-1 hover:text-saffron-700"><Pencil size={13} /> બદલો</button>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'વેન્ડર બદલો' : 'નવો વેન્ડર'}>
        <Field label="નામ"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="દા.ત. ઓમ લિફ્ટ કેર" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="સેવા"><Input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="લિફ્ટ AMC" /></Field>
          <Field label="સંપર્ક વ્યક્તિ"><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></Field>
        </div>
        <Field label="ફોન"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="90000 00000" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="AMC શરૂ તારીખ"><Input type="date" value={form.amcStart} onChange={e => setForm({ ...form, amcStart: e.target.value })} /></Field>
          <Field label="AMC પૂરી તારીખ"><Input type="date" value={form.amcEnd} onChange={e => setForm({ ...form, amcEnd: e.target.value })} /></Field>
        </div>
        <Field label="નોંધ"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="કરારની શરતો, વગેરે" /></Field>
        <div className="flex gap-2 pt-1">
          <Button variant="soft" full onClick={() => setOpen(false)}>રદ કરો</Button>
          <Button full onClick={save} disabled={!form.name.trim()}>સાચવો</Button>
        </div>
      </Modal>
    </div>
  )
}
