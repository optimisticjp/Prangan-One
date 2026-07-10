import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Building2 } from 'lucide-react'
import { useData } from '../lib/store'
import { supabase } from '../lib/supabase'
import { claimMemberships } from '../lib/auth'
import { roleLabel, roleHomeRoute } from '../lib/permissions'
import { DEFAULT_SOCIETY_ID } from '../lib/store'
import { Button } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'
import type { Role } from '../lib/types'

/**
 * Where a real magic-link click actually lands (see emailRedirectTo in
 * auth.ts). This is the one page in the whole identity flow that needs a
 * real Supabase project to ever actually run - it cannot be exercised
 * against the local demo data layer, since it depends on a real
 * authenticated user existing. Written carefully, following the same
 * claimMemberships contract auth.ts already defines, but genuinely
 * unverified against a live project as of this writing - see
 * CLAUDE_CODE_NEXT_STEPS.md for exactly what to check once real
 * memberships exist to test against.
 *
 * Three outcomes once a real user resolves:
 *   - exactly one membership -> straight to that role's dashboard
 *   - more than one (same email, multiple societies) -> pick one
 *   - none at all -> /no-access, and the attempt gets logged so the
 *     owner console can see it (see logUnmatchedLoginAttempt)
 */
export default function AuthCallback() {
  useAppLang()
  const nav = useNavigate()
  const { resolveRealSession, logUnmatchedLoginAttempt } = useData()
  const [state, setState] = useState<'loading' | 'error' | 'choose'>('loading')
  const [choices, setChoices] = useState<{ membershipId: string; societyId: string | null; societyName: string; role: Role; flatId: string | null }[]>([])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      if (!supabase) { setState('error'); return }

      try {
        // Supabase's client parses the magic-link tokens from the URL and
        // sets up the session automatically (detectSessionInUrl, on by
        // default) - but that can be a tick behind this component mounting,
        // so wait briefly for a real user rather than checking exactly once.
        let user = (await supabase.auth.getUser()).data.user
        for (let attempt = 0; !user && attempt < 10 && !cancelled; attempt++) {
          await new Promise(r => setTimeout(r, 300))
          user = (await supabase.auth.getUser()).data.user
        }
        if (cancelled) return
        if (!user?.email) { setState('error'); return }

        const claimed = await claimMemberships(user.id, user.email)
        if (cancelled) return

        if (claimed.length === 0) {
          logUnmatchedLoginAttempt(user.email)
          nav('/no-access', { replace: true })
        } else if (claimed.length === 1) {
          const m = claimed[0]
          const role = m.role as Role
          resolveRealSession({ role, societyId: m.societyId ?? DEFAULT_SOCIETY_ID, flatId: m.flatId })
          nav(roleHomeRoute[role] ?? '/login', { replace: true })
        } else {
          setChoices(claimed.map(m => ({ membershipId: m.membershipId, societyId: m.societyId, societyName: m.societyName, role: m.role as Role, flatId: m.flatId })))
          setState('choose')
        }
      } catch {
        // Covers a failure anywhere above, not just claimMemberships -
        // without this, an unexpected failure in the getUser() polling
        // loop would leave someone stuck on the loading screen forever,
        // during the single highest-stakes flow in the app: actual login.
        if (!cancelled) setState('error')
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [nav, resolveRealSession, logUnmatchedLoginAttempt])

  const chooseSociety = (choice: typeof choices[number]) => {
    resolveRealSession({ role: choice.role, societyId: choice.societyId ?? DEFAULT_SOCIETY_ID, flatId: choice.flatId })
    nav(roleHomeRoute[choice.role] ?? '/login', { replace: true })
  }

  if (state === 'choose') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
          <h1 className="font-bold text-navy-900 text-[19px]">કઈ સોસાયટીમાં જવું છે?</h1>
          <p className="text-[13.5px] text-navy-500 mt-1.5 mb-5">તમારો ઈમેલ એક કરતાં વધુ સોસાયટીમાં નોંધાયેલો છે.</p>
          <div className="space-y-2.5">
            {choices.map(c => (
              <button key={c.membershipId} onClick={() => chooseSociety(c)}
                className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
                <div className="h-10 w-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><Building2 size={18} /></div>
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 text-[14.5px]">{c.societyName}</div>
                  <div className="text-[12.5px] text-navy-400">{roleLabel[c.role]}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-400">
            <AlertCircle size={26} />
          </div>
          <h1 className="font-bold text-navy-900 text-[19px]">લિંક કામ ન કરી</h1>
          <p className="text-[13.5px] text-navy-500 mt-1.5">લિંક જૂની થઈ ગઈ હોઈ શકે છે. ફરી લોગિન કરવાનો પ્રયત્ન કરો.</p>
          <Button variant="soft" className="mt-4" onClick={() => nav('/login')}>લોગિન પર જાઓ</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 size={28} className="animate-spin text-navy-400 mx-auto mb-3" />
        <p className="text-[14px] text-navy-500">લોગિન થઈ રહ્યું છે...</p>
      </div>
    </div>
  )
}
