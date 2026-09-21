import { useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, KeyRound, MessageCircleQuestion } from 'lucide-react'
import { PranganBrand } from '../components/PranganBrand'
import { Button } from '../components/ui'
import { useAppLang } from '../lib/useAppLang'

export default function NoAccess() {
  useAppLang()
  const nav = useNavigate()

  return (
    <main className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <PranganBrand variant="symbol-navy" height={40} className="mx-auto mb-4" />
        <h1 className="font-bold text-navy-900 text-[20px] leading-snug">આ ઈમેલ સાથે હજી કોઈ સોસાયટી જોડાયેલી નથી</h1>
        <p className="text-[13.5px] text-navy-500 mt-2">
          આપની સોસાયટી પ્રાંગણવન પર હોઈ શકે છે, પરંતુ આ ઈમેલ હજી ઉમેરાયો નથી. અથવા સોસાયટી હજી જોડાઈ નથી. બિઝનેસ માટે તમે નવું Business Money workspace પણ બનાવી શકો છો.
        </p>

        <div className="mt-6 space-y-2.5">
          <Choice
            icon={KeyRound}
            title="મારી પાસે સોસાયટી કોડ છે"
            sub="કોડ નાખીને જોડાવાની વિનંતી કરો"
            onClick={() => nav('/join')}
            tone="saffron"
          />

          <Choice
            icon={BriefcaseBusiness}
            title="Business Money શરૂ કરો"
            sub="ભાગીદાર, ફંડ, ખર્ચ અને મંજૂરી ટ્રેક કરો"
            onClick={() => nav('/business/onboarding')}
            tone="navy"
          />

          <Choice
            icon={MessageCircleQuestion}
            title="મારી સોસાયટી માટે પ્રાંગણવન જોઈએ છે"
            sub="સેટઅપ વિનંતી મોકલો"
            onClick={() => nav('/contact')}
            tone="navy"
          />
        </div>

        <Button variant="soft" className="mt-6" onClick={() => nav('/login')}>લોગિન પર પાછા જાઓ</Button>
      </div>
    </main>
  )
}

function Choice({ icon: Icon, title, sub, onClick, tone }: {
  icon: typeof KeyRound
  title: string
  sub: string
  onClick: () => void
  tone: 'saffron' | 'navy'
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tone === 'saffron' ? 'bg-saffron-50 text-saffron-600' : 'bg-navy-50 text-navy-700'}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="font-semibold text-navy-900 text-[14.5px]">{title}</div>
        <div className="text-[12.5px] text-navy-400">{sub}</div>
      </div>
    </button>
  )
}
