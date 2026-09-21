import { useMemo, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { SocietyLogo } from '../components/SocietyLogo'
import { supabaseConfigured } from '../lib/supabase'
import {
  sendMagicLink, sendPasswordResetEmail, setLoginPortalIntent,
  signInWithGoogle, signInWithPassword,
} from '../lib/auth'
import { useData } from '../lib/store'
import type { LoginPortal } from '../lib/auth'

const portalCopy: Record<LoginPortal, {
  icon: typeof UserRound
  eyebrow: string
  title: string
  gu: string
  body: string
  accent: string
}> = {
  resident: {
    icon: UserRound,
    eyebrow: 'RESIDENT ACCESS',
    title: 'Resident / User Login',
    gu: 'રહેવાસી લોગિન',
    body: 'For flat owners and tenants. Open only your resident workspace.',
    accent: 'bg-saffron-50 text-saffron-700 border-saffron-200',
  },
  admin: {
    icon: ShieldCheck,
    eyebrow: 'ADMIN ACCESS',
    title: 'Admin & Committee Login',
    gu: 'એડમિન અને કમિટી લોગિન',
    body: 'For Prangan One owner, society admins, committee members, accountants and auditors.',
    accent: 'bg-navy-50 text-navy-700 border-navy-100',
  },
  business: {
    icon: BriefcaseBusiness,
    eyebrow: 'BUSINESS ACCESS',
    title: 'Business Login',
    gu: 'બિઝનેસ લોગિન',
    body: 'For business admins, partners, bookkeepers and viewers.',
    accent: 'bg-green-50 text-paid border-green-100',
  },
}

export default function PortalLogin({ portal }: { portal: LoginPortal }) {
  const nav = useNavigate()
  const { society, session } = useData()
  const copy = portalCopy[portal]
  const Icon = copy.icon
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const societyContext = useMemo(
    () => portal === 'resident' && session.explicitSociety,
    [portal, session.explicitSociety],
  )

  const begin = () => setLoginPortalIntent(portal)

  const submitMagic = async () => {
    if (!email.trim()) return
    begin()
    if (!supabaseConfigured) { setSent(true); return }
    setSending(true); setError('')
    try {
      await sendMagicLink(email.trim(), portal)
      setSent(true)
    } catch {
      setError('Could not send the login link. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const submitPassword = async () => {
    if (!email.trim() || !password) return
    begin()
    setSending(true); setError('')
    try {
      await signInWithPassword(email.trim(), password)
      nav('/auth/callback?portal=' + portal)
    } catch {
      setError('Login failed. Check your email and password and try again.')
      setSending(false)
    }
  }

  const submitGoogle = async () => {
    begin()
    setSending(true); setError('')
    try {
      await signInWithGoogle(portal)
    } catch {
      setError('Could not start Google login. Please try again.')
      setSending(false)
    }
  }

  const forgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email first.'); return }
    setSending(true); setError('')
    try {
      await sendPasswordResetEmail(email.trim())
      setResetSent(true)
    } catch {
      setError('Could not send the reset link. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50">
      <div className="bg-navy-900 px-4 pb-14 pt-8 text-cream-50">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between gap-3">
            <PranganBrand variant="wordmark-white" height={25} />
            <Link to="/login" className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-cream-100/75">Change login</Link>
          </div>
          <div className="mt-7 flex items-start gap-3">
            {societyContext ? (
              <SocietyLogo size={48} dark />
            ) : (
              <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ' + copy.accent}><Icon size={22} /></div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-[0.14em] text-saffron-400">{copy.eyebrow}</div>
              <h1 className="text-[23px] font-bold leading-tight">{societyContext ? society.name : copy.title}</h1>
              <div className="mt-0.5 text-[12.5px] font-semibold text-saffron-400">{copy.gu}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-cream-100/70">{copy.body}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-7 px-4 pb-10">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-cream-200 bg-white p-4 shadow-soft">
          {!supabaseConfigured ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12.5px] text-navy-600">Login service is not configured on this deployment.</div>
          ) : resetSent ? (
            <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-4">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-paid"><CheckCircle2 size={17} /> Reset link sent</div>
              <p className="mt-1 text-[12px] text-navy-500">Check {email} and set your new password.</p>
              <button onClick={() => setResetSent(false)} className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy-500"><ArrowLeft size={13} /> Back</button>
            </div>
          ) : sent ? (
            <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-4">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-paid"><CheckCircle2 size={17} /> Login link sent</div>
              <p className="mt-1 text-[12px] text-navy-500">Open the link sent to {email}. It will return you to {copy.title}.</p>
              <button onClick={() => setSent(false)} className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy-500"><ArrowLeft size={13} /> Change email</button>
            </div>
          ) : (
            <>
              <button onClick={submitGoogle} disabled={sending} className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl border border-cream-300 bg-white text-[13.5px] font-semibold text-navy-800 disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.85.87-3.06.87a5.4 5.4 0 0 1-5.1-3.74H.87v2.35A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.69a5.4 5.4 0 0 1 0-3.38V4.96H.87a9 9 0 0 0 0 8.08l3.03-2.35z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .87 4.96L3.9 7.3A5.4 5.4 0 0 1 9 3.58z"/></svg>
                Continue with Google
              </button>
              <div className="my-3 flex items-center gap-2"><div className="h-px flex-1 bg-cream-200" /><span className="text-[10.5px] font-semibold text-navy-300">OR</span><div className="h-px flex-1 bg-cream-200" /></div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                  <Input aria-label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="!pl-9" autoComplete="email" />
                </div>
                {usePassword && (
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                    <Input aria-label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="!pl-9 !pr-10" autoComplete="current-password" />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                )}
                <Button full loading={sending} disabled={!email.trim() || (usePassword && !password)} onClick={usePassword ? submitPassword : submitMagic}>{usePassword ? 'Login' : 'Send login link'}</Button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button type="button" onClick={() => { setUsePassword(value => !value); setError('') }} className="text-[11.5px] font-semibold text-navy-500">{usePassword ? 'Use email link instead' : 'Use password instead'}</button>
                {usePassword && <button type="button" onClick={forgotPassword} disabled={sending} className="text-[11.5px] font-semibold text-saffron-700">Forgot password?</button>}
              </div>
              {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-[11.5px] text-over">{error}</div>}
            </>
          )}
        </div>
        <div className="mx-auto mt-4 w-full max-w-md text-center text-[11.5px] text-navy-400">
          {portal === 'resident' && <>Have a society code? <Link to="/join" className="font-semibold text-saffron-700">Join society</Link>.</>}
          {portal === 'business' && <>New business? Login first, then <Link to="/business/onboarding" className="font-semibold text-saffron-700">request owner approval</Link>.</>}
          {portal === 'admin' && <>Need society setup? <Link to="/contact" className="font-semibold text-saffron-700">Contact Prangan One</Link>.</>}
        </div>
      </div>
    </main>
  )
}
