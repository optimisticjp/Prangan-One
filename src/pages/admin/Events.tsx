import { useState } from 'react'
import { CalendarDays, Download, HandHeart, Plus, Wallet, PartyPopper } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, inr, todayISO } from '../../lib/format'
import { eventTypes } from '../../lib/copy'
import { exportCsv } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select } from '../../components/ui'

export default function Events() {
  const { db, flatById, addEvent, addContribution, addVolunteer, addEventExpense } = useData()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', type: eventTypes[0], date: todayISO(), note: '' })
  const [manageId, setManageId] = useState<string | null>(null)

  // sub-forms for the manage modal
  const [cFlat, setCFlat] = useState(db.flats[0]?.id ?? '')
  const [cAmt, setCAmt] = useState('')
  const [vName, setVName] = useState('')
  const [eLabel, setELabel] = useState('')
  const [eAmt, setEAmt] = useState('')

  const events = [...db.events].sort((a, b) => b.date.localeCompare(a.date))
  const managed = manageId ? db.events.find(e => e.id === manageId) : null

  const create = () => {
    if (!form.name.trim()) return
    addEvent({ name: form.name.trim(), type: form.type, date: form.date, note: form.note.trim() || undefined })
    setCreateOpen(false)
    setForm({ name: '', type: eventTypes[0], date: todayISO(), note: '' })
  }

  const csvContrib = (id: string) => {
    const e = db.events.find(x => x.id === id)!
    exportCsv(`contributions-${e.name}.csv`, ['ફ્લેટ', 'નામ', 'રકમ', 'તારીખ'],
      e.contributions.map(c => { const f = flatById(c.flatId); return [f?.number, f?.ownerName, c.amount, c.date] }))
  }

  return (
    <div>
      <PageHeader title="ઇવેન્ટ અને ફાળો" sub="તહેવાર, સભા, ફાળો અને ખર્ચ એક જગ્યાએ"
        actions={<Button variant="accent" onClick={() => setCreateOpen(true)}><Plus size={16} /> નવો ઇવેન્ટ</Button>} />

      <div className="grid sm:grid-cols-2 gap-3">
        {events.map(e => {
          const contrib = e.contributions.reduce((s, c) => s + c.amount, 0)
          const spent = e.expenses.reduce((s, x) => s + x.amount, 0)
          return (
            <Card key={e.id} className="animate-fadeUp flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={e.date >= todayISO() ? 'saffron' : 'gray'}>{e.type}</Badge>
                <span className="text-[12.5px] text-navy-400 inline-flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(e.date)}</span>
              </div>
              <h2 className="font-bold text-navy-900 text-[16.5px] mt-1.5">{e.name}</h2>
              {e.note && <p className="text-[13.5px] text-navy-500 mt-1">{e.note}</p>}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="rounded-lg bg-cream-100 border border-cream-200 py-2">
                  <div className="num font-bold text-paid text-[15px]">{inr(contrib)}</div>
                  <div className="text-[11px] text-navy-400">ફાળો</div>
                </div>
                <div className="rounded-lg bg-cream-100 border border-cream-200 py-2">
                  <div className="num font-bold text-navy-800 text-[15px]">{inr(spent)}</div>
                  <div className="text-[11px] text-navy-400">ખર્ચ</div>
                </div>
                <div className="rounded-lg bg-cream-100 border border-cream-200 py-2">
                  <div className={`num font-bold text-[15px] ${contrib - spent >= 0 ? 'text-navy-800' : 'text-over'}`}>{inr(contrib - spent)}</div>
                  <div className="text-[11px] text-navy-400">બાકી</div>
                </div>
              </div>
              <div className="text-[12.5px] text-navy-400 mt-2">{e.contributions.length} ફ્લેટે ફાળો આપ્યો · {e.volunteers.length} વોલન્ટિયર</div>
              <div className="mt-auto pt-3 flex gap-2">
                <Button variant="soft" onClick={() => { setManageId(e.id); setCAmt(''); setVName(''); setELabel(''); setEAmt('') }}>વિગત / ઉમેરો</Button>
                <Button variant="ghost" onClick={() => csvContrib(e.id)}><Download size={15} /> ફાળો CSV</Button>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="નવો ઇવેન્ટ">
        <Field label="ઇવેન્ટનું નામ"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="દા.ત. નવરાત્રી 2026" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="પ્રકાર"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{eventTypes.map(t => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="તારીખ"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        <Field label="નોંધ (વૈકલ્પિક)"><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
        <div className="flex gap-2 pt-1"><Button variant="soft" full onClick={() => setCreateOpen(false)}>રદ કરો</Button><Button full onClick={create} disabled={!form.name.trim()}>બનાવો</Button></div>
      </Modal>

      <Modal open={!!managed} onClose={() => setManageId(null)} title={managed?.name ?? ''} wide>
        {managed && (
          <div className="space-y-4">
            <div>
              <div className="text-[13.5px] font-semibold text-navy-600 mb-2 inline-flex items-center gap-1.5"><HandHeart size={15} /> ફાળો ઉમેરો</div>
              <div className="flex flex-wrap gap-2">
                <Select value={cFlat} onChange={e => setCFlat(e.target.value)} className="!w-auto flex-1 min-w-40">
                  {[...db.flats].sort((a, b) => a.number.localeCompare(b.number)).map(f => <option key={f.id} value={f.id}>{f.number} · {f.ownerName}</option>)}
                </Select>
                <Input type="number" value={cAmt} onChange={e => setCAmt(e.target.value)} placeholder="₹" className="!w-28" />
                <Button variant="accent" onClick={() => { if (Number(cAmt) > 0) { addContribution(managed.id, cFlat, Number(cAmt)); setCAmt('') } }}>ઉમેરો</Button>
              </div>
              {managed.contributions.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-[13px] space-y-1">
                  {managed.contributions.map((c, i) => {
                    const f = flatById(c.flatId)
                    return <div key={i} className="flex justify-between border-b border-cream-100 py-1"><span>ફ્લેટ {f?.number} · {f?.ownerName}</span><span className="num font-semibold">{inr(c.amount)}</span></div>
                  })}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[13.5px] font-semibold text-navy-600 mb-2">વોલન્ટિયર ઉમેરો</div>
                <div className="flex gap-2">
                  <Input value={vName} onChange={e => setVName(e.target.value)} placeholder="નામ" />
                  <Button variant="soft" onClick={() => { if (vName.trim()) { addVolunteer(managed.id, vName.trim()); setVName('') } }}>ઉમેરો</Button>
                </div>
                {managed.volunteers.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{managed.volunteers.map(v => <span key={v} className="text-[12px] bg-navy-50 border border-navy-100 rounded-full px-2 py-0.5">{v}</span>)}</div>}
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-navy-600 mb-2 inline-flex items-center gap-1.5"><Wallet size={15} /> ખર્ચ ઉમેરો</div>
                <div className="flex gap-2">
                  <Input value={eLabel} onChange={e => setELabel(e.target.value)} placeholder="શેનો ખર્ચ" />
                  <Input type="number" value={eAmt} onChange={e => setEAmt(e.target.value)} placeholder="₹" className="!w-24" />
                </div>
                <Button variant="soft" className="mt-2" onClick={() => { if (eLabel.trim() && Number(eAmt) > 0) { addEventExpense(managed.id, eLabel.trim(), Number(eAmt)); setELabel(''); setEAmt('') } }}>ઉમેરો</Button>
                {managed.expenses.length > 0 && <div className="mt-2 text-[13px] space-y-1">{managed.expenses.map((x, i) => <div key={i} className="flex justify-between"><span>{x.label}</span><span className="num font-semibold">{inr(x.amount)}</span></div>)}</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
