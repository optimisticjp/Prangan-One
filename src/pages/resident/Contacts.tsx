import { Phone } from 'lucide-react'
import { useData } from '../../lib/store'
import { PageHeader, SectionTitle } from '../../components/ui'
import type { Contact } from '../../lib/types'

function ContactRow({ c }: { c: Contact }) {
  return (
    <div className="card px-4 py-3 flex items-center gap-3 animate-fadeUp">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-navy-900 truncate">{c.name}</div>
        <div className="text-[12.5px] text-navy-400">{c.role}</div>
      </div>
      <a href={`tel:${c.phone.replace(/\s/g, '')}`}
        className="inline-flex items-center gap-1.5 rounded-xl bg-paid/10 text-paid border border-green-200 px-3.5 min-h-[42px] font-bold text-[14px]">
        <Phone size={16} /> {c.phone}
      </a>
    </div>
  )
}

export default function Contacts() {
  const { db } = useData()
  const groups = [
    { key: 'committee', title: 'કમિટી સભ્યો' },
    { key: 'emergency', title: 'ઈમરજન્સી નંબર' },
    { key: 'service', title: 'સર્વિસ સંપર્ક' },
  ] as const
  return (
    <div>
      <PageHeader title="જરૂરી સંપર્ક" sub="એક ટચમાં કોલ કરો" />
      {groups.map(g => (
        <div key={g.key}>
          <SectionTitle>{g.title}</SectionTitle>
          <div className="space-y-2">
            {db.contacts.filter(c => c.category === g.key).map(c => <ContactRow key={c.id} c={c} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
