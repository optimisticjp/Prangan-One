import { CalendarDays, HandHeart, CheckCircle2, PartyPopper } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, inr, todayISO } from '../../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'

export default function Events() {
  const { db, session, flatById, addVolunteer } = useData()
  const flat = session.flatId ? flatById(session.flatId) : undefined
  const myName = flat ? (flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName) : ''

  const events = [...db.events].sort((a, b) => b.date.localeCompare(a.date))
  const upcoming = events.filter(e => e.date >= todayISO()).reverse()
  const past = events.filter(e => e.date < todayISO())

  const EventCard = ({ id }: { id: string }) => {
    const e = db.events.find(x => x.id === id)!
    const contribTotal = e.contributions.reduce((s, c) => s + c.amount, 0)
    const expenseTotal = e.expenses.reduce((s, x) => s + x.amount, 0)
    const myContrib = flat ? e.contributions.find(c => c.flatId === flat.id) : undefined
    const isVolunteer = e.volunteers.includes(myName)
    const isUpcoming = e.date >= todayISO()

    return (
      <Card className="animate-fadeUp">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={isUpcoming ? 'saffron' : 'gray'}>{e.type}</Badge>
          <span className="text-[12.5px] text-navy-400 inline-flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(e.date)}</span>
        </div>
        <h2 className="font-bold text-navy-900 text-[17px] mt-1.5">{e.name}</h2>
        {e.note && <p className="text-[14px] text-navy-600 mt-1">{e.note}</p>}

        {(contribTotal > 0 || expenseTotal > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-cream-100 border border-cream-200 px-3 py-2.5">
              <div className="text-[12px] text-navy-400">ફાળો ભેગો થયો</div>
              <div className="num font-bold text-paid text-[17px]">{inr(contribTotal)}</div>
              <div className="text-[11.5px] text-navy-400 num">{e.contributions.length} ફ્લેટ</div>
            </div>
            <div className="rounded-xl bg-cream-100 border border-cream-200 px-3 py-2.5">
              <div className="text-[12px] text-navy-400">ખર્ચ થયો</div>
              <div className="num font-bold text-navy-800 text-[17px]">{inr(expenseTotal)}</div>
            </div>
          </div>
        )}

        {flat && e.contributions.length > 0 && (
          <div className={`mt-2.5 text-[13.5px] rounded-lg px-3 py-2 border ${myContrib ? 'bg-green-50 border-green-200 text-paid' : 'bg-amber-50 border-amber-200 text-pend'}`}>
            {myContrib ? <>તમારો ફાળો {inr(myContrib.amount)} નોંધાયેલો છે ✓</> : 'તમારો ફાળો હજુ બાકી છે. ખજાનચીને આપી શકો છો.'}
          </div>
        )}

        {e.volunteers.length > 0 && (
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-navy-600 mb-1.5 inline-flex items-center gap-1.5"><HandHeart size={15} /> વોલન્ટિયર</div>
            <div className="flex flex-wrap gap-1.5">
              {e.volunteers.map(v => <span key={v} className="text-[12.5px] bg-navy-50 border border-navy-100 text-navy-700 rounded-full px-2.5 py-1">{v}</span>)}
            </div>
          </div>
        )}
        {isUpcoming && flat && (
          isVolunteer
            ? <div className="mt-2.5 text-[13px] font-semibold text-paid inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> તમે વોલન્ટિયર છો, આભાર!</div>
            : <Button variant="soft" className="mt-3" onClick={() => addVolunteer(e.id, myName)}><HandHeart size={16} /> હું વોલન્ટિયર બનીશ</Button>
        )}
      </Card>
    )
  }

  return (
    <div>
      <PageHeader title="ઇવેન્ટ અને મીટિંગ" sub="તહેવાર, સભા અને સોસાયટીની પ્રવૃત્તિ" />
      {events.length === 0 && <Card><EmptyState icon={<PartyPopper size={22} />} title="હજુ કોઈ ઇવેન્ટ નથી" /></Card>}
      {upcoming.length > 0 && (
        <>
          <h2 className="font-bold text-navy-800 text-[15px] mb-2">આવનારા</h2>
          <div className="space-y-3">{upcoming.map(e => <EventCard key={e.id} id={e.id} />)}</div>
        </>
      )}
      {past.length > 0 && (
        <>
          <h2 className="font-bold text-navy-800 text-[15px] mt-5 mb-2">પૂરા થયેલા</h2>
          <div className="space-y-3">{past.map(e => <EventCard key={e.id} id={e.id} />)}</div>
        </>
      )}
    </div>
  )
}
