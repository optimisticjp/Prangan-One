import { Pin, Share2, Bell } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { waShare, waTemplates } from '../../lib/whatsapp'
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui'

export default function Notices() {
  const { db, society } = useData()
  const sorted = [...db.notices].sort((a, b) =>
    Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader title="નોટિસ બોર્ડ" sub="સોસાયટીની બધી જાહેરાત એક જગ્યાએ" />
      {sorted.length === 0 ? (
        <Card><EmptyState icon={<Bell size={22} />} title="હજુ કોઈ નોટિસ નથી" /></Card>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((n, i) => (
            <Card key={n.id} className={`animate-fadeUp ${n.pinned ? 'border-saffron-300 bg-saffron-50/40' : ''}`} >
              <div className="flex items-center gap-2 flex-wrap">
                {n.pinned && <span className="inline-flex items-center gap-1 text-saffron-600 text-[12.5px] font-bold"><Pin size={13} /> મહત્વની</span>}
                <Badge tone="gray">{n.category}</Badge>
                <span className="text-[12.5px] text-navy-400 ml-auto">{fmtDate(n.date)}</span>
              </div>
              <h2 className="font-bold text-navy-900 text-[16.5px] mt-1.5 leading-snug">{n.title}</h2>
              <p className="text-[14.5px] text-navy-600 mt-1 whitespace-pre-line">{n.body}</p>
              <a href={waShare(waTemplates.newNotice(society.name, n.title))} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-[13.5px] font-semibold text-navy-500 hover:text-navy-700">
                <Share2 size={15} /> WhatsApp પર શેર કરો
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
