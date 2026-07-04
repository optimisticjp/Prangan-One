import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useData } from '../../lib/store'
import { ReceiptView } from '../../components/ReceiptView'
import { EmptyState } from '../../components/ui'

export default function ReceiptDetail() {
  const { id } = useParams()
  const { db, society, flatById } = useData()
  const pay = db.payments.find(p => p.id === id)
  const flat = pay ? flatById(pay.flatId) : undefined
  const bill = pay?.billId ? db.bills.find(b => b.id === pay.billId) : undefined

  if (!pay || !flat) {
    return <EmptyState title="રસીદ મળી નહીં" sub="કદાચ ડેમો ડેટા રીસેટ થયો છે." />
  }
  return (
    <div>
      <div className="no-print mb-3">
        <Link to="/app/receipts" className="text-[13.5px] font-semibold text-navy-500 inline-flex items-center gap-1">
          <ArrowRight size={15} className="rotate-180" /> બધી રસીદો
        </Link>
      </div>
      <ReceiptView payment={pay} flat={flat} society={society} month={bill?.month} />
    </div>
  )
}
