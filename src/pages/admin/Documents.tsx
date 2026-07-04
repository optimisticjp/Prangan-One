import { useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { docFolders, docPermissionLabel } from '../../lib/copy'
import { Badge, Button, Card, Field, Input, PageHeader, Select, TableWrap, td, th } from '../../components/ui'
import type { DocPermission } from '../../lib/types'
import type { Tone } from '../../components/ui'

const permTone: Record<DocPermission, Tone> = { public: 'green', committee: 'amber', accountant: 'blue', admin: 'red' }

export default function Documents() {
  const { db, addDocumentMeta } = useData()
  const [name, setName] = useState('')
  const [folder, setFolder] = useState(docFolders[0])
  const [permission, setPermission] = useState<DocPermission>('public')
  const [size, setSize] = useState('')

  const onFile = (f?: File) => {
    if (!f) return
    setName(f.name)
    setSize(f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`)
  }
  const save = () => {
    if (!name.trim()) return
    addDocumentMeta({ name: name.trim(), folder, permission, size: size || '-' })
    setName(''); setSize(''); setPermission('public'); setFolder(docFolders[0])
  }

  const list = [...db.documents].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader title="દસ્તાવેજો" sub="સોસાયટીના કાગળિયા એક જગ્યાએ, પરવાનગી પ્રમાણે" />

      <Card className="animate-fadeUp">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="ફાઈલ પસંદ કરો" hint="ડેમોમાં ફાઈલ અપલોડ થતી નથી, ફક્ત વિગત સચવાય છે">
            <label className="w-full min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer px-3">
              <Upload size={16} /> {name || 'ફાઈલ પસંદ કરો'}
              <input type="file" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            </label>
          </Field>
          <Field label="અથવા નામ લખો"><Input value={name} onChange={e => setName(e.target.value)} placeholder="દા.ત. ઓડિટ રિપોર્ટ 2025-26" /></Field>
          <Field label="ફોલ્ડર"><Select value={folder} onChange={e => setFolder(e.target.value)}>{docFolders.map(f => <option key={f}>{f}</option>)}</Select></Field>
          <Field label="કોણ જોઈ શકે?">
            <Select value={permission} onChange={e => setPermission(e.target.value as DocPermission)}>
              {(Object.keys(docPermissionLabel) as DocPermission[]).map(p => <option key={p} value={p}>{docPermissionLabel[p]}</option>)}
            </Select>
          </Field>
        </div>
        <Button className="mt-3" variant="accent" onClick={save} disabled={!name.trim()}>દસ્તાવેજ ઉમેરો</Button>
      </Card>

      <div className="mt-4">
        <TableWrap>
          <thead><tr>
            <th className={th}>નામ</th><th className={th}>ફોલ્ડર</th><th className={th}>પરવાનગી</th><th className={th}>તારીખ</th><th className={th}>સાઈઝ</th>
          </tr></thead>
          <tbody>
            {list.map(d => (
              <tr key={d.id} className="hover:bg-cream-50">
                <td className={td}><span className="inline-flex items-center gap-2 font-semibold"><FileText size={15} className="text-navy-400" /> {d.name}</span></td>
                <td className={td}>{d.folder}</td>
                <td className={td}><Badge tone={permTone[d.permission]}>{docPermissionLabel[d.permission]}</Badge></td>
                <td className={td}>{fmtDate(d.date)}</td>
                <td className={`${td} num`}>{d.size}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="text-[12.5px] text-navy-400 mt-2">અસલ ફાઈલ સ્ટોરેજ (અપલોડ/ડાઉનલોડ) Supabase Storage સાથે જોડાશે. હાલ ડેમોમાં ફક્ત વિગત સચવાય છે.</p>
      </div>
    </div>
  )
}
