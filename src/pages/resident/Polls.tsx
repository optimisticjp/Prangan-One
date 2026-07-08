import { useState } from 'react'
import { Vote, CheckCircle2, Lock } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui'

export default function Polls() {
  const { db, session, vote } = useData()
  const [justVoted, setJustVoted] = useState<string | null>(null)
  const flatId = session.flatId ?? ''
  const polls = [...db.polls].sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1))

  return (
    <div>
      <PageHeader title="મતદાન" sub="એક ફ્લેટ દીઠ એક મત. તમારો અભિપ્રાય મહત્વનો છે." />
      {polls.length === 0 && <Card><EmptyState icon={<Vote size={22} />} title="હમણાં કોઈ મતદાન ચાલુ નથી" /></Card>}

      <div className="space-y-3">
        {polls.map(p => {
          const counts = p.resultCounts ?? p.options.map((_, i) => Object.values(p.votes).filter(v => v === i).length)
          const total = counts.reduce((a, b) => a + b, 0)
          const myVote = p.votes[flatId]
          const voted = myVote !== undefined
          const showResult = p.resultVisible || p.status === 'closed'

          return (
            <Card key={p.id} className="animate-fadeUp">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={p.status === 'open' ? 'green' : 'gray'}>{p.status === 'open' ? 'ચાલુ છે' : 'પૂરું થયું'}</Badge>
                {p.endDate && p.status === 'open' && <span className="text-[12.5px] text-navy-400">છેલ્લી તારીખ {fmtDate(p.endDate)}</span>}
                <span className="text-[12.5px] text-navy-400 ml-auto num">{total} મત</span>
              </div>
              <h2 className="font-bold text-navy-900 text-[16.5px] mt-1.5 leading-snug">{p.question}</h2>

              <div className="mt-3 space-y-2">
                {p.options.map((opt, i) => {
                  const pct = total ? Math.round((counts[i] / total) * 100) : 0
                  const mine = myVote === i
                  if (p.status === 'open' && !voted) {
                    return (
                      <button key={i} onClick={() => { if (vote(p.id, flatId, i)) setJustVoted(p.id) }}
                        className="w-full min-h-[48px] rounded-xl border border-cream-300 bg-white px-4 text-left font-semibold text-navy-700 hover:border-saffron-400 hover:bg-saffron-50 transition-colors">
                        {opt}
                      </button>
                    )
                  }
                  return (
                    <div key={i} className={`rounded-xl border px-3.5 py-2.5 ${mine ? 'border-saffron-300 bg-saffron-50/50' : 'border-cream-200 bg-cream-50'}`}>
                      <div className="flex justify-between text-[14px] mb-1">
                        <span className="font-semibold text-navy-700 inline-flex items-center gap-1.5">
                          {mine && <CheckCircle2 size={15} className="text-saffron-600" />} {opt}
                        </span>
                        {showResult && <span className="num text-navy-500">{counts[i]} ({pct}%)</span>}
                      </div>
                      {showResult && (
                        <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                          <div className={`h-full rounded-full ${mine ? 'bg-saffron-500' : 'bg-navy-600'}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {p.status === 'open' && voted && (
                <div className="mt-2.5 text-[13px] font-semibold text-paid inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> {justVoted === p.id ? 'તમારો મત નોંધાઈ ગયો!' : 'તમારા ફ્લેટનો મત નોંધાયેલો છે'}
                </div>
              )}
              {!p.resultVisible && p.status === 'open' && (
                <div className="mt-2 text-[12.5px] text-navy-400 inline-flex items-center gap-1"><Lock size={13} /> પરિણામ મતદાન પૂરું થયા પછી દેખાશે</div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
