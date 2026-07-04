import { useState } from 'react'
import { ChevronDown, MessageCircle, Star } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { complaintStatusLabel, complaintStatusTone } from '../../lib/copy'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { Badge, Button, Card, Input, PageHeader, Select } from '../../components/ui'
import type { ComplaintStatus } from '../../lib/types'

const FLOW: Record<ComplaintStatus, ComplaintStatus | null> = {
  new: 'assigned', assigned: 'inprogress', inprogress: 'done', done: 'closed', closed: null,
}
const filters: { key: ComplaintStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'બધી' }, { key: 'new', label: 'નવી' }, { key: 'assigned', label: 'સોંપેલ' },
  { key: 'inprogress', label: 'ચાલુ' }, { key: 'done', label: 'પૂર્ણ' }, { key: 'closed', label: 'બંધ' },
]

export default function Complaints() {
  const { db, society, flatById, advanceComplaint, addInternalNote } = useData()
  const [filter, setFilter] = useState<ComplaintStatus | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [intDraft, setIntDraft] = useState<Record<string, string>>({})
  const [assignDraft, setAssignDraft] = useState<Record<string, string>>({})

  const assignees = [
    ...db.contacts.filter(c => c.category === 'committee').map(c => c.name),
    ...db.vendors.map(v => v.name),
  ]
  const list = db.complaints
    .filter(c => filter === 'all' || c.status === filter)
    .sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent') || b.createdAt.localeCompare(a.createdAt))

  const advance = (id: string, next: ComplaintStatus) => {
    advanceComplaint(id, next, noteDraft[id]?.trim() || '', 'કમિટી', assignDraft[id] || undefined)
    setNoteDraft(s => ({ ...s, [id]: '' }))
  }

  return (
    <div>
      <PageHeader title="ફરિયાદ વ્યવસ્થાપન" sub="નોંધો, જવાબદારી સોંપો અને પ્રગતિ અપડેટ કરો" />

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {filters.map(f => {
          const n = f.key === 'all' ? db.complaints.length : db.complaints.filter(c => c.status === f.key).length
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold border transition-colors ${filter === f.key ? 'bg-navy-800 text-cream-50 border-navy-800' : 'bg-white text-navy-500 border-cream-300'}`}>
              {f.label} <span className="num opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-2.5 mt-1">
        {list.map(c => {
          const f = flatById(c.flatId)
          const isOpen = openId === c.id
          const next = FLOW[c.status]
          return (
            <Card key={c.id} className="animate-fadeUp">
              <button onClick={() => setOpenId(isOpen ? null : c.id)} className="w-full flex items-center gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
                    {c.priority === 'urgent' && <Badge tone="red">તાત્કાલિક</Badge>}
                    <span className="text-[12.5px] text-navy-400">{c.category}</span>
                  </div>
                  <div className="font-semibold text-navy-800 mt-1 leading-snug">{c.title}</div>
                  <div className="text-[12.5px] text-navy-400">ફ્લેટ {f?.number} · {f?.ownerName} · {fmtDate(c.createdAt)}</div>
                </div>
                <ChevronDown size={19} className={`text-navy-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-cream-200 space-y-3">
                  {c.detail && <p className="text-[14px] text-navy-600">{c.detail}</p>}
                  {c.photoName && <div className="text-[12.5px] text-navy-400">📎 ફોટો: {c.photoName}</div>}

                  {/* timeline */}
                  <div>
                    <div className="text-[12.5px] font-semibold text-navy-500 mb-1.5">પ્રગતિ</div>
                    <ol className="relative border-l-2 border-cream-300 ml-1.5 space-y-2">
                      {[...c.timeline].reverse().map((t, i) => (
                        <li key={i} className="ml-3.5 text-[13px]">
                          <span className={`absolute -left-[7px] h-3 w-3 rounded-full border-2 border-cream-50 ${i === 0 ? 'bg-saffron-500' : 'bg-navy-300'}`} />
                          <span className="text-navy-400">{fmtDate(t.date)} · </span>
                          <span className="font-semibold text-navy-700">{complaintStatusLabel[t.status]}</span>
                          {t.note && <span className="text-navy-500"> · {t.note}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* internal notes */}
                  <div className="bg-cream-100 border border-cream-200 rounded-xl p-3">
                    <div className="text-[12.5px] font-semibold text-navy-500 mb-1.5">આંતરિક નોંધ (ફક્ત કમિટી જુએ)</div>
                    {c.internalNotes.length > 0 && (
                      <ul className="space-y-1 mb-2">{c.internalNotes.map((n, i) => <li key={i} className="text-[13px] text-navy-600">• {n}</li>)}</ul>
                    )}
                    <div className="flex gap-2">
                      <Input value={intDraft[c.id] ?? ''} onChange={e => setIntDraft(s => ({ ...s, [c.id]: e.target.value }))} placeholder="નોંધ ઉમેરો..." />
                      <Button variant="soft" onClick={() => { if (intDraft[c.id]?.trim()) { addInternalNote(c.id, intDraft[c.id].trim()); setIntDraft(s => ({ ...s, [c.id]: '' })) } }}>ઉમેરો</Button>
                    </div>
                  </div>

                  {c.feedback && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <span className="text-[13px] font-semibold text-paid inline-flex items-center gap-1">
                        રહેવાસીનો ફીડબેક: {Array.from({ length: c.feedback.rating }).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
                      </span>
                      {c.feedback.comment && <span className="text-[13px] text-navy-600 ml-1">· {c.feedback.comment}</span>}
                    </div>
                  )}

                  {/* actions */}
                  {next && (
                    <div className="space-y-2">
                      {c.status === 'new' && (
                        <Select value={assignDraft[c.id] ?? ''} onChange={e => setAssignDraft(s => ({ ...s, [c.id]: e.target.value }))}>
                          <option value="">જવાબદાર વ્યક્તિ પસંદ કરો (વૈકલ્પિક)</option>
                          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                        </Select>
                      )}
                      <Input value={noteDraft[c.id] ?? ''} onChange={e => setNoteDraft(s => ({ ...s, [c.id]: e.target.value }))} placeholder="અપડેટ સાથે નોંધ (વૈકલ્પિક)" />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="accent" onClick={() => advance(c.id, next)}>
                          {next === 'assigned' ? 'જવાબદારી સોંપો' : next === 'inprogress' ? 'કામ શરૂ કરો' : next === 'done' ? 'પૂર્ણ તરીકે નોંધો' : 'બંધ કરો'}
                        </Button>
                        <a target="_blank" rel="noreferrer" href={waShare(waTemplates.complaintUpdate(society.name, c.title, complaintStatusLabel[c.status]))}>
                          <Button variant="soft"><MessageCircle size={15} /> રહેવાસીને જાણ કરો</Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
