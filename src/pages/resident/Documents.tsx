import { useState } from 'react'
import { FileText, Lock, Download } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { canSeeDoc, tenantCapabilities } from '../../lib/permissions'
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui'

export default function Documents() {
  const { db, session, society, getDocumentUrl } = useData()
  const [folder, setFolder] = useState('બધા')
  const [openingId, setOpeningId] = useState<string | null>(null)

  // A tenant only sees documents at all if the society's tenant access
  // mode allows it (limited mode hides documents, full mode shows them).
  const tenantBlocked = session.role === 'resident_tenant' && !tenantCapabilities(society.tenantAccess).viewDocuments
  const visible = tenantBlocked ? [] : db.documents.filter(d => canSeeDoc(session.role, d.permission))
  const folders = ['બધા', ...Array.from(new Set(visible.map(d => d.folder)))]
  const shown = folder === 'બધા' ? visible : visible.filter(d => d.folder === folder)
  const hiddenCount = db.documents.length - visible.length

  const open = async (storagePath: string, id: string) => {
    setOpeningId(id)
    try {
      const url = await getDocumentUrl(storagePath)
      if (url) window.open(url, '_blank')
    } finally {
      setOpeningId(null)
    }
  }

  if (tenantBlocked) {
    return (
      <div>
        <PageHeader title="દસ્તાવેજો" />
        <Card><EmptyState icon={<Lock size={22} />} title="આ સુવિધા તમારા માટે ચાલુ નથી" sub="દસ્તાવેજ જોવા માટે ફ્લેટ માલિકનો સંપર્ક કરો." /></Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="દસ્તાવેજો" sub="સોસાયટીના જાહેર દસ્તાવેજો" />

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {folders.map(f => (
          <button key={f} onClick={() => setFolder(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold border transition-colors ${folder === f ? 'bg-navy-800 text-cream-50 border-navy-800' : 'bg-white text-navy-500 border-cream-300'}`}>
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="mt-2"><EmptyState icon={<FileText size={22} />} title="આ ફોલ્ડરમાં કંઈ નથી" /></Card>
      ) : (
        <div className="space-y-2 mt-2">
          {shown.map(d => (
            <Card key={d.id} className="animate-fadeUp flex items-center gap-3" >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-navy-50 border border-navy-100 text-navy-600 flex items-center justify-center"><FileText size={19} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy-800 text-[14.5px] leading-snug truncate">{d.name}</div>
                <div className="text-[12.5px] text-navy-400">{d.folder} · {fmtDate(d.date)} · {d.size}</div>
              </div>
              {d.storagePath ? (
                <button onClick={() => open(d.storagePath!, d.id)} disabled={openingId === d.id}
                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-navy-500 hover:bg-cream-100 disabled:opacity-40" aria-label="ડાઉનલોડ">
                  <Download size={17} />
                </button>
              ) : (
                <Badge tone="gray">ડેમો ફાઈલ</Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-navy-400 bg-cream-100 border border-cream-200 rounded-xl px-3.5 py-2.5">
          <Lock size={15} className="shrink-0" /> {hiddenCount} દસ્તાવેજ ફક્ત કમિટી/એકાઉન્ટન્ટ માટે છે.
        </div>
      )}
      {!session.isRealSession && (
        <p className="text-[12.5px] text-navy-400 mt-3">નોંધ: ડેમોમાં ફાઈલની ફક્ત વિગત દેખાય છે. અસલ એપમાં ફાઈલ સુરક્ષિત રીતે ઓનલાઈન સચવાય છે.</p>
      )}
    </div>
  )
}
