import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, BriefcaseBusiness, Building2, Loader2 } from 'lucide-react'
import { useData } from '../lib/store'
import { supabase } from '../lib/supabase'
import { claimMemberships } from '../lib/auth'
import { claimBusinessMemberships } from '../lib/business/data'
import { roleLabel, roleHomeRoute } from '../lib/permissions'
import { DEFAULT_SOCIETY_ID } from '../lib/store'
import { Button } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'
import type { Role } from '../lib/types'
import type { BusinessRole } from '../lib/business/types'

type WorkspaceChoice =
  | { kind: 'society'; key: string; societyId: string | null; name: string; role: Role; flatId: string | null }
  | { kind: 'business'; key: string; businessId: string; name: string; role: BusinessRole }

const businessRoleLabel: Record<BusinessRole, string> = { admin: 'Business admin', partner: 'Partner', bookkeeper: 'Bookkeeper', viewer: 'View only' }

export default function AuthCallback() {
  useAppLang()
  const nav = useNavigate()
  const { resolveRealSession, logUnmatchedLoginAttempt } = useData()
  const [state, setState] = useState<'loading' | 'error' | 'choose'>('loading')
  const [choices, setChoices] = useState<WorkspaceChoice[]>([])

  const openChoice = (choice: WorkspaceChoice) => {
    if (choice.kind === 'business') {
      localStorage.setItem('prangan-business-id', choice.businessId)
      localStorage.setItem('prangan-last-workspace', 'business')
      nav('/business', { replace: true })
      return
    }
    resolveRealSession({ role: choice.role, societyId: choice.societyId ?? DEFAULT_SOCIETY_ID, flatId: choice.flatId })
    localStorage.setItem('prangan-last-workspace', 'society')
    nav(roleHomeRoute[choice.role] ?? '/login', { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (!supabase) { setState('error'); return }
      try {
        let user = (await supabase.auth.getUser()).data.user
        for (let attempt = 0; !user && attempt < 10 && !cancelled; attempt++) {
          await new Promise(r => setTimeout(r, 300))
          user = (await supabase.auth.getUser()).data.user
        }
        if (cancelled) return
        if (!user?.email) { setState('error'); return }

        const [societyMemberships, businessMemberships] = await Promise.all([
          claimMemberships(user.id, user.email),
          claimBusinessMemberships(),
        ])
        if (cancelled) return

        const all: WorkspaceChoice[] = [
          ...societyMemberships.map(m => ({ kind: 'society' as const, key: `society-${m.membershipId}`, societyId: m.societyId, name: m.societyName, role: m.role as Role, flatId: m.flatId })),
          ...businessMemberships.map(m => ({ kind: 'business' as const, key: `business-${m.membershipId}`, businessId: m.businessId, name: m.businessName, role: m.role })),
        ]

        if (all.length === 0) {
          logUnmatchedLoginAttempt(user.email)
          nav('/no-access', { replace: true })
        } else if (all.length === 1) {
          openChoice(all[0])
        } else {
          setChoices(all)
          setState('choose')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    }
    resolve()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, resolveRealSession, logUnmatchedLoginAttempt])

  if (state === 'choose') return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
        <h1 className="font-bold text-navy-900 text-[19px]">What do you want to open?</h1>
        <p className="text-[13.5px] text-navy-500 mt-1.5 mb-5">Your login has access to more than one Prangan One workspace.</p>
        <div className="space-y-2.5">{choices.map(c => <button key={c.key} onClick={() => openChoice(c)} className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
          <div className="h-10 w-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">{c.kind === 'society' ? <Building2 size={18} /> : <BriefcaseBusiness size={18} />}</div>
          <div className="min-w-0"><div className="font-semibold text-navy-900 text-[14.5px] truncate">{c.name}</div><div className="text-[12.5px] text-navy-400">{c.kind === 'society' ? roleLabel[c.role] : businessRoleLabel[c.role]}</div></div>
        </button>)}</div>
      </div>
    </div>
  )

  if (state === 'error') return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6"><div className="text-center max-w-sm"><div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-400"><AlertCircle size={26} /></div><h1 className="font-bold text-navy-900 text-[19px]">Login link is invalid or expired</h1><p className="text-[13.5px] text-navy-500 mt-1.5">Please request a fresh login link.</p><Button variant="soft" className="mt-4" onClick={() => nav('/login')}>Go to login</Button></div></div>
  )

  return <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6"><div className="text-center"><Loader2 size={28} className="animate-spin text-navy-400 mx-auto mb-3" /><p className="text-[14px] text-navy-500">Opening your workspace…</p></div></div>
}
