import { useState } from 'react'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { setPasswordForCurrentUser } from '../lib/auth'
import { Button, Card, Input } from './ui'

/**
 * Lets someone who's already logged in for real (via magic link or
 * Google, doesn't matter which) opt into a password for faster login
 * next time. This is deliberately the only way a password ever gets
 * created in this app - nobody signs up with a password cold, since
 * there'd be no way to verify a fresh password-only signup is actually
 * who they claim to be. Someone who verifies their identity the usual
 * way at least once can then set a password here, after which the
 * password option on the login screen works for them too.
 *
 * Only rendered for a real session - see each caller (Profile.tsx,
 * admin Settings.tsx, owner Layout.tsx) for where session.isRealSession
 * is checked, since the local demo has no real Supabase user to set a
 * password on at all.
 */
export function SetPasswordCard() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (password.length < 6) { setError('પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.'); return }
    if (password !== confirm) { setError('બંને પાસવર્ડ સરખા નથી.'); return }
    setSaving(true); setError('')
    try {
      await setPasswordForCurrentUser(password)
      setDone(true); setOpen(false); setPassword(''); setConfirm('')
    } catch {
      setError('પાસવર્ડ સેટ કરવામાં ભૂલ થઈ, ફરી પ્રયત્ન કરો.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="animate-fadeUp">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Lock size={18} /></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy-800 text-[14.5px]">પાસવર્ડ</div>
          <div className="text-[12.5px] text-navy-400">પાસવર્ડ સેટ કરો, પછી ઈમેલ લિંકની રાહ જોયા વગર સીધા લોગિન કરી શકાશે</div>
        </div>
        {!open && <button onClick={() => { setOpen(true); setDone(false) }} className="text-[13px] font-semibold text-saffron-600 shrink-0">{done ? 'બદલો' : 'સેટ કરો'}</button>}
      </div>

      {done && !open && (
        <div className="mt-2.5 text-[12.5px] text-paid flex items-center gap-1.5"><CheckCircle2 size={14} /> પાસવર્ડ સેટ થઈ ગયો</div>
      )}

      {open && (
        <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); submit() }}>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="નવો પાસવર્ડ" aria-label="નવો પાસવર્ડ" className="pr-10" autoComplete="new-password" required minLength={6} />
            <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300" aria-label="પાસવર્ડ બતાવો">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="ફરી નાખો" aria-label="પાસવર્ડ ફરી નાખો" autoComplete="new-password" required minLength={6} />
          <div className="flex gap-2">
            <Button type="button" variant="soft" full onClick={() => { setOpen(false); setError('') }}>રદ કરો</Button>
            <Button type="submit" variant="primary" full disabled={!password || !confirm || saving}>{saving ? 'સેવ થાય છે...' : 'સેવ કરો'}</Button>
          </div>
          {error && <p className="text-[12.5px] text-over flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
        </form>
      )}
    </Card>
  )
}
