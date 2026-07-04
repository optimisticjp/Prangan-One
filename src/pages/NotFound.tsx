import { Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { PranganMark } from '../components/PranganMark'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <PranganMark size={40} />
        <div className="mx-auto mt-5 mb-3 h-14 w-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-400">
          <MapPinOff size={26} />
        </div>
        <h1 className="font-bold text-navy-900 text-[20px]">આ પાનું મળ્યું નહીં</h1>
        <p className="text-[13.5px] text-navy-500 mt-1.5">લિંક ખોટી હોઈ શકે છે, અથવા પાનું હટાવાયું છે.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-800 text-cream-50 px-4 py-2.5 text-[14px] font-semibold hover:bg-navy-700">
          હોમ પર જાઓ
        </Link>
      </div>
    </div>
  )
}
