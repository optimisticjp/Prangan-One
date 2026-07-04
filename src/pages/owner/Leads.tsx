import { useState } from 'react'
import { Phone, Mail } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { Badge, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import type { PublicLead } from '../../lib/types'

const statusLabel: Record<PublicLead['status'], string> = { new: 'નવી', contacted: 'સંપર્ક થયો', converted: 'ક્લાયન્ટ બન્યા', closed: 'બંધ' }
const statusTone: Record<PublicLead['status'], 'saffron' | 'blue' | 'green' | 'gray'> = { new: 'saffron', contacted: 'blue', converted: 'green', closed: 'gray' }

export default function OwnerLeads() {
  const { rawDb, updateLeadStatus } = useData()
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})

  const leads = [...rawDb.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      <PageHeader title="લીડ ઈનબોક્સ" sub={`કુલ ${leads.length} લીડ, પબ્લિક વેબસાઈટના ફોર્મ પરથી`} />
      {leads.length === 0 && <Card><p className="text-navy-400">હજુ કોઈ લીડ નથી.</p></Card>}
      <div className="space-y-3">
        {leads.map(l => (
          <Card key={l.id}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-bold text-navy-900">{l.name} · {l.societyName}</div>
                <div className="text-[13px] text-navy-400">{l.city} · {l.flatCount} ફ્લેટ · {l.role}</div>
              </div>
              <Badge tone={statusTone[l.status]}>{statusLabel[l.status]}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-[13.5px] text-navy-600">
              <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 hover:text-saffron-600"><Phone size={14} /> {l.phone}</a>
              <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:text-saffron-600"><Mail size={14} /> {l.email}</a>
              <span className="text-navy-400">{fmtDate(l.createdAt)}</span>
            </div>
            {l.message && <p className="text-[13.5px] text-navy-600 mt-2 bg-cream-100 border border-cream-200 rounded-lg px-3 py-2">{l.message}</p>}
            {l.internalNote && <p className="text-[12.5px] text-navy-500 mt-2">આંતરિક નોંધ: {l.internalNote}</p>}
            <div className="flex flex-wrap items-end gap-2 mt-3">
              <Field label="સ્થિતિ બદલો">
                <Select value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value as PublicLead['status'])}>
                  <option value="new">નવી</option><option value="contacted">સંપર્ક થયો</option><option value="converted">ક્લાયન્ટ બન્યા</option><option value="closed">બંધ</option>
                </Select>
              </Field>
              <Input value={noteDraft[l.id] ?? ''} onChange={e => setNoteDraft(s => ({ ...s, [l.id]: e.target.value }))} placeholder="નોંધ ઉમેરો..." className="flex-1 min-w-40" />
              <button onClick={() => { if (noteDraft[l.id]?.trim()) { updateLeadStatus(l.id, l.status, noteDraft[l.id].trim()); setNoteDraft(s => ({ ...s, [l.id]: '' })) } }}
                className="text-[13px] font-semibold text-saffron-600 h-[46px] px-1">સાચવો</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
