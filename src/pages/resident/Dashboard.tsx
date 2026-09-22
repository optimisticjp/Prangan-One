import { Link } from 'react-router-dom'
import { IndianRupee, ReceiptText, Wrench, Bell, ChevronRight, CalendarDays, Phone } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, inr, thisMonth, todayISO } from '../../lib/format'
import { complaintStatusLabel, complaintStatusTone } from '../../lib/copy'
import { prefetchHandlers } from '../../lib/prefetch'
import { Badge, Card } from '../../components/ui'

export default function Dashboard() {
  const { db, session, flatById, flatPending, billStatus } = useData()
  const flat = session.flatId ? flatById(session.flatId) : undefined
  if (!flat) return null

  const name = (flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName).split(' ')[0]
  const pending = flatPending(flat.id)
  const curBill = db.bills.find(b => b.flatId === flat.id && b.month === thisMonth())
  const myComplaints = db.complaints.filter(c => c.flatId === flat.id && c.status !== 'closed')
  const pinned = db.notices.filter(n => n.pinned)[0] ?? db.notices[0]
  const nextEvent = [...db.events].filter(e => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0]

  const quick = [
    { to: '/app/bill', icon: IndianRupee, label: 'મારું બિલ' },
    { to: '/app/receipts', icon: ReceiptText, label: 'રસીદ જુઓ' },
    { to: '/app/complaints', icon: Wrench, label: 'ફરિયાદ કરો' },
    { to: '/app/notices', icon: Bell, label: 'નોટિસ' },
  ]

  return (
    <div className="space-y-3">
      <div className="animate-fadeUp flex items-end justify-between gap-3">
        <h1 className="text-[20px] font-bold leading-tight text-navy-900">નમસ્તે, {name} 🙏</h1>
        <p className="shrink-0 text-[11px] text-navy-400">આજે {fmtDate(todayISO())}</p>
      </div>

      {/* pending amount: the one number that matters */}
      <Link to="/app/bill" className="block animate-fadeUp" {...prefetchHandlers('/app/bill')}>
        <div className={`rounded-xl p-3.5 shadow-soft border ${pending > 0 ? 'bg-navy-800 border-navy-700' : pending < 0 ? 'bg-green-50 border-green-200' : 'bg-white border-cream-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-[11.5px] font-semibold ${pending > 0 ? 'text-cream-200/85' : pending < 0 ? 'text-paid' : 'text-navy-400'}`}>{pending < 0 ? 'તમારી ક્રેડિટ' : 'બાકી રકમ'}</div>
              <div className={`num text-[28px] font-bold leading-tight ${pending > 0 ? 'text-saffron-400' : 'text-paid'}`}>{inr(Math.abs(pending))}</div>
              <div className={`text-[11.5px] mt-0.5 ${pending > 0 ? 'text-cream-200/75' : pending < 0 ? 'text-paid' : 'text-navy-400'}`}>
                {pending > 0
                  ? (curBill && billStatus(curBill) !== 'paid' ? `આ મહિનાનું બિલ તા. ${curBill.dueDate.slice(-2)} સુધીમાં ભરવા વિનંતી` : 'જૂનું બાકી છે, વિગત જુઓ')
                  : pending < 0 ? 'આ રકમ તમારા આગલા બિલમાં એડજસ્ટ થશે.' : 'બધું ચૂકવેલ છે. આભાર! 🎉'}
              </div>
            </div>
            <ChevronRight className={pending > 0 ? 'text-cream-200/60' : 'text-navy-300'} />
          </div>
        </div>
      </Link>

      {/* quick actions */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-cream-200 bg-white p-1.5">
        {quick.map((q, i) => (
          <Link key={q.to} to={q.to} {...prefetchHandlers(q.to)} className="min-h-[58px] rounded-lg px-1.5 py-1.5 flex flex-col items-center justify-center gap-1 hover:bg-cream-50 transition-colors animate-fadeUp" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-8 w-8 rounded-lg bg-saffron-50 border border-saffron-100 text-saffron-600 flex items-center justify-center"><q.icon size={17} /></div>
            <div className="text-[10.5px] font-semibold text-navy-700 text-center leading-tight">{q.label}</div>
          </Link>
        ))}
      </div>

      {/* latest notice */}
      {pinned && (
        <Link to="/app/notices" className="block animate-fadeUp">
          <Card>
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><Bell size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="saffron">નવી નોટિસ</Badge>
                  <span className="text-[12px] text-navy-400">{fmtDate(pinned.date)}</span>
                </div>
                <div className="font-bold text-[14px] text-navy-900 mt-1 leading-snug">{pinned.title}</div>
                <p className="text-[12px] text-navy-500 mt-0.5 line-clamp-2">{pinned.body}</p>
              </div>
            </div>
          </Card>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5">
        {/* my open complaint */}
        <Card className="animate-fadeUp">
          <div className="font-bold text-[14px] text-navy-800 mb-1.5">મારી ફરિયાદ</div>
          {myComplaints.length === 0 ? (
            <p className="text-[12.5px] text-navy-400">હજુ કોઈ ખુલ્લી ફરિયાદ નથી. બધું બરાબર ચાલે છે! 😊</p>
          ) : (
            <div className="space-y-2">
              {myComplaints.slice(0, 2).map(c => (
                <Link key={c.id} to={`/app/complaints/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-cream-200 px-3 py-2.5 hover:bg-cream-100">
                  <span className="text-[14px] font-medium text-navy-800 truncate">{c.title}</span>
                  <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* upcoming event */}
        <Card className="animate-fadeUp">
          <div className="font-bold text-navy-800 mb-2">આગામી કાર્યક્રમ</div>
          {nextEvent ? (
            <Link to="/app/events" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-saffron-50 border border-saffron-100 text-saffron-600 flex items-center justify-center shrink-0"><CalendarDays size={20} /></div>
              <div className="min-w-0">
                <div className="font-semibold text-navy-900 truncate">{nextEvent.name}</div>
                <div className="text-[13px] text-navy-400">{fmtDate(nextEvent.date)}</div>
              </div>
            </Link>
          ) : (
            <p className="text-[13.5px] text-navy-400">હાલ કોઈ કાર્યક્રમ નક્કી નથી.</p>
          )}
          <Link to="/app/contacts" className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-navy-600 hover:text-navy-900">
            <Phone size={15} /> જરૂરી સંપર્ક જુઓ <ChevronRight size={15} />
          </Link>
        </Card>
      </div>
    </div>
  )
}
