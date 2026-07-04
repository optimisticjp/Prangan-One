import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRound, ShieldCheck, Calculator, Rocket, ChevronRight, FlaskConical } from 'lucide-react'
import { useData } from '../lib/store'
import { isDemoModeEnabled } from '../lib/demoMode'
import { Button, Card, Select } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'

/**
 * Demo mode, on its own page and its own URL (pranganone.com/demo),
 * deliberately separate from /login. Two reasons: a real visitor should
 * never see "become the owner" as a clickable button on the real login
 * screen, and having this on its own URL gives a clean link to hand a
 * prospect for a walkthrough without any confusion about what's real.
 *
 * Gated by VITE_DEMO_MODE (on by default in local dev, off in a real
 * production build unless explicitly enabled - see src/lib/demoMode.ts).
 * When it's off, this page says so plainly instead of pretending not to
 * exist or silently redirecting.
 */
export default function Demo() {
  useAppLang()
  const { db, login } = useData()
  const nav = useNavigate()
  const demoMode = isDemoModeEnabled()
  const [flatId, setFlatId] = useState(db.flats[6]?.id ?? db.flats[0]?.id ?? '')

  const roles = [
    { key: 'society_admin' as const, to: '/admin', icon: ShieldCheck, title: 'હું કમિટી મેમ્બર છું', sub: 'બિલિંગ, ખર્ચ, ફરિયાદ, નોટિસ, રિપોર્ટ' },
    { key: 'accountant' as const, to: '/accounts', icon: Calculator, title: 'હું એકાઉન્ટન્ટ છું', sub: 'આવક-ખર્ચ, રસીદ રેકોર્ડ, ઓડિટ એક્સપોર્ટ' },
    { key: 'owner' as const, to: '/owner', icon: Rocket, title: 'Prangan One ઓનર કન્સોલ', sub: 'મલ્ટિ-સોસાયટી ડેશબોર્ડ, નવી સોસાયટી ઉમેરો' },
  ]

  if (!demoMode) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <PranganBrand variant="symbol-navy" height={40} className="mx-auto mb-4" />
          <h1 className="font-bold text-navy-900 text-[19px]">ડેમો હાલમાં ચાલુ નથી</h1>
          <p className="text-[13.5px] text-navy-500 mt-1.5">ડેમો જોવા માટે care@pranganone.com પર સંપર્ક કરો.</p>
          <Button variant="soft" className="mt-4" onClick={() => nav('/login')}>લોગિન પર જાઓ</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-navy-900 text-cream-50 px-5 pt-10 pb-14 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="max-w-xl mx-auto relative animate-fadeUp">
          <PranganBrand variant="wordmark-white" height={34} />
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-saffron-500/15 text-saffron-400 text-[12.5px] font-bold px-3 py-1">
            <FlaskConical size={13} /> ડેમો મોડ
          </div>
          <p className="mt-4 text-[17px] leading-relaxed text-cream-100/90">
            રાજહંસ ટાવરના ડેમો ડેટા સાથે,<br />
            <span className="text-saffron-400 font-bold">દરેક રોલ જુઓ, પાસવર્ડ વગર.</span>
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-7 pb-10">
        <div className="max-w-xl mx-auto space-y-3">
          <Card className="animate-fadeUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-saffron-50 border border-saffron-100 text-saffron-600 flex items-center justify-center"><UserRound size={22} /></div>
              <div>
                <div className="font-bold text-navy-900 text-[16.5px]">હું રહેવાસી છું</div>
                <div className="text-[13px] text-navy-400">બિલ, રસીદ, ફરિયાદ, નોટિસ, ઇવેન્ટ</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={flatId} onChange={e => setFlatId(e.target.value)} aria-label="ફ્લેટ પસંદ કરો" className="flex-1">
                {db.flats.map(f => (
                  <option key={f.id} value={f.id}>ફ્લેટ {f.number} · {f.occupancy === 'tenant' && f.tenantName ? f.tenantName : f.ownerName}</option>
                ))}
              </Select>
              <Button variant="accent" onClick={() => { login('resident_owner', flatId); nav('/app') }}>
                શરૂ કરો <ChevronRight size={17} />
              </Button>
            </div>
          </Card>

          {roles.map((r, i) => (
            <button key={r.key} onClick={() => { login(r.key); nav(r.to) }}
              className="w-full text-left card p-4 sm:p-5 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp"
              style={{ animationDelay: `${(i + 1) * 70}ms` }}>
              <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><r.icon size={22} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-navy-900 text-[16px]">{r.title}</div>
                <div className="text-[13px] text-navy-400 truncate">{r.sub}</div>
              </div>
              <ChevronRight size={19} className="text-navy-300 shrink-0" />
            </button>
          ))}

          <p className="text-center text-[12.5px] text-navy-400 pt-2">
            આ ડેમો છે: પાસવર્ડની જરૂર નથી, બધો ડેટા તમારા બ્રાઉઝરમાં જ સચવાય છે.<br />
            વાસ્તવિક લોગિન <button onClick={() => nav('/login')} className="font-semibold text-saffron-600 underline">અહીં</button> છે.
          </p>
        </div>
      </div>
    </div>
  )
}
