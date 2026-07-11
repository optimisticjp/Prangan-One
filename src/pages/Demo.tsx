import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRound, ShieldCheck, Calculator, ChevronRight, FlaskConical, IndianRupee, Wrench, BarChart3 } from 'lucide-react'
import { isDemoModeEnabled } from '../lib/demoMode'
import { startDemoSession, exitDemo } from '../lib/demoStore'
import { buildDemoSeed } from '../lib/demoSeed'
import { saveGuideState } from '../lib/demoGuide'
import { Button, Card, Select } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'
import type { Role } from '../lib/types'

/**
 * Demo mode, on its own page and its own URL (pranganone.com/demo),
 * deliberately separate from /login. Two reasons: a real visitor should
 * never see "become a committee member" as a clickable button on the
 * real login screen, and having this on its own URL gives a clean link
 * to hand a prospect for a walkthrough without any confusion about
 * what's real.
 *
 * Leads with three problem-framed entry points ("what would you like to
 * see"), not a role picker - a prospect cares about collecting
 * maintenance faster or handling complaints properly, not about which
 * internal role in this product happens to do that. The role picker
 * still exists, further down, for anyone who wants to explore freely
 * instead of following a specific journey.
 *
 * Gated by VITE_DEMO_MODE (on by default in local dev, off in a real
 * production build unless explicitly enabled - see src/lib/demoMode.ts).
 * When it's off, this page says so plainly instead of pretending not to
 * exist or silently redirecting.
 *
 * Deliberately does not call useData() at all - picking anything here
 * is what decides whether a demo provider should even exist, so this
 * reads the demo's own seed data directly, and hands off to
 * startDemoSession (demoStore.tsx), which writes the choice to storage
 * and forces a genuine reload rather than a client-side navigation, so
 * the root switcher (main.tsx) mounts the demo provider fresh on the
 * very next load. The guide's own state (demoGuide.ts) is saved to its
 * own storage key before that reload happens, for the same reason.
 *
 * The owner role is deliberately not offered here at all - the public
 * sales demo never exposes the owner console, on purpose.
 */
export default function Demo() {
  useAppLang()
  const nav = useNavigate()
  const demoMode = isDemoModeEnabled()
  const seed = buildDemoSeed()
  const [flatId, setFlatId] = useState(seed.flats[0]?.id ?? '')

  const roles: { key: Role; to: string; icon: typeof ShieldCheck; title: string; sub: string }[] = [
    { key: 'society_admin', to: '/admin', icon: ShieldCheck, title: 'હું કમિટી મેમ્બર છું', sub: 'બિલિંગ, ખર્ચ, ફરિયાદ, નોટિસ, રિપોર્ટ' },
    { key: 'accountant', to: '/accounts', icon: Calculator, title: 'હું એકાઉન્ટન્ટ છું', sub: 'આવક-ખર્ચ, રસીદ રેકોર્ડ, ઓડિટ એક્સપોર્ટ' },
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

  const startPaymentJourney = () => {
    const overdueBill = seed.bills.find(b => b.paidAmount < b.amount) ?? seed.bills[0]
    saveGuideState({ journey: 'payment', targetFlatId: overdueBill.flatId, targetBillId: overdueBill.id, dismissed: false })
    startDemoSession('society_admin', undefined, '/admin')
  }
  const startComplaintJourney = () => {
    const target = seed.flats[0]
    saveGuideState({ journey: 'complaint', targetFlatId: target.id, targetBillId: null, dismissed: false })
    startDemoSession('resident_owner', target.id, '/app/complaints')
  }
  const startAccountsExploration = () => {
    saveGuideState({ journey: null, targetFlatId: null, targetBillId: null, dismissed: true })
    startDemoSession('society_admin', undefined, '/admin/reports')
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
            ડેમો સોસાયટીના ડેટા સાથે,<br />
            <span className="text-saffron-400 font-bold">દરેક રોલ જુઓ, પાસવર્ડ વગર.</span>
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-7 pb-10">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="font-bold text-navy-800 text-[17px] px-1 animate-fadeUp">શું જોવા માંગો છો?</h2>

          <button onClick={startPaymentJourney}
            className="w-full text-left card p-4 sm:p-5 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp">
            <div className="h-11 w-11 rounded-xl bg-saffron-50 border border-saffron-100 text-saffron-600 flex items-center justify-center shrink-0"><IndianRupee size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 text-[16px]">મેન્ટેનન્સ ઝડપથી ઉઘરાવો</div>
              <div className="text-[13px] text-navy-400">બાકી ફ્લેટ જુઓ, ચુકવણી નોંધો, પુષ્ટિ કરો, રસીદ જુઓ</div>
            </div>
            <ChevronRight size={19} className="text-navy-300 shrink-0" />
          </button>

          <button onClick={startComplaintJourney}
            className="w-full text-left card p-4 sm:p-5 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp" style={{ animationDelay: '70ms' }}>
            <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Wrench size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 text-[16px]">ફરિયાદ યોગ્ય રીતે ઉકેલો</div>
              <div className="text-[13px] text-navy-400">ફરિયાદ નોંધવાથી ઉકેલાય ત્યાં સુધીની આખી પ્રક્રિયા</div>
            </div>
            <ChevronRight size={19} className="text-navy-300 shrink-0" />
          </button>

          <button onClick={startAccountsExploration}
            className="w-full text-left card p-4 sm:p-5 flex items-center gap-3 hover:shadow-lift transition-shadow animate-fadeUp" style={{ animationDelay: '140ms' }}>
            <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><BarChart3 size={22} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-900 text-[16px]">સોસાયટીના હિસાબ સ્પષ્ટ જુઓ</div>
              <div className="text-[13px] text-navy-400">ઉઘરાણી, બાકી રકમ, ખર્ચ, રિપોર્ટ એક જગ્યાએ</div>
            </div>
            <ChevronRight size={19} className="text-navy-300 shrink-0" />
          </button>

          <div className="pt-3">
            <h2 className="font-bold text-navy-800 text-[15px] px-1">અથવા જાતે એક્સપ્લોર કરો</h2>
          </div>

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
                {seed.flats.map(f => (
                  <option key={f.id} value={f.id}>ફ્લેટ {f.number} · {f.occupancy === 'tenant' && f.tenantName ? f.tenantName : f.ownerName}</option>
                ))}
              </Select>
              <Button variant="accent" onClick={() => { saveGuideState({ journey: null, targetFlatId: null, targetBillId: null, dismissed: true }); startDemoSession('resident_owner', flatId, '/app') }}>
                શરૂ કરો <ChevronRight size={17} />
              </Button>
            </div>
          </Card>

          {roles.map((r, i) => (
            <button key={r.key} onClick={() => { saveGuideState({ journey: null, targetFlatId: null, targetBillId: null, dismissed: true }); startDemoSession(r.key, undefined, r.to) }}
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
            {/* exitDemo, not nav('/login'): if a demo session is active, a
                client-side nav would land on /login still inside
                DemoDataProvider, where a real login silently does nothing.
                exitDemo clears demo storage and does a full reload so the real
                provider takes over. */}
            વાસ્તવિક લોગિન <button onClick={exitDemo} className="font-semibold text-saffron-600 underline">અહીં</button> છે.
          </p>
        </div>
      </div>
    </div>
  )
}
