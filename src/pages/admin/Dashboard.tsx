import { Link } from 'react-router-dom'
import { IndianRupee, Wallet, AlertTriangle, Wrench, MessageCircle, ChevronRight, ReceiptText, Bell } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, fmtMonth, inr, thisMonth, todayISO } from '../../lib/format'
import { complaintStatusLabel, complaintStatusTone } from '../../lib/copy'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { Badge, Button, Card, PageHeader, SectionTitle, StatCard } from '../../components/ui'

export default function Dashboard() {
  const { db, society, flatById, flatPending, totalPending, monthIncome, monthExpense } = useData()
  const month = thisMonth()

  const openComplaints = db.complaints.filter(c => c.status !== 'closed' && c.status !== 'done')
  const dues = db.flats
    .map(f => ({ flat: f, pending: flatPending(f.id) }))
    .filter(x => x.pending > 0)
    .sort((a, b) => b.pending - a.pending)

  const days = (d: string) => Math.ceil((new Date(d).getTime() - new Date(todayISO()).getTime()) / 86400000)
  const amcSoon = db.vendors.filter(v => v.amcEnd && days(v.amcEnd) <= 60)

  const recentPays = db.payments.filter(p => p.status === 'success').slice(0, 5)

  return (
    <div>
      <PageHeader title="કમિટી ડેશબોર્ડ" sub={`${fmtMonth(month)} · આજની સ્થિતિ`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="આ મહિને જમા" value={inr(monthIncome(month))} tone="green" icon={<IndianRupee size={19} />} />
        <StatCard label="આ મહિને ખર્ચ" value={inr(monthExpense(month))} icon={<Wallet size={19} />} />
        <StatCard label="કુલ બાકી" value={inr(totalPending())} tone={totalPending() > 0 ? 'red' : 'green'} sub={`${dues.length} ફ્લેટ`} icon={<AlertTriangle size={19} />} />
        <StatCard label="ખુલ્લી ફરિયાદ" value={String(openComplaints.length)} tone={openComplaints.length ? 'amber' : 'green'} icon={<Wrench size={19} />} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Link to="/admin/billing"><Button variant="accent"><ReceiptText size={16} /> બિલ બનાવો</Button></Link>
        <Link to="/admin/payments"><Button><IndianRupee size={16} /> ચુકવણી નોંધો</Button></Link>
        <Link to="/admin/notices"><Button variant="soft"><Bell size={16} /> નોટિસ મૂકો</Button></Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-2">
        <div>
          <SectionTitle action={<Link to="/admin/billing" className="text-[13px] font-semibold text-saffron-600">બધું જુઓ</Link>}>સૌથી વધુ બાકી</SectionTitle>
          <Card pad={false}>
            {dues.length === 0 && <div className="p-5 text-[14px] text-paid font-semibold">બધા ફ્લેટનું ચૂકવેલ છે 🎉</div>}
            {dues.slice(0, 5).map(({ flat, pending }) => (
              <div key={flat.id} className="flex items-center gap-3 px-4 py-3 border-b border-cream-100 last:border-0">
                <div className="h-9 w-11 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center font-bold text-navy-700 num text-[13.5px]">{flat.number}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy-800 text-[14px] truncate">{flat.ownerName}</div>
                  <div className="num text-over text-[13px] font-bold">{inr(pending)}</div>
                </div>
                <a target="_blank" rel="noreferrer" title="WhatsApp રિમાઇન્ડર"
                  href={waShare(waTemplates.maintenanceReminder(society.name, flat.ownerName, flat.number, pending, month))}
                  className="h-9 w-9 rounded-xl bg-green-50 border border-green-200 text-paid flex items-center justify-center hover:bg-green-100">
                  <MessageCircle size={17} />
                </a>
              </div>
            ))}
          </Card>

          <SectionTitle>તાજી ચુકવણી</SectionTitle>
          <Card pad={false}>
            {recentPays.map(p => {
              const f = flatById(p.flatId)
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-cream-100 last:border-0 text-[14px]">
                  <div>
                    <span className="font-semibold text-navy-800">ફ્લેટ {f?.number}</span>
                    <span className="text-navy-400 ml-2 text-[12.5px]">{fmtDate(p.date)} · {p.receiptNo}</span>
                  </div>
                  <span className="num font-bold text-paid">{inr(p.amount)}</span>
                </div>
              )
            })}
          </Card>
        </div>

        <div>
          {amcSoon.length > 0 && (
            <>
              <SectionTitle action={<Link to="/admin/vendors" className="text-[13px] font-semibold text-saffron-600">વેન્ડર જુઓ</Link>}>AMC રિન્યૂ કરવાનું છે</SectionTitle>
              <Card className="border-amber-200 bg-amber-50/50 space-y-2.5">
                {amcSoon.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-[14px]">
                    <div>
                      <div className="font-semibold text-navy-800">{v.name}</div>
                      <div className="text-[12.5px] text-navy-400">{v.service}</div>
                    </div>
                    <Badge tone={days(v.amcEnd!) < 0 ? 'red' : 'amber'}>
                      {days(v.amcEnd!) < 0 ? 'AMC પૂરું થયું' : `${days(v.amcEnd!)} દિવસ બાકી`}
                    </Badge>
                  </div>
                ))}
              </Card>
            </>
          )}

          <SectionTitle action={<Link to="/admin/complaints" className="text-[13px] font-semibold text-saffron-600">બધી જુઓ</Link>}>તાજી ફરિયાદો</SectionTitle>
          <div className="space-y-2">
            {db.complaints.slice(0, 4).map(c => {
              const f = flatById(c.flatId)
              return (
                <Link key={c.id} to="/admin/complaints" className="block">
                  <Card className="hover:shadow-lift transition-shadow flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-navy-800 text-[14.5px] truncate">{c.title}</div>
                      <div className="text-[12.5px] text-navy-400">ફ્લેટ {f?.number} · {fmtDate(c.createdAt)}</div>
                    </div>
                    <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
                    <ChevronRight size={17} className="text-navy-300 shrink-0" />
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
