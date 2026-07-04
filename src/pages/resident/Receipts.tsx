import { Link } from 'react-router-dom'
import { ReceiptText, ChevronRight } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate, inr } from '../../lib/format'
import { payModeLabel } from '../../lib/copy'
import { EmptyState, PageHeader, Badge } from '../../components/ui'

export default function Receipts() {
  const { db, session } = useData()
  const mine = db.payments
    .filter(p => p.flatId === session.flatId && p.status === 'success')
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <PageHeader title="મારી રસીદો" sub="દરેક ચુકવણીની પાકી રસીદ, પ્રિન્ટ કે WhatsApp માટે તૈયાર" />
      {mine.length === 0 ? (
        <EmptyState icon={<ReceiptText />} title="હજુ કોઈ રસીદ નથી" sub="ચુકવણી નોંધાયા પછી રસીદ અહીં દેખાશે." />
      ) : (
        <div className="space-y-2">
          {mine.map(p => (
            <Link key={p.id} to={`/app/receipts/${p.id}`} className="card px-4 py-3 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp">
              <div className="h-10 w-10 rounded-xl bg-green-50 border border-green-200 text-paid flex items-center justify-center shrink-0"><ReceiptText size={19} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-800 num">{p.receiptNo}</div>
                <div className="text-[12.5px] text-navy-400">{fmtDate(p.date)} · {payModeLabel[p.mode]}</div>
              </div>
              <div className="num font-bold text-navy-900">{inr(p.amount)}</div>
              <ChevronRight size={17} className="text-navy-300" />
            </Link>
          ))}
        </div>
      )}
      <p className="text-[12.5px] text-navy-400 mt-4 flex items-center gap-1.5"><Badge tone="gray">નોંધ</Badge> રસીદ ખોલીને "પ્રિન્ટ / PDF સેવ કરો" દબાવવાથી ડાઉનલોડ થશે.</p>
    </div>
  )
}
