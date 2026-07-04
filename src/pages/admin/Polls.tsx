import { useState } from 'react'
import { Download, Plus, Trash2, Vote, X } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { exportCsv } from '../../lib/csv'
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'

export default function Polls() {
  const { db, addPoll, closePoll } = useData()
  const [type, setType] = useState<'yesno' | 'multi'>('yesno')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [resultVisible, setResultVisible] = useState(true)
  const [endDate, setEndDate] = useState('')

  const setOpt = (i: number, v: string) => setOptions(o => o.map((x, idx) => idx === i ? v : x))
  const create = () => {
    if (!question.trim()) return
    const opts = type === 'yesno' ? ['હા', 'ના'] : options.map(o => o.trim()).filter(Boolean)
    if (type === 'multi' && opts.length < 2) return
    addPoll({ question: question.trim(), type, options: opts, resultVisible, endDate: endDate || undefined })
    setQuestion(''); setOptions(['', '']); setType('yesno'); setResultVisible(true); setEndDate('')
  }

  const csv = (pollId: string) => {
    const p = db.polls.find(x => x.id === pollId)!
    const counts = p.options.map((_, i) => Object.values(p.votes).filter(v => v === i).length)
    exportCsv(`poll-results.csv`, ['વિકલ્પ', 'મત'], p.options.map((o, i) => [o, counts[i]]))
  }

  const polls = [...db.polls].sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1))

  return (
    <div>
      <PageHeader title="મતદાન" sub="સોસાયટીના નિર્ણય માટે સભ્યોનો અભિપ્રાય લો" />

      <Card className="animate-fadeUp">
        <Field label="પ્રશ્ન"><Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="દા.ત. વધારાના CCTV લગાવવા?" /></Field>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <Field label="પ્રકાર">
            <Select value={type} onChange={e => setType(e.target.value as 'yesno' | 'multi')}>
              <option value="yesno">હા / ના</option><option value="multi">ઘણા વિકલ્પ</option>
            </Select>
          </Field>
          <Field label="છેલ્લી તારીખ (વૈકલ્પિક)"><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
        </div>

        {type === 'multi' && (
          <div className="mt-3">
            <div className="text-[13.5px] font-semibold text-navy-600 mb-1.5">વિકલ્પો</div>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`વિકલ્પ ${i + 1}`} />
                  {options.length > 2 && <Button variant="ghost" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}><X size={16} /></Button>}
                </div>
              ))}
            </div>
            <Button variant="soft" className="mt-2" onClick={() => setOptions([...options, ''])}><Plus size={15} /> વિકલ્પ ઉમેરો</Button>
          </div>
        )}

        <label className="mt-3 flex items-center gap-2 text-[14px] text-navy-600 cursor-pointer">
          <input type="checkbox" checked={resultVisible} onChange={e => setResultVisible(e.target.checked)} style={{ width: 18, height: 18 }} className="accent-saffron-500" />
          મતદાન ચાલુ હોય ત્યારે પણ પરિણામ બતાવો
        </label>
        <Button className="mt-4" variant="accent" onClick={create} disabled={!question.trim()}><Vote size={16} /> મતદાન શરૂ કરો</Button>
      </Card>

      <div className="space-y-3 mt-4">
        {polls.map(p => {
          const counts = p.options.map((_, i) => Object.values(p.votes).filter(v => v === i).length)
          const total = counts.reduce((a, b) => a + b, 0)
          return (
            <Card key={p.id}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={p.status === 'open' ? 'green' : 'gray'}>{p.status === 'open' ? 'ચાલુ' : 'બંધ'}</Badge>
                {!p.resultVisible && <Badge tone="amber">પરિણામ છુપું</Badge>}
                {p.endDate && <span className="text-[12.5px] text-navy-400">છેલ્લી તારીખ {fmtDate(p.endDate)}</span>}
                <span className="text-[12.5px] text-navy-400 ml-auto num">{total} મત</span>
              </div>
              <h2 className="font-bold text-navy-900 text-[16px] mt-1.5">{p.question}</h2>
              <div className="mt-2.5 space-y-2">
                {p.options.map((o, i) => {
                  const pct = total ? Math.round((counts[i] / total) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[13.5px] mb-1"><span className="font-medium text-navy-700">{o}</span><span className="num text-navy-500">{counts[i]} ({pct}%)</span></div>
                      <div className="h-2 rounded-full bg-cream-200 overflow-hidden"><div className="h-full rounded-full bg-navy-600" style={{ width: `${pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-3">
                {p.status === 'open' && <Button variant="soft" onClick={() => closePoll(p.id)}>મતદાન બંધ કરો</Button>}
                <Button variant="ghost" onClick={() => csv(p.id)}><Download size={15} /> પરિણામ CSV</Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
