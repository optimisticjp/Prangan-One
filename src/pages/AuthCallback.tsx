import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, BriefcaseBusiness, Building2, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { useData } from '../lib/store'
import { supabase } from '../lib/supabase'
import { claimMemberships, getLoginPortalIntent, setLoginPortalIntent } from '../lib/auth'
import { claimBusinessMemberships, getMyBusinessOnboarding } from '../lib/business/data'
import { roleLabel, roleHomeRoute } from '../lib/permissions'
import { DEFAULT_SOCIETY_ID } from '../lib/store'
import { Button } from '../components/ui'
import { PranganBrand } from '../components/PranganBrand'
import type { Role } from '../lib/types'
import type { BusinessRole } from '../lib/business/types'
import type { LoginPortal } from '../lib/auth'

type WorkspaceChoice =
  | { kind: 'society'; key: string; societyId: string | null; name: string; role: Role; flatId: string | null }
  | { kind: 'business'; key: string; businessId: string; name: string; role: BusinessRole }

const businessRoleLabel: Record<BusinessRole, string> = { admin: 'Business admin', partner: 'Partner', bookkeeper: 'Bookkeeper', viewer: 'View only', staff: 'Staff' }
const residentRoles: Role[] = ['resident_owner', 'resident_tenant']
const adminRoles: Role[] = ['owner', 'society_admin', 'committee_member', 'accountant', 'auditor']
const portalLoginRoute: Record<LoginPortal, string> = { resident: '/user-login', admin: '/admin-login', business: '/business/login' }

export default function AuthCallback() {
  const nav = useNavigate()
  const location = useLocation()
  const { resolveRealSession, logUnmatchedLoginAttempt } = useData()
  const [state, setState] = useState<'loading' | 'error' | 'choose' | 'wrong'>('loading')
  const [choices, setChoices] = useState<WorkspaceChoice[]>([])
  const [availablePortals, setAvailablePortals] = useState<LoginPortal[]>([])

  const portal = useMemo(() => {
    const value = new URLSearchParams(location.search).get('portal')
    return value === 'resident' || value === 'admin' || value === 'business' ? value : getLoginPortalIntent()
  }, [location.search])

  const openChoice = (choice: WorkspaceChoice) => {
    if (choice.kind === 'business') {
      setLoginPortalIntent('business')
      localStorage.setItem('prangan-business-id', choice.businessId)
      localStorage.setItem('prangan-last-workspace', 'business')
      nav('/business', { replace: true })
      return
    }
    setLoginPortalIntent(residentRoles.includes(choice.role) ? 'resident' : 'admin')
    resolveRealSession({ role: choice.role, societyId: choice.societyId ?? DEFAULT_SOCIETY_ID, flatId: choice.flatId })
    localStorage.setItem('prangan-last-workspace', 'society')
    nav(roleHomeRoute[choice.role], { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    setState('loading')

    async function resolve() {
      if (!supabase) { setState('error'); return }
      try {
        let user = (await supabase.auth.getUser()).data.user
        for (let attempt = 0; !user && attempt < 10 && !cancelled; attempt += 1) {
          await new Promise(resolveWait => setTimeout(resolveWait, 300))
          user = (await supabase.auth.getUser()).data.user
        }
        if (cancelled) return
        if (!user?.email) { setState('error'); return }

        const [societyMemberships, businessMemberships, businessOnboarding] = await Promise.all([
          claimMemberships(user.id, user.email),
          claimBusinessMemberships(),
          getMyBusinessOnboarding(),
        ])
        if (cancelled) return

        const all: WorkspaceChoice[] = [
          ...societyMemberships.map(m => ({ kind: 'society' as const, key: 'society-' + m.membershipId, societyId: m.societyId, name: m.societyName, role: m.role as Role, flatId: m.flatId })),
          ...businessMemberships.map(m => ({ kind: 'business' as const, key: 'business-' + m.membershipId, businessId: m.businessId, name: m.businessName, role: m.role })),
        ]

        const portals: LoginPortal[] = []
        if (all.some(choice => choice.kind === 'society' && residentRoles.includes(choice.role))) portals.push('resident')
        if (all.some(choice => choice.kind === 'society' && adminRoles.includes(choice.role))) portals.push('admin')
        if (all.some(choice => choice.kind === 'business')) portals.push('business')
        setAvailablePortals(portals)

        const filtered = portal === 'resident'
          ? all.filter(choice => choice.kind === 'society' && residentRoles.includes(choice.role))
          : portal === 'admin'
            ? all.filter(choice => choice.kind === 'society' && adminRoles.includes(choice.role))
            : portal === 'business'
              ? all.filter(choice => choice.kind === 'business')
              : all

        if (filtered.length === 0) {
          if (portal === 'business' && businessOnboarding) {
            nav('/business/onboarding', { replace: true })
          } else if (all.length === 0) {
            logUnmatchedLoginAttempt(user.email)
            nav('/no-access', { replace: true })
          } else {
            setState('wrong')
          }
        } else if (filtered.length === 1) {
          openChoice(filtered[0])
        } else {
          setChoices(filtered)
          setState('choose')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    }

    void resolve()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, portal])

  const switchPortal = (next: LoginPortal) => {
    setLoginPortalIntent(next)
    nav('/auth/callback?portal=' + next, { replace: true })
  }

  if (state === 'wrong') return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50 p-5 flex items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <PranganBrand variant="symbol-navy" height={38} className="mx-auto" />
        <div className="mx-auto mt-5 h-14 w-14 rounded-2xl bg-saffron-50 text-saffron-700 flex items-center justify-center"><AlertCircle size={25} /></div>
        <h1 className="mt-3 text-[20px] font-bold text-navy-900">This email belongs to another login section</h1>
        <p className="mt-1.5 text-[13px] text-navy-500">You are already signed in. Choose the workspace you actually want — you do not need to login again.</p>
        <div className="mt-5 space-y-2">{availablePortals.map(item => <PortalButton key={item} portal={item} onClick={() => switchPortal(item)} />)}</div>
        <button onClick={() => nav('/login')} className="mt-5 text-[12px] font-semibold text-navy-400">Choose another login</button>
      </div>
    </main>
  )

  if (state === 'choose') return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50 flex items-center justify-center p-5">
      <div className="text-center max-w-sm w-full">
        <PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-4" />
        <h1 className="font-bold text-navy-900 text-[19px]">Choose your workspace</h1>
        <p className="text-[13px] text-navy-500 mt-1.5 mb-5">You have more than one workspace inside this login section.</p>
        <div className="space-y-2.5">{choices.map(choice => <button key={choice.key} onClick={() => openChoice(choice)} className="w-full flex items-center gap-3 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-left hover:border-saffron-400">
          <div className="h-10 w-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">{choice.kind === 'society' ? <Building2 size={18} /> : <BriefcaseBusiness size={18} />}</div>
          <div className="min-w-0"><div className="font-semibold text-navy-900 text-[14.5px] truncate">{choice.name}</div><div className="text-[12.5px] text-navy-400">{choice.kind === 'society' ? roleLabel[choice.role] : businessRoleLabel[choice.role]}</div></div>
        </button>)}</div>
      </div>
    </main>
  )

  if (state === 'error') return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-400"><AlertCircle size={26} /></div>
        <h1 className="font-bold text-navy-900 text-[19px]">Login link is invalid or expired</h1>
        <p className="text-[13.5px] text-navy-500 mt-1.5">Please request a fresh login link.</p>
        <Button variant="soft" className="mt-4" onClick={() => nav(portal ? portalLoginRoute[portal] : '/login')}>Go to login</Button>
      </div>
    </main>
  )

  return <main className="min-h-[100dvh] w-full overflow-x-hidden bg-cream-50 flex items-center justify-center p-6"><div className="text-center"><Loader2 size={28} className="animate-spin text-navy-400 mx-auto mb-3" /><p className="text-[14px] text-navy-500">Opening your workspace…</p></div></main>
}

function PortalButton({ portal, onClick }: { portal: LoginPortal; onClick: () => void }) {
  const meta = portal === 'resident'
    ? { icon: UserRound, title: 'Resident workspace', sub: 'Flat owner / tenant' }
    : portal === 'admin'
      ? { icon: ShieldCheck, title: 'Admin workspace', sub: 'Owner / committee / accounts' }
      : { icon: BriefcaseBusiness, title: 'Business workspace', sub: 'Business admin / partner' }
  return <button onClick={onClick} className="w-full min-h-[62px] rounded-2xl border border-cream-200 bg-white px-4 flex items-center gap-3 text-left"><meta.icon size={19} className="text-saffron-700" /><div><div className="text-[13px] font-bold text-navy-800">{meta.title}</div><div className="text-[11.5px] text-navy-400">{meta.sub}</div></div></button>
}
