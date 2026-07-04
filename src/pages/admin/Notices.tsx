import { useState } from 'react'
import { Pin, Share2, Trash2, Bell } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { noticeCategories } from '../../lib/copy'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'

export default function Notices() {
  const { db, society, addNotice, togglePin } = useData()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(noticeCategories[0])
  const [pinned, setPinned] = useState(false)

  const sorted = [...db.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))

  const publish = () => {
    if (!title.trim() || !body.trim()) return
    addNotice({ title: title.trim(), body: body.trim(), category, pinned })
    setTitle(''); setBody(''); setPinned(false); setCategory(noticeCategories[0])
  }

  return (
    <div>
      <PageHeader title="નોટિસ બોર્ડ" sub="આખી સોસાયટીને એકસાથે જાણ કરો" />

      <Card className="animate-fadeUp">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><Field label="મથાળું"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="દા.ત. રવિવારે પાણી બંધ રહેશે" /></Field></div>
          <Field label="કેટેગરી"><Select value={category} onChange={e => setCategory(e.target.value)}>{noticeCategories.map(c => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <div className="mt-3"><Field label="વિગત"><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="પૂરી માહિતી અહીં લખો..." /></Field></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-[14px] text-navy-600 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ width: 18, height: 18 }} className="accent-saffron-500" />
            <Pin size={15} /> ઉપર પિન કરો (મહત્વની)
          </label>
          <Button variant="accent" onClick={publish} disabled={!title.trim() || !body.trim()}><Bell size={16} /> નોટિસ પ્રકાશિત કરો</Button>
        </div>
      </Card>

      <div className="space-y-2.5 mt-4">
        {sorted.map(n => (
          <Card key={n.id} className={n.pinned ? 'border-saffron-300 bg-saffron-50/40' : ''}>
            <div className="flex items-center gap-2 flex-wrap">
              {n.pinned && <span className="inline-flex items-center gap-1 text-saffron-600 text-[12.5px] font-bold"><Pin size={13} /> પિન કરેલી</span>}
              <Badge tone="gray">{n.category}</Badge>
              <span className="text-[12.5px] text-navy-400 ml-auto">{fmtDate(n.date)}</span>
            </div>
            <h2 className="font-bold text-navy-900 text-[16px] mt-1.5">{n.title}</h2>
            <p className="text-[14px] text-navy-600 mt-1 whitespace-pre-line">{n.body}</p>
            <div className="flex gap-3 mt-2.5">
              <button onClick={() => togglePin(n.id)} className="text-[13px] font-semibold text-navy-500 hover:text-navy-700 inline-flex items-center gap-1"><Pin size={14} /> {n.pinned ? 'અનપિન' : 'પિન કરો'}</button>
              <a href={waShare(waTemplates.newNotice(society.name, n.title))} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-paid inline-flex items-center gap-1"><Share2 size={14} /> WhatsApp</a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
