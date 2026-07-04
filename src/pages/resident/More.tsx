import { Link } from 'react-router-dom'
import { FolderOpen, Phone, Vote, PartyPopper, Car, UserCircle2, ReceiptText, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/ui'
import { useData } from '../../lib/store'
import type { SocietyModules } from '../../lib/types'

const items: { to: string; icon: typeof ReceiptText; label: string; sub: string; module?: keyof SocietyModules }[] = [
  { to: '/app/receipts', icon: ReceiptText, label: 'મારી રસીદો', sub: 'ચુકવણીની પાકી રસીદ', module: 'billing' },
  { to: '/app/documents', icon: FolderOpen, label: 'દસ્તાવેજો', sub: 'નિયમો, ઓડિટ રિપોર્ટ, ફોર્મ', module: 'documents' },
  { to: '/app/contacts', icon: Phone, label: 'જરૂરી સંપર્ક', sub: 'કમિટી, ઈમરજન્સી, સર્વિસ' },
  { to: '/app/polls', icon: Vote, label: 'મતદાન', sub: 'સોસાયટીના નિર્ણયમાં તમારો મત', module: 'polls' },
  { to: '/app/events', icon: PartyPopper, label: 'ઇવેન્ટ / તહેવાર', sub: 'નવરાત્રી, મીટિંગ, ફાળો', module: 'events' },
  { to: '/app/parking', icon: Car, label: 'પાર્કિંગ / વાહન', sub: 'મારા વાહનની નોંધ', module: 'parking' },
  { to: '/app/profile', icon: UserCircle2, label: 'પ્રોફાઇલ', sub: 'ફ્લેટ અને એપ માહિતી' },
]

export default function More() {
  const { moduleEnabled } = useData()
  const visible = items.filter(it => !it.module || moduleEnabled(it.module))
  return (
    <div>
      <PageHeader title="વધુ" />
      <div className="space-y-2">
        {visible.map((it, i) => (
          <Link key={it.to} to={it.to} className="card px-4 py-3.5 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><it.icon size={21} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900">{it.label}</div>
              <div className="text-[12.5px] text-navy-400 truncate">{it.sub}</div>
            </div>
            <ChevronRight size={18} className="text-navy-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
