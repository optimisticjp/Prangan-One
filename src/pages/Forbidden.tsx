import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { PranganBrand } from '../components/PranganBrand'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <PranganBrand variant="symbol-navy" height={40} className="mx-auto" />
        <div className="mx-auto mt-5 mb-3 h-14 w-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-over">
          <ShieldAlert size={26} />
        </div>
        <h1 className="font-bold text-navy-900 text-[20px]">આ પાનું જોવાની પરવાનગી નથી</h1>
        <p className="text-[13.5px] text-navy-500 mt-1.5">તમારો રોલ આ પાનું જોવા માટે યોગ્ય નથી. જો આ ભૂલ લાગે તો કમિટીનો સંપર્ક કરો.</p>
        <Link to="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-800 text-cream-50 px-4 py-2.5 text-[14px] font-semibold hover:bg-navy-700">
          લોગિન પર જાઓ
        </Link>
      </div>
    </div>
  )
}
