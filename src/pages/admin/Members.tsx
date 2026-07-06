import { useMemo, useState } from 'react'
import { Download, Plus, Search, Upload, AlertTriangle, CheckCircle2, UserPlus, X, Clock3, Pencil } from 'lucide-react'
import { useData } from '../../lib/store'
import { inr } from '../../lib/format'
import { exportCsv, parseCsv, validateFlatImport } from '../../lib/csv'
import type { FlatImportResult } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, TableWrap, td, th } from '../../components/ui'

export default function Members() {
  const { db, society, flatPending, addFlat, addFlatsBulk, approveMembership, rejectMembership, updateFlat } = useData()
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null)
  const [overrideValue, setOverrideValue] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ number: '', floor: 1, ownerName: '', phone: '', email: '', occupancy: 'owner' as 'owner' | 'tenant', tenantName: '', tenantEmail: '', sqft: 980 })

  // Self-enrolled residents (via /join) whose phone didn't match the flat
  // record on file - a committee member confirms with one tap before
  // they can actually log in. See selfEnrollResident() in store.tsx.
  const pendingResidents = useMemo(() => db.memberships.filter(m => m.status === 'pending'), [db.memberships])
  const flatNumberFor = (flatId?: string) => db.flats.find(f => f.id === flatId)?.number ?? '?'

  const [importOpen, setImportOpen] = useState(false)
  const [importResult, setImportResult] = useState<FlatImportResult | null>(null)
  const [importDone, setImportDone] = useState<{ added: number; skippedDuplicates: string[] } | null>(null)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return db.flats.filter(f =>
      !s || f.number.includes(s) || f.ownerName.toLowerCase().includes(s) ||
      (f.tenantName ?? '').toLowerCase().includes(s) || f.phone.includes(s),
    ).sort((a, b) => a.number.localeCompare(b.number))
  }, [db.flats, q])

  const save = () => {
    if (!form.number.trim() || !form.ownerName.trim()) return
    addFlat({
      number: form.number.trim(), floor: Number(form.floor) || 1, ownerName: form.ownerName.trim(),
      phone: form.phone.trim() || '-', email: form.email.trim() || undefined, occupancy: form.occupancy,
      tenantName: form.occupancy === 'tenant' ? form.tenantName.trim() : undefined,
      tenantEmail: form.occupancy === 'tenant' ? (form.tenantEmail.trim() || undefined) : undefined,
      sqft: Number(form.sqft) || 0,
    })
    setOpen(false)
    setForm({ number: '', floor: 1, ownerName: '', phone: '', email: '', occupancy: 'owner', tenantName: '', tenantEmail: '', sqft: 980 })
  }

  const csv = () => exportCsv('members.csv',
    ['ફ્લેટ', 'માળ', 'માલિક', 'ભાડૂત', 'ફોન', 'પ્રકાર', 'સાઈઝ sqft', 'બાકી રકમ'],
    list.map(f => [f.number, f.floor, f.ownerName, f.tenantName ?? '', f.phone, f.occupancy === 'tenant' ? 'ભાડૂત' : 'માલિક', f.sqft, flatPending(f.id)]))

  const onImportFile = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    setImportResult(validateFlatImport(rows))
    setImportDone(null)
  }
  const confirmImport = () => {
    if (!importResult || importResult.valid.length === 0) return
    const result = addFlatsBulk(importResult.valid)
    setImportDone(result)
    setImportResult(null)
  }
  const closeImport = () => { setImportOpen(false); setImportResult(null); setImportDone(null) }

  return (
    <div>
      <PageHeader title="સભ્યો અને ફ્લેટ" sub={`કુલ ${db.flats.length} ફ્લેટ`}
        actions={<>
          <Button variant="soft" onClick={csv}><Download size={16} /> CSV એક્સપોર્ટ</Button>
          <Button variant="soft" onClick={() => setImportOpen(true)}><Upload size={16} /> CSV આયાત</Button>
          <Button variant="accent" onClick={() => setOpen(true)}><Plus size={16} /> ફ્લેટ ઉમેરો</Button>
        </>} />

      {pendingResidents.length > 0 && (
        <Card className="mb-4 border-saffron-300 bg-saffron-50/40">
          <h2 className="font-bold text-navy-800 mb-1 inline-flex items-center gap-2"><Clock3 size={17} className="text-pend" /> મંજૂરીની રાહ જોતા રહેવાસી ({pendingResidents.length})</h2>
          <p className="text-[12.5px] text-navy-400 mb-3">આ લોકોએ /join પર કોડ નાખીને જોડાવાનો પ્રયત્ન કર્યો, પણ તેમની વિગતો ફ્લેટના રેકોર્ડ સાથે સીધી મળી નથી.</p>
          <div className="space-y-2">
            {pendingResidents.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white rounded-xl border border-cream-200 px-3.5 py-2.5">
                <div className="text-[13.5px]">
                  <div className="font-semibold text-navy-900">{m.name ?? m.email} <span className="text-navy-400 font-normal">· ફ્લેટ {flatNumberFor(m.flatId)}</span></div>
                  <div className="text-[12px] text-navy-400">{m.email} · {m.phone}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="soft" onClick={() => approveMembership(m.id)}><CheckCircle2 size={15} /> મંજૂર</Button>
                  <button onClick={() => rejectMembership(m.id)} className="h-9 w-9 rounded-lg text-navy-400 hover:bg-cream-100 flex items-center justify-center" aria-label="નકારો"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="relative mb-3 max-w-sm">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="નામ, ફ્લેટ કે ફોનથી શોધો..." className="pl-10" />
      </div>

      <TableWrap>
        <thead><tr>
          <th className={th}>ફ્લેટ</th><th className={th}>નામ</th><th className={th}>ફોન</th>
          <th className={th}>પ્રકાર</th><th className={th}>સાઈઝ</th><th className={th}>બિલિંગ</th><th className={th}>બાકી</th>
        </tr></thead>
        <tbody>
          {list.map(f => {
            const pending = flatPending(f.id)
            return (
              <tr key={f.id} className="hover:bg-cream-50">
                <td className={`${td} font-bold num`}>{f.number}</td>
                <td className={td}>
                  <div className="font-semibold">{f.ownerName}</div>
                  {f.tenantName && <div className="text-[12.5px] text-navy-400">ભાડૂત: {f.tenantName}</div>}
                </td>
                <td className={`${td} num`}>{f.phone}</td>
                <td className={td}><Badge tone={f.occupancy === 'tenant' ? 'blue' : 'green'}>{f.occupancy === 'tenant' ? 'ભાડૂત' : 'માલિક'}</Badge></td>
                <td className={`${td} num`}>{f.sqft}</td>
                <td className={td}>
                  <button onClick={() => { setOverrideTarget(f.id); setOverrideValue(f.maintenanceOverride?.toString() ?? '') }}
                    className="inline-flex items-center gap-1 text-[13px] hover:text-saffron-600">
                    <span className="num">{inr(f.maintenanceOverride ?? society.maintenanceAmount)}</span>
                    {f.maintenanceOverride !== undefined && <span className="text-[10.5px] text-saffron-600 font-semibold">અલગ</span>}
                    <Pencil size={12} className="text-navy-300" />
                  </button>
                </td>
                <td className={`${td} num font-bold ${pending > 0 ? 'text-over' : pending < 0 ? 'text-paid' : 'text-navy-400'}`}>
                  {pending > 0 ? inr(pending) : pending < 0 ? `+${inr(Math.abs(pending))}` : '✓'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>

      <Modal open={overrideTarget !== null} onClose={() => setOverrideTarget(null)} title="આ ફ્લેટ માટે અલગ બિલિંગ રકમ">
        <p className="text-[13px] text-navy-500 mb-3">ખાલી છોડો તો સોસાયટીની સામાન્ય રકમ (₹{society.maintenanceAmount}) લાગુ થશે.</p>
        <Input type="number" value={overrideValue} onChange={e => setOverrideValue(e.target.value)} placeholder={`₹${society.maintenanceAmount} (સામાન્ય)`} className="mb-3" />
        <div className="flex gap-2">
          <Button variant="soft" full onClick={() => { if (overrideTarget) updateFlat(overrideTarget, { maintenanceOverride: undefined }); setOverrideTarget(null) }}>સામાન્ય રકમ પર પાછા જાઓ</Button>
          <Button variant="accent" full onClick={() => {
            if (overrideTarget) updateFlat(overrideTarget, { maintenanceOverride: overrideValue.trim() ? Number(overrideValue) : undefined })
            setOverrideTarget(null)
          }}>સાચવો</Button>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="નવો ફ્લેટ ઉમેરો">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ફ્લેટ નંબર"><Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="605" /></Field>
          <Field label="માળ"><Input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: Number(e.target.value) })} /></Field>
        </div>
        <Field label="માલિકનું નામ"><Input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ફોન"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="90000 00000" /></Field>
          <Field label="ઈમેલ (લોગિન માટે)" hint="વૈકલ્પિક, પણ લોગિન માટે જરૂરી છે"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="કોણ રહે છે?">
            <Select value={form.occupancy} onChange={e => setForm({ ...form, occupancy: e.target.value as 'owner' | 'tenant' })}>
              <option value="owner">માલિક</option><option value="tenant">ભાડૂત</option>
            </Select>
          </Field>
          <Field label="સાઈઝ (sqft)"><Input type="number" value={form.sqft} onChange={e => setForm({ ...form, sqft: Number(e.target.value) })} /></Field>
        </div>
        {form.occupancy === 'tenant' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="ભાડૂતનું નામ"><Input value={form.tenantName} onChange={e => setForm({ ...form, tenantName: e.target.value })} /></Field>
            <Field label="ભાડૂતનો ઈમેલ"><Input type="email" value={form.tenantEmail} onChange={e => setForm({ ...form, tenantEmail: e.target.value })} /></Field>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="soft" full onClick={() => setOpen(false)}>રદ કરો</Button>
          <Button full onClick={save} disabled={!form.number.trim() || !form.ownerName.trim()}>સાચવો</Button>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={closeImport} title="CSV થી ફ્લેટ આયાત કરો" wide>
        {!importResult && !importDone && (
          <div>
            <p className="text-[13.5px] text-navy-500 mb-3">
              કોલમ ક્રમ: number, floor, ownerName, phone, email, occupancy (owner/tenant), tenantName, tenantEmail, sqft.
              પહેલી હરોળ હેડર તરીકે ઓળખાય છે (વૈકલ્પિક).
            </p>
            <label className="w-full min-h-[80px] rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 flex flex-col items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer">
              <Upload size={22} /> CSV ફાઈલ પસંદ કરો
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => onImportFile(e.target.files?.[0])} />
            </label>
          </div>
        )}

        {importResult && (
          <div>
            <div className="flex flex-wrap gap-3 mb-3">
              <Badge tone="green">{importResult.valid.length} યોગ્ય હરોળ</Badge>
              {importResult.errors.length > 0 && <Badge tone="red">{importResult.errors.length} ભૂલ સાથે</Badge>}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mb-3 max-h-32 overflow-y-auto rounded-lg bg-red-50 border border-red-100 p-2.5 space-y-1">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="text-[12.5px] text-over flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> હરોળ {e.rowIndex}: {e.reason}</div>
                ))}
              </div>
            )}
            <TableWrap>
              <thead><tr><th className={th}>ફ્લેટ</th><th className={th}>નામ</th><th className={th}>પ્રકાર</th><th className={th}>ફોન</th></tr></thead>
              <tbody>
                {importResult.valid.slice(0, 20).map((r, i) => (
                  <tr key={i}><td className={`${td} num`}>{r.number}</td><td className={td}>{r.ownerName}</td><td className={td}>{r.occupancy === 'tenant' ? 'ભાડૂત' : 'માલિક'}</td><td className={`${td} num`}>{r.phone}</td></tr>
                ))}
              </tbody>
            </TableWrap>
            {importResult.valid.length > 20 && <p className="text-[12px] text-navy-400 mt-1.5">... અને બીજી {importResult.valid.length - 20} હરોળ</p>}
            <div className="flex gap-2 pt-4">
              <Button variant="soft" full onClick={closeImport}>રદ કરો</Button>
              <Button full onClick={confirmImport} disabled={importResult.valid.length === 0}>{importResult.valid.length} ફ્લેટ ઉમેરો</Button>
            </div>
          </div>
        )}

        {importDone && (
          <div>
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-paid font-semibold">
              <CheckCircle2 size={18} /> {importDone.added} ફ્લેટ ઉમેરાયા
            </div>
            {importDone.skippedDuplicates.length > 0 && (
              <div className="mt-2 text-[13px] text-navy-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                આ ફ્લેટ નંબર પહેલેથી હતા, છોડી દીધા: {importDone.skippedDuplicates.join(', ')}
              </div>
            )}
            <Button full className="mt-4" onClick={closeImport}>બંધ કરો</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
