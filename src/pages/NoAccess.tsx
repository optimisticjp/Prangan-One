import { useNavigate } from 'react-router-dom'
import { KeyRound, MessageCircleQuestion } from 'lucide-react'
import { PranganBrand } from '../components/PranganBrand'
import { Button } from '../components/ui'
import { useAppLang } from '../lib/useAppLang'

/**
 * Shown after a real, verified login (they clicked a real magic link) when
 * that email matches no membership anywhere on the platform. Deliberately
 * not phrased as "your society isn't on Prangan One" - their society
 * might well be on the platform already, just without this particular
 * email added yet. The attempt itself was already logged by
 * AuthCallback.tsx before landing here, so this page's only job is to
 * turn "I hit a wall" into one of two next steps, not to explain why.
 */
export default function NoAccess() {
  useAppLang()
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <PranganBrand variant="symbol-navy" height={40} className="mx-auto mb-4" />
        <h1 className="font-bold text-navy-900 text-[20px] leading-snug">આ ઈમેલ સાથે હજી કોઈ સોસાયટી જોડાયેલી નથી</h1>
        <p className="text-[13.5px] text-navy-500 mt-2">તમારી સોસાયટી Prangan One પર હોઈ શકે છે, ફક્ત આ ઈમેલ હજી ઉમેરાયો નથી. અથવા તમારી સોસાયટી હજી જોડાઈ નથી.</p>

        <div className="mt-6 space-y-2.5">
          <button onClick={() => nav('/join')}
            className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
            <div className="h-10 w-10 rounded-lg bg-saffron-50 text-saffron-600 flex items-center justify-center shrink-0"><KeyRound size={18} /></div>
            <div>
              <div className="font-semibold text-navy-900 text-[14.5px]">મારી પાસે સોસાયટી કોડ છે</div>
              <div className="text-[12.5px] text-navy-400">કોડ નાખીને જોડાઓ</div>
            </div>
          </button>

          <button onClick={() => nav('/contact')}
            className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
            <div className="h-10 w-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><MessageCircleQuestion size={18} /></div>
            <div>
              <div className="font-semibold text-navy-900 text-[14.5px]">મારી સોસાયટી Prangan One પર લાવવી છે</div>
              <div className="text-[12.5px] text-navy-400">સેટઅપ વિનંતી મોકલો</div>
            </div>
          </button>
        </div>

        <Button variant="soft" className="mt-6" onClick={() => nav('/login')}>લોગિન પર પાછા જાઓ</Button>
      </div>
    </div>
  )
}
