import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, CheckCircle2, ArrowLeft, AlertCircle, Info } from 'lucide-react'
import { useData } from '../lib/store'
import { supabaseConfigured } from '../lib/supabase'
import { sendMagicLink } from '../lib/auth'
import { Button, Card, Input } from '../components/ui'
import { SocietyLogo } from '../components/SocietyLogo'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'

/**
 * The real, production login screen. No demo shortcuts here anymore -
 * those live at /demo (src/pages/Demo.tsx), a clearly separate page, so
 * this screen can never accidentally show "become the owner" buttons to
 * a real visitor.
 *
 * Branding: a generic visitor (no explicit society context yet, see
 * session.explicitSociety in src/lib/types.ts) sees Prangan One's own
 * identity, not whichever society happens to be first in the database.
 * Someone who arrived through their society's own share link
 * (/s/:slug) sees that society's branding instead, with Prangan One as
 * a visible secondary line. Never show a specific society's identity to
 * a visitor who didn't ask for it.
 */
export default function Login() {
  useAppLang()
  const { society, session } = useData()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const submitEmail = async () => {
    if (!email.trim()) return
    if (!supabaseConfigured) { setSent(true); return } // handled by the honest not-configured message below
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-navy-900 text-cream-50 px-5 pt-10 pb-14 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="absolute right-14 top-16 h-20 w-20 rounded-full bg-saffron-500/10" aria-hidden />
        <div className="max-w-xl mx-auto relative">
          {session.explicitSociety ? (
            <div className="flex items-center gap-3 animate-fadeUp">
              <SocietyLogo size={46} dark />
              <div>
                <h1 className="text-[24px] font-bold leading-tight">{society.name}</h1>
                <div className="text-saffron-400 font-semibold text-[13.5px]">Prangan One પર ડિજિટલ સોસાયટી · {society.address}</div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeUp">
              <PranganBrand variant="wordmark-white" height={34} />
              <div className="text-saffron-400 font-semibold text-[13.5px] mt-2">The Society OS</div>
            </div>
          )}
          <p className="mt-5 text-[17px] leading-relaxed text-cream-100/90 animate-fadeUp" style={{ animationDelay: '80ms' }}>
            આપણી સોસાયટીનું બધું કામ,<br />
            <span className="text-saffron-400 font-bold">સરળ ગુજરાતી માં, એક જ જગ્યાએ.</span>
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-7 pb-10">
        <div className="max-w-xl mx-auto space-y-3">
          <Card className="animate-fadeUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Mail size={21} /></div>
              <div>
                <div className="font-bold text-navy-900 text-[16.5px]">લોગિન</div>
                <div className="text-[13px] text-navy-400">તમારો ઈમેલ નાખો, અમે લોગિન લિંક મોકલીશું</div>
              </div>
            </div>

            {!supabaseConfigured ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-start gap-2.5">
                <Info size={17} className="text-pend shrink-0 mt-0.5" />
                <p className="text-[13.5px] text-navy-700">
                  લોગિન સેવા હાલમાં સેટ થઈ રહી છે. એક્સેસ માટે તમારી સોસાયટીની કમિટીનો સંપર્ક કરો, અથવા care@pranganone.com પર ઈમેલ કરો.
                </p>
              </div>
            ) : !sent ? (
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
                <button onClick={() => setSent(false)} className="text-[12.5px] font-semibold text-navy-400 inline-flex items-center gap-1 mt-2.5"><ArrowLeft size={13} /> બદલો</button>
              </div>
            )}
          </Card>

          <p className="text-center text-[12.5px] text-navy-400 pt-1">
            તમારી સોસાયટીની લિંક છે? <button onClick={() => nav('/contact')} className="font-semibold text-saffron-600">અમારો સંપર્ક કરો</button>, અમે તમને સાચી લિંક મોકલીશું.
          </p>
          <p className="text-center text-[12.5px] text-navy-400">
            સોસાયટી કોડ છે? <button onClick={() => nav('/join')} className="font-semibold text-saffron-600">જોડાઓ</button>
          </p>
        </div>
      </div>
    </div>
  )
}
