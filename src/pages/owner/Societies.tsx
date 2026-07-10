import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight } from 'lucide-react'
import { useData } from '../../lib/store'
import { effectiveStatus } from '../../lib/subscription'
import { Badge, Button, Card, PageHeader, TableWrap, td, th } from '../../components/ui'
import { SocietyBadge } from '../../components/SocietyLogo'
import type { SubscriptionStatus } from '../../lib/types'

const statusLabel: Record<SubscriptionStatus, string> = { trial: 'ટ્રાયલ', active: 'એક્ટિવ', grace: 'ગ્રેસ', paused: 'થોભાવેલ', archived: 'આર્કાઇવ' }
const statusTone: Record<SubscriptionStatus, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = { trial: 'blue', active: 'green', grace: 'amber', paused: 'red', archived: 'gray' }

export default function OwnerSocieties() {
  const { rawDb, setSubscriptionStatus, enterSociety } = useData()
  const nav = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  const quickAction = (id: string, status: SubscriptionStatus) => {
    setBusy(id)
    setSubscriptionStatus(id, status)
    setTimeout(() => setBusy(null), 300)
  }

  return (
    <div>
      <PageHeader title="સોસાયટીઓ" sub={`કુલ ${rawDb.societies.length} સોસાયટી`}
        actions={<Link to="/owner/societies/new"><Button variant="accent"><Plus size={16} /> નવી સોસાયટી</Button></Link>} />

      <TableWrap>
        <thead><tr>
          <th className={th}>નામ</th><th className={th}>ફ્લેટ</th><th className={th}>પ્લાન</th><th className={th}>સ્થિતિ</th><th className={th}></th>
        </tr></thead>
        <tbody>
          {rawDb.societies.map(s => {
            const flatCount = rawDb.flats.filter(f => f.societyId === s.id).length
            const status = effectiveStatus(s)
            return (
              <tr key={s.id} className="hover:bg-cream-50">
                <td className={td}>
                  <Link to={`/owner/societies/${s.id}`} className="inline-flex items-center gap-2.5 font-semibold text-navy-800 hover:text-saffron-600">
                    <SocietyBadge society={s} size={26} /> {s.name}
                  </Link>
                  <div className="text-[12px] text-navy-400">{s.address}</div>
                </td>
                <td className={`${td} num`}>{flatCount}</td>
                <td className={`${td} capitalize`}>{s.plan}</td>
                <td className={td}>
                  <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
                  {status === 'grace' && s.subscriptionStatus === 'grace' && <div className="text-[11px] text-navy-400 mt-0.5">ગ્રેસ શરૂ: {s.graceStartedAt?.slice(0, 10)}</div>}
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex gap-1.5">
                    {status !== 'active' && status !== 'archived' && (
                      <Button variant="soft" onClick={() => quickAction(s.id, 'active')} disabled={busy === s.id}>એક્ટિવ કરો</Button>
                    )}
                    {status === 'active' && (
                      <Button variant="soft" onClick={() => quickAction(s.id, 'grace')} disabled={busy === s.id}>ગ્રેસમાં મૂકો</Button>
                    )}
                    {(status === 'active' || status === 'grace') && (
                      <Button variant="danger" onClick={() => quickAction(s.id, 'paused')} disabled={busy === s.id}>થોભાવો</Button>
                    )}
                    {status === 'paused' && (
                      <Button variant="accent" onClick={() => quickAction(s.id, 'active')} disabled={busy === s.id}>ફરી શરૂ કરો</Button>
                    )}
                    <button onClick={() => { enterSociety(s.id, 'society_admin'); nav('/admin') }}
                      title="કમિટી તરીકે જુઓ" className="h-9 w-9 rounded-lg bg-navy-50 border border-navy-100 text-navy-600 inline-flex items-center justify-center hover:bg-navy-100">
                      <ArrowLeftRight size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>
    </div>
  )
}
