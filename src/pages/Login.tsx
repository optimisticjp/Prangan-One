import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, CheckCircle2, ArrowLeft, AlertCircle, Info, Lock, Eye, EyeOff } from 'lucide-react'
import { useData } from '../lib/store'
import { supabaseConfigured } from '../lib/supabase'
import { sendMagicLink, signInWithGoogle, signInWithPassword, sendPasswordResetEmail } from '../lib/auth'
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
 * Three real ways in: Google, a password (for anyone who's set one, see
 * setPasswordForCurrentUser in auth.ts), or a magic link, which is also
 * the fallback for someone who hasn't set a password yet - the email
 * field is shared across the magic-link and password paths since it's
 * the same identity question either way, only the "how do I prove it's
 * me" step differs.
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

  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  const submitPassword = async () => {
    if (!email.trim() || !password) return
    setSending(true); setSendError('')
    try {
      await signInWithPassword(email.trim(), password)
      // signInWithPassword resolves to a real session immediately, no
      // redirect involved - sending the browser to /auth/callback itself
      // reuses the exact same membership-claiming resolution every
      // other login path already goes through, rather than duplicating
      // that logic here.
      nav('/auth/callback')
    } catch {
      setSendError('ઈમેલ અથવા પાસવર્ડ ખોટો છે, ફરી પ્રયત્ન કરો.')
      setSending(false)
    }
  }

  const submitGoogle = async () => {
    if (!supabaseConfigured) return
    setSending(true); setSendError('')
    try {
      await signInWithGoogle()
      // no setSending(false) here on success - the browser is about to
      // navigate away to Google's own login page, there's nothing left
      // for this component to show in the meantime
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Google લોગિનમાં ભૂલ થઈ, ફરી પ્રયત્ન કરો.')
      setSending(false)
    }
  }

  const forgotPassword = async () => {
    if (!email.trim()) { setSendError('પહેલા તમારો ઈમેલ નાખો.'); return }
    setSending(true); setSendError('')
    try {
      await sendPasswordResetEmail(email.trim())
      setResetSent(true)
    } catch {
      setSendError('લિંક મોકલવામાં ભૂલ થઈ, ફરી પ્રયત્ન કરો.')
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
              <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0">{usePassword ? <Lock size={20} /> : <Mail size={21} />}</div>
              <div>
                <div className="font-bold text-navy-900 text-[16.5px]">લોગિન</div>
                <div className="text-[13px] text-navy-400">{usePassword ? 'ઈમેલ અને પાસવર્ડ નાખો' : 'તમારો ઈમેલ નાખો, અમે લોગિન લિંક મોકલીશું'}</div>
              </div>
            </div>

            {!supabaseConfigured ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-start gap-2.5">
                <Info size={17} className="text-pend shrink-0 mt-0.5" />
                <p className="text-[13.5px] text-navy-700">
                  લોગિન સેવા હાલમાં સેટ થઈ રહી છે. એક્સેસ માટે તમારી સોસાયટીની કમિટીનો સંપર્ક કરો, અથવા care@pranganone.com પર ઈમેલ કરો.
                </p>
              </div>
            ) : resetSent ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3.5">
                <div className="flex items-center gap-2 text-paid font-semibold text-[14.5px]"><CheckCircle2 size={17} /> રીસેટ લિંક મોકલી દીધી છે</div>
                <p className="text-[13.5px] text-navy-500 mt-1">{email} પર જુઓ, ત્યાંની લિંક પર ટેપ કરીને નવો પાસવર્ડ સેટ કરી શકાશે.</p>
                <button onClick={() => { setResetSent(false); setUsePassword(true) }} className="text-[12.5px] font-semibold text-navy-400 inline-flex items-center gap-1 mt-2.5"><ArrowLeft size={13} /> પાછા લોગિન પર</button>
              </div>
            ) : !sent ? (
              <div>
                <button onClick={submitGoogle} disabled={sending}
                  className="w-full min-h-[46px] rounded-xl border border-cream-300 bg-white text-navy-800 font-semibold text-[14.5px] flex items-center justify-center gap-2.5 hover:bg-cream-50 disabled:opacity-50">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.85.87-3.06.87a5.4 5.4 0 0 1-5.1-3.74H.87v2.35A9 9 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.9 10.69a5.4 5.4 0 0 1 0-3.38V4.96H.87a9 9 0 0 0 0 8.08l3.03-2.35z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .87 4.96L3.9 7.3A5.4 5.4 0 0 1 9 3.58z" />
                  </svg>
                  Google થી લોગિન કરો
                </button>
                <div className="flex items-center gap-2.5 my-3.5">
                  <div className="flex-1 h-px bg-cream-200" />
                  <span className="text-[12px] text-navy-300 font-semibold">અથવા</span>
                  <div className="flex-1 h-px bg-cream-200" />
                </div>

                {usePassword ? (
                  <form className="space-y-2" onSubmit={e => { e.preventDefault(); submitPassword() }}>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="તમારો ઈમેલ" aria-label="ઈમેલ" autoComplete="email" required />
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="પાસવર્ડ" aria-label="પાસવર્ડ" className="pr-10" autoComplete="current-password" required />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300" aria-label="પાસવર્ડ બતાવો">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <Button type="submit" variant="primary" full disabled={!email.trim() || !password || sending}>
                      {sending ? 'લોગિન થાય છે...' : 'લોગિન કરો'}
                    </Button>
                    <div className="flex items-center justify-between pt-0.5">
                      <button type="button" onClick={() => setUsePassword(false)} className="text-[12.5px] font-semibold text-navy-400">ઈમેલ લિંકથી લોગિન કરો</button>
                      <button type="button" onClick={forgotPassword} disabled={sending} className="text-[12.5px] font-semibold text-saffron-600">પાસવર્ડ ભૂલી ગયા?</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); submitEmail() }}>
                    <div className="flex gap-2">
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="તમારો ઈમેલ" className="flex-1" aria-label="ઈમેલ" autoComplete="email" required />
                      <Button type="submit" variant="primary" disabled={!email.trim() || sending}>
                        {sending ? 'મોકલાય છે...' : 'લિંક મોકલો'}
                      </Button>
                    </div>
                    <button type="button" onClick={() => setUsePassword(true)} className="text-[12.5px] font-semibold text-navy-400 mt-2.5">પાસવર્ડથી લોગિન કરો</button>
                  </form>
                )}
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
