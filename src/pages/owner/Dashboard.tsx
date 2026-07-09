import { Link } from 'react-router-dom'
import { Building2, Users, IndianRupee, AlertTriangle, Plus, ArrowRight } from 'lucide-react'
import { useData } from '../../lib/store'
import { effectiveStatus } from '../../lib/subscription'
import { inr } from '../../lib/format'
import { Badge, Button, Card, PageHeader, StatCard } from '../../components/ui'
import { SetPasswordCard } from '../../components/SetPasswordCard'

const statusLabel: Record<string, string> = { trial: 'ટ્રાયલ', active: 'એક્ટિવ', grace: 'ગ્રેસ', paused: 'થોભાવેલ', archived: 'આર્કાઇવ' }
const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = { trial: 'blue', active: 'green', grace: 'amber', paused: 'red', archived: 'gray' }

export default function OwnerDashboard() {
  const { rawDb, session } = useData()

  const counts: Record<string, number> = { trial: 0, active: 0, grace: 0, paused: 0, archived: 0 }
  for (const s of rawDb.societies) counts[effectiveStatus(s)] = (counts[effectiveStatus(s)] ?? 0) + 1

  const totalFlats = rawDb.flats.length
  // Excludes the platform owner's own membership row(s) - societyId is
  // null specifically for those (see the memberships_society_id_owner_check
  // constraint in schema.sql). This stat means "how many real residents
  // and committee members are actually using the platform," not "how
  // many membership rows exist including my own account."
  const totalMembers = rawDb.memberships.filter(m => m.societyId !== null).length
  const expectedMonthly = rawDb.societies.reduce((sum, s) => {
    const flatCount = rawDb.flats.filter(f => f.societyId === s.id).length
    return sum + flatCount * 10
  }, 0)
  const pendingPlatformPayments = rawDb.platformBilling.filter(b => b.status === 'unpaid' || b.status === 'partial').length
  const newLeads = rawDb.leads.filter(l => l.status === 'new').length

  const recentActivity = [...rawDb.auditLogs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  const societyName = (id: string) => rawDb.societies.find(s => s.id === id)?.name ?? id

  return (
    <div>
      <PageHeader title="ઓનર ડેશબોર્ડ" sub="પ્લેટફોર્મ પર બધી સોસાયટીની સ્થિતિ એક નજરમાં"
        actions={<Link to="/owner/societies/new"><Button variant="accent"><Plus size={16} /> નવી સોસાયટી</Button></Link>} />

      {session.isRealSession && <div className="mb-4"><SetPasswordCard /></div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(['trial', 'active', 'grace', 'paused', 'archived'] as const).map(k => (
          <Card key={k} className="text-center">
            <div className="num text-[24px] font-bold text-navy-900">{counts[k]}</div>
            <Badge tone={statusTone[k]}>{statusLabel[k]}</Badge>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard label="કુલ ફ્લેટ" value={String(totalFlats)} icon={<Building2 size={19} />} />
        <StatCard label="કુલ સભ્ય (memberships)" value={String(totalMembers)} icon={<Users size={19} />} />
        <StatCard label="અંદાજિત માસિક આવક" value={inr(expectedMonthly)} tone="saffron" icon={<IndianRupee size={19} />} />
        <StatCard label="બાકી પ્લેટફોર્મ ચુકવણી" value={String(pendingPlatformPayments)} tone={pendingPlatformPayments ? 'red' : 'green'} icon={<AlertTriangle size={19} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-navy-800">તાજી એક્ટિવિટી</h2>
            <Link to="/owner/activity" className="text-[13px] font-semibold text-saffron-600 inline-flex items-center gap-1">બધું જુઓ <ArrowRight size={14} /></Link>
          </div>
          {recentActivity.length === 0 && <p className="text-[13.5px] text-navy-400">હજુ કોઈ એક્ટિવિટી નથી.</p>}
          <div className="space-y-2">
            {recentActivity.map(a => (
              <div key={a.id} className="text-[13px] border-b border-cream-100 pb-2 last:border-0">
                <div className="text-navy-800"><b>{societyName(a.societyId)}</b> · {a.detail}</div>
                <div className="text-navy-400 text-[11.5px]">{a.actor} · {new Date(a.at).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-navy-800">નવી લીડ</h2>
            <Link to="/owner/leads" className="text-[13px] font-semibold text-saffron-600 inline-flex items-center gap-1">બધું જુઓ <ArrowRight size={14} /></Link>
          </div>
          {newLeads === 0
            ? <p className="text-[13.5px] text-navy-400">હાલમાં કોઈ નવી લીડ નથી.</p>
            : <p className="text-[14px] text-navy-700">{newLeads} નવી લીડ સંપર્કની રાહ જુએ છે.</p>}
        </Card>
      </div>
    </div>
  )
}
