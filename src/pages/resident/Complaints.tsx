import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Wrench, Mic, ImagePlus, ChevronRight } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { complaintCategories, complaintStatusLabel, complaintStatusTone } from '../../lib/copy'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '../../components/ui'

export default function Complaints() {
  const { db, session, addComplaint } = useData()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(complaintCategories[0])
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [photoName, setPhotoName] = useState('')

  const flatId = session.flatId ?? ''
  const mine = db.complaints
    .filter(c => c.flatId === flatId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submit = () => {
    if (!title.trim()) return
    addComplaint({ flatId, category, title: title.trim(), detail: detail.trim(), priority, photoName: photoName || undefined })
    setOpen(false)
    setTitle(''); setDetail(''); setPriority('normal'); setPhotoName('')
  }

  return (
    <div>
      <PageHeader title="મારી ફરિયાદો" sub="નાની વાત પણ જણાવો, કમિટી સુધી સીધી પહોંચશે"
        actions={<Button variant="accent" onClick={() => setOpen(true)}><Plus size={17} /> ફરિયાદ કરો</Button>} />

      {mine.length === 0 ? (
        <Card><EmptyState icon={<Wrench size={22} />} title="હજુ કોઈ ફરિયાદ નથી" sub="બધું બરાબર ચાલે છે! કંઈ હોય તો ઉપરથી નોંધાવો." /></Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((c, i) => (
            <Link key={c.id} to={`/app/complaints/${c.id}`} className="block animate-fadeUp" style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="hover:shadow-lift transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
                      {c.priority === 'urgent' && <Badge tone="red">તાત્કાલિક</Badge>}
                    </div>
                    <div className="font-semibold text-navy-800 mt-1.5 leading-snug">{c.title}</div>
                    <div className="text-[12.5px] text-navy-400 mt-0.5">{c.category} · {fmtDate(c.createdAt)}</div>
                  </div>
                  <ChevronRight className="text-navy-300 shrink-0" size={19} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="નવી ફરિયાદ">
        <Field label="ફરિયાદ કઈ બાબતની છે?">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {complaintCategories.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="ટૂંકમાં લખો">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="દા.ત. લિફ્ટ અવાજ કરે છે" />
        </Field>
        <Field label="થોડી વધુ વિગત (વૈકલ્પિક)">
          <Textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="ક્યારે, ક્યાં, શું થાય છે..." />
        </Field>
        <Field label="કેટલું અગત્યનું છે?">
          <div className="grid grid-cols-2 gap-2">
            {(['normal', 'urgent'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                className={`min-h-[46px] rounded-xl border font-semibold text-[14.5px] transition-colors ${priority === p ? 'bg-navy-800 text-cream-50 border-navy-800' : 'bg-white border-cream-300 text-navy-600'}`}>
                {p === 'normal' ? 'સામાન્ય' : 'તાત્કાલિક'}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer">
            <ImagePlus size={17} /> {photoName ? 'ફોટો ✓' : 'ફોટો ઉમેરો'}
            <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoName(e.target.files?.[0]?.name ?? '')} />
          </label>
          <button disabled className="min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-300">
            <Mic size={17} /> વૉઇસ નોટ (જલ્દી)
          </button>
        </div>
        {photoName && <div className="text-[12.5px] text-navy-400">ફોટો: {photoName} (ડેમોમાં ફક્ત નામ સચવાય છે)</div>}
        <div className="flex gap-2 pt-1">
          <Button variant="soft" full onClick={() => setOpen(false)}>રદ કરો</Button>
          <Button full onClick={submit} disabled={!title.trim()}>ફરિયાદ નોંધાવો</Button>
        </div>
      </Modal>
    </div>
  )
}
