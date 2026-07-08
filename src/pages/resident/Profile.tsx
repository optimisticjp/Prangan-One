import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, LogOut, Building2 } from 'lucide-react'
import { useData } from '../../lib/store'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { SetPasswordCard } from '../../components/SetPasswordCard'

export default function Profile() {
  const { session, flatById, society, logout } = useData()
  const nav = useNavigate()
  const flat = session.flatId ? flatById(session.flatId) : undefined
  if (!flat) return null

  const rows = [
    { k: 'માલિક', v: flat.ownerName },
    ...(flat.tenantName ? [{ k: 'ભાડૂત', v: flat.tenantName }] : []),
    { k: 'ફોન', v: flat.phone },
    { k: 'માળ', v: `${flat.floor}` },
    { k: 'સાઈઝ', v: `${flat.sqft} sq.ft` },
    { k: 'સભ્ય ક્યારથી', v: `${flat.memberSince}` },
  ]

  return (
    <div>
      <PageHeader title="પ્રોફાઇલ" />
      <Card className="animate-fadeUp">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-navy-800 text-cream-50 flex flex-col items-center justify-center">
            <span className="text-[10px] text-cream-200/70 leading-none">ફ્લેટ</span>
            <span className="font-bold text-[18px] num leading-tight">{flat.number}</span>
          </div>
          <div>
            <div className="font-bold text-navy-900 text-[17px]">{flat.occupancy === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName}</div>
            <Badge tone={flat.occupancy === 'tenant' ? 'blue' : 'green'}>{flat.occupancy === 'tenant' ? 'ભાડૂત' : 'માલિક'}</Badge>
          </div>
        </div>
        <div className="mt-4 divide-y divide-cream-200">
          {rows.map(r => (
            <div key={r.k} className="flex justify-between py-2.5 text-[14.5px]">
              <span className="text-navy-400">{r.k}</span>
              <span className="font-semibold text-navy-800 num">{r.v}</span>
            </div>
          ))}
        </div>
      </Card>

      {session.isRealSession && <div className="mt-3"><SetPasswordCard /></div>}

      <Card className="mt-3">
        <div className="flex items-center gap-2.5 text-navy-700 font-semibold"><Building2 size={18} /> {society.name}</div>
        <div className="text-[13.5px] text-navy-400 mt-1">{society.address} · મેન્ટેનન્સ દર મહિને ₹{society.maintenanceAmount}, તા. {society.dueDay} સુધીમાં</div>
      </Card>

      <Button variant="soft" full className="mt-4" onClick={() => { logout(); nav('/login') }}>
        {session.isRealSession ? <LogOut size={17} /> : <ArrowLeftRight size={17} />}
        {session.isRealSession ? 'લોગ આઉટ' : 'રોલ બદલો / બહાર નીકળો'}
      </Button>
      <p className="text-center text-[12px] text-navy-300 mt-4">{society.name} · Prangan One દ્વારા સંચાલિત</p>
    </div>
  )
}
