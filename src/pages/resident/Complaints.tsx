import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Wrench, Mic, ImagePlus, ChevronRight, Users, Lock } from 'lucide-react'
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
  const [visibility, setVisibility] = useState<'personal' | 'community'>('personal')
  const [photoName, setPhotoName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | undefined>()

  const flatId = session.flatId ?? ''
  // "My complaints": everything filed from my own flat, personal or
  // community. "Community": everyone else's community-visibility
  // complaints too, since those are meant to be seen society-wide - a
  // broken lift affects every flat, not just whoever happened to file it.
  const mine = db.complaints
    .filter(c => c.flatId === flatId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const community = db.complaints
    .filter(c => c.visibility === 'community' && c.flatId !== flatId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submit = () => {
    if (!title.trim()) return
    addComplaint({ flatId, category, title: title.trim(), detail: detail.trim(), priority, photoName: photoName || undefined, photoFile, visibility })
    setOpen(false)
    setTitle(''); setDetail(''); setPriority('normal'); setVisibility('personal'); setPhotoName(''); setPhotoFile(undefined)
  }

  const ComplaintRow = ({ c }: { c: typeof mine[number] }) => (
    <Link to={`/app/complaints/${c.id}`} className="block animate-fadeUp">
      <Card className="hover:shadow-lift transition-shadow">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
              {c.priority === 'urgent' && <Badge tone="red">તાત્કાલિક</Badge>}
              {c.visibility === 'community'
                ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-400"><Users size={11} /> સોસાયટી</span>
                : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-300"><Lock size={11} /> ખાનગી</span>}
            </div>
            <div className="font-semibold text-navy-800 mt-1.5 leading-snug">{c.title}</div>
            <div className="text-[12.5px] text-navy-400 mt-0.5">{c.category} · {fmtDate(c.createdAt)}</div>
          </div>
          <ChevronRight className="text-navy-300 shrink-0" size={19} />
        </div>
      </Card>
    </Link>
  )

  return (
    <div>
      <PageHeader title="મારી ફરિયાદો" sub="નાની વાત પણ જણાવો, કમિટી સુધી સીધી પહોંચશે"
        actions={<Button variant="accent" onClick={() => setOpen(true)}><Plus size={17} /> ફરિયાદ કરો</Button>} />

      {mine.length === 0 ? (
        <Card><EmptyState icon={<Wrench size={22} />} title="હજુ કોઈ ફરિયાદ નથી" sub="બધું બરાબર ચાલે છે! કંઈ હોય તો ઉપરથી નોંધાવો." /></Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((c, i) => <div key={c.id} style={{ animationDelay: `${i * 40}ms` }}><ComplaintRow c={c} /></div>)}
        </div>
      )}

      {community.length > 0 && (
        <div className="mt-6">
          <div className="text-[12.5px] font-bold tracking-wide text-navy-400 uppercase mb-2.5 flex items-center gap-1.5"><Users size={13} /> સોસાયટીની ફરિયાદો</div>
          <div className="space-y-2.5">
            {community.map((c, i) => <div key={c.id} style={{ animationDelay: `${i * 40}ms` }}><ComplaintRow c={c} /></div>)}
          </div>
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
        <Field label="કોણ જોઈ શકે?">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setVisibility('personal')}
              className={`min-h-[46px] rounded-xl border font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 ${visibility === 'personal' ? 'bg-navy-800 text-cream-50 border-navy-800' : 'bg-white border-cream-300 text-navy-600'}`}>
              <Lock size={15} /> ફક્ત મારી અને કમિટી
            </button>
            <button onClick={() => setVisibility('community')}
              className={`min-h-[46px] rounded-xl border font-semibold text-[13.5px] transition-colors flex items-center justify-center gap-1.5 ${visibility === 'community' ? 'bg-navy-800 text-cream-50 border-navy-800' : 'bg-white border-cream-300 text-navy-600'}`}>
              <Users size={15} /> આખી સોસાયટી જુએ
            </button>
          </div>
          <p className="text-[12px] text-navy-400 mt-1.5">લિફ્ટ, પાર્કિંગ લાઈટ જેવી સહિયારી બાબત હોય તો "આખી સોસાયટી" પસંદ કરો, જેથી બધાને ખબર પડે કે કમિટી એના પર કામ કરે છે.</p>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-500 cursor-pointer">
            <ImagePlus size={17} /> {photoName ? 'ફોટો ✓' : 'ફોટો ઉમેરો'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; setPhotoName(f?.name ?? ''); setPhotoFile(f) }} />
          </label>
          <button disabled className="min-h-[46px] rounded-xl border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-300">
            <Mic size={17} /> વૉઇસ નોટ (જલ્દી)
          </button>
        </div>
        {photoName && (
          <div className="text-[12.5px] text-navy-400">
            ફોટો: {photoName} {!session.isRealSession && '(ડેમોમાં ફક્ત નામ સચવાય છે)'}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="soft" full onClick={() => setOpen(false)}>રદ કરો</Button>
          <Button full onClick={submit} disabled={!title.trim()}>ફરિયાદ નોંધાવો</Button>
        </div>
      </Modal>
    </div>
  )
}
