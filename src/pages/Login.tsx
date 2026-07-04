import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, UserRound, ShieldCheck, Calculator, Rocket, ChevronRight, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react'
import { useData } from '../lib/store'
import { supabaseConfigured } from '../lib/supabase'
import { sendMagicLink } from '../lib/auth'
import { Button, Card, Field, Input, Select } from '../components/ui'
import { SocietyLogo } from '../components/SocietyLogo'

export default function Login() {
  const { db, society, login } = useData()
  const nav = useNavigate()
  const [flatId, setFlatId] = useState(db.flats[6]?.id ?? db.flats[0]?.id ?? '')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const submitEmail = async () => {
    if (!email.trim()) return
    if (!supabaseConfigured) { setSent(true); return } // demo mode: no live project to send from yet
    setSending(true); setSendError('')
    try {
      await sendMagicLink(email.trim())
      setSent(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'લિંક મોકલવામાં ભૂલ થઈ, ફરી પ્રયત્ન કરો.')
    } finally {
      setSending(false)
    }
  }

  const roles = [
    { key: 'society_admin' as const, to: '/admin', icon: ShieldCheck, title: 'હું કમિટી મેમ્બર છું', sub: 'બિલિંગ, ખર્ચ, ફરિયાદ, નોટિસ, રિપોર્ટ' },
    { key: 'accountant' as const, to: '/accounts', icon: Calculator, title: 'હું એકાઉન્ટન્ટ છું', sub: 'આવક-ખર્ચ, રસીદ રેકોર્ડ, ઓડિટ એક્સપોર્ટ' },
    { key: 'owner' as const, to: '/owner', icon: Rocket, title: 'Prangan One ઓનર કન્સોલ', sub: 'મલ્ટિ-સોસાયટી ડેશબોર્ડ, નવી સોસાયટી ઉમેરો' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* hero band */}
      <div className="bg-navy-900 text-cream-50 px-5 pt-10 pb-14 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="absolute right-14 top-16 h-20 w-20 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="max-w-xl mx-auto relative">
          <div className="flex items-center gap-3 animate-fadeUp">
            <SocietyLogo size={46} dark />
            <div>
              <h1 className="text-[24px] font-bold leading-tight">{society.name}</h1>
              <div className="text-saffron-400 font-semibold text-[13.5px]">Prangan One પર ડિજિટલ સોસાયટી · {society.address}</div>
            </div>
          </div>
          <p className="mt-5 text-[17px] leading-relaxed text-cream-100/90 animate-fadeUp" style={{ animationDelay: '80ms' }}>
            આપણી સોસાયટીનું બધું કામ,<br />
            <span className="text-saffron-400 font-bold">સરળ ગુજરાતી માં, એક જ જગ્યાએ.</span>
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-7 pb-10">
        <div className="max-w-xl mx-auto space-y-3">

          {/* real login: email magic link */}
          <Card className="animate-fadeUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Mail size={21} /></div>
              <div>
                <div className="font-bold text-navy-900 text-[16.5px]">લોગિન</div>
                <div className="text-[13px] text-navy-400">તમારો ઈમેલ નાખો, અમે લોગિન લિંક મોકલીશું</div>
              </div>
            </div>

            {!sent ? (
              <div>
                <div className="flex gap-2">
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="તમારો ઈમેલ" className="flex-1" aria-label="ઈમેલ" />
                  <Button variant="primary" onClick={submitEmail} disabled={!email.trim() || sending}>
                    {sending ? 'મોકલાય છે...' : 'લિંક મોકલો'}
                  </Button>
                </div>
                {sendError && <p className="text-[12.5px] text-over mt-2 flex items-center gap-1.5"><AlertCircle size={13} /> {sendError}</p>}
              </div>
            ) : (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3.5">
                <div className="flex items-center gap-2 text-paid font-semibold text-[14.5px]"><CheckCircle2 size={17} /> લિંક મોકલી દીધી છે</div>
                <p className="text-[13.5px] text-navy-500 mt-1">{email} પર જુઓ, ત્યાંની લિંક પર ટેપ કરવાથી લોગિન થઈ જશે.</p>
                <div className="flex items-center justify-between mt-2.5">
                  <button onClick={() => setSent(false)} className="text-[12.5px] font-semibold text-navy-400 inline-flex items-center gap-1"><ArrowLeft size={13} /> બદલો</button>
                  {!supabaseConfigured && <span className="text-[11.5px] text-navy-300">(ડેમોમાં ઈમેલ ખરેખર મોકલાતો નથી, Supabase જોડાયેલ નથી)</span>}
                </div>
              </div>
            )}
          </Card>

          {/* demo shortcut, always available regardless of the real flow above */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-cream-300" />
            <span className="text-[11.5px] font-bold tracking-wide text-navy-300 uppercase">ડેમો શોર્ટકટ</span>
            <div className="h-px flex-1 bg-cream-300" />
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
            લાઈવ વર્ઝનમાં ઈમેલ લિંકથી ખરેખર લોગિન થશે, ઉપરના ડેમો શોર્ટકટ નહીં દેખાય.
          </p>
        </div>
      </div>
    </div>
  )
}
