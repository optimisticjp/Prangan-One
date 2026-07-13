import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { setPasswordForCurrentUser } from '../lib/auth'
import { Button, Card, Input } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'

/**
 * Where a password-reset email link actually lands (see redirectTo in
 * sendPasswordResetEmail, auth.ts). Supabase's recovery link
 * authenticates the person temporarily, specifically so they can set a
 * new password here - this is a genuinely different intent from a
 * normal login even though both start with clicking a link in an email,
 * which is why it's a dedicated page rather than folding into
 * AuthCallback.tsx. Once the new password is set, this hands off to
 * /auth/callback to resolve the actual session the normal way - same
 * membership-claiming logic every other login path already goes through.
 */
export default function ResetPassword() {
  useAppLang()
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function waitForRecoverySession() {
      if (!supabase) { setReady(true); return }
      try {
        let user = (await supabase.auth.getUser()).data.user
        for (let attempt = 0; !user && attempt < 10 && !cancelled; attempt++) {
          await new Promise(r => setTimeout(r, 300))
          user = (await supabase.auth.getUser()).data.user
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    waitForRecoverySession()
    return () => { cancelled = true }
  }, [])

  const submit = async () => {
    if (password.length < 6) { setError('પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.'); return }
    if (password !== confirm) { setError('બંને પાસવર્ડ સરખા નથી.'); return }
    setSaving(true); setError('')
    try {
      await setPasswordForCurrentUser(password)
      nav('/auth/callback', { replace: true })
    } catch {
      setError('પાસવર્ડ સેટ થઈ શક્યો નથી. લિંક જૂની થઈ ગઈ હોઈ શકે છે; કૃપા કરીને નવી રીસેટ લિંક મંગાવો.')
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-navy-400 mx-auto mb-3" />
          <p className="text-[14px] text-navy-500">કૃપા કરીને થોડી વાર રાહ જુઓ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
        <Card className="animate-fadeUp">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl bg-navy-50 border border-navy-100 text-navy-700 flex items-center justify-center shrink-0"><Lock size={20} /></div>
            <div>
              <div className="font-bold text-navy-900 text-[16.5px]">નવો પાસવર્ડ સેટ કરો</div>
              <div className="text-[13px] text-navy-400">ઓછામાં ઓછા 6 અક્ષર</div>
            </div>
          </div>
          <form className="space-y-2" onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="નવો પાસવર્ડ" aria-label="નવો પાસવર્ડ" className="pr-10" autoComplete="new-password" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300" aria-label="પાસવર્ડ બતાવો">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input type={showPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="પાસવર્ડ ફરી નાખો" aria-label="પાસવર્ડ ફરી નાખો" autoComplete="new-password" required minLength={6} />
            <Button type="submit" variant="primary" full disabled={!password || !confirm || saving}>
              {saving ? 'સેવ થાય છે...' : 'પાસવર્ડ સેટ કરો'}
            </Button>
            {error && <p className="text-[12.5px] text-over flex items-center gap-1.5"><AlertCircle size={13} /> {error}</p>}
          </form>
        </Card>
      </div>
    </div>
  )
}
