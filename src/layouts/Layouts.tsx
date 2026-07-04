import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Home, IndianRupee, Wrench, Bell, LayoutGrid, Menu, X, UserCircle2, ArrowLeftRight, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useData } from '../lib/store'
import { roleLabel } from '../lib/permissions'
import { SocietyLogo } from '../components/SocietyLogo'
import { PranganBrand, PoweredByPrangan } from '../components/PranganBrand'
import { useAppLang } from '../lib/useAppLang'
import { SubscriptionBanner } from '../components/SubscriptionBanner'
import type { SocietyModules } from '../lib/types'

/* ---------------- Resident: mobile-first ---------------- */
// module: undefined means always shown (home, more). Others hide when the
// society has that module switched off in Settings.
const residentTabs: { to: string; label: string; icon: LucideIcon; end?: boolean; module?: keyof SocietyModules }[] = [
  { to: '/app', label: 'હોમ', icon: Home, end: true },
  { to: '/app/bill', label: 'બિલ', icon: IndianRupee, module: 'billing' },
  { to: '/app/complaints', label: 'ફરિયાદ', icon: Wrench, module: 'complaints' },
  { to: '/app/notices', label: 'નોટિસ', icon: Bell, module: 'notices' },
  { to: '/app/more', label: 'વધુ', icon: LayoutGrid },
]

export function ResidentLayout() {
  useAppLang()
  const { society, session, flatById, moduleEnabled } = useData()
  const flat = session.flatId ? flatById(session.flatId) : undefined
  const tabs = residentTabs.filter(t => !t.module || moduleEnabled(t.module))

  return (
    <div className="min-h-screen max-w-2xl mx-auto flex flex-col">
      {/* Society identity is primary here, this strip keeps Prangan One
          genuinely visible (name included, not just the mark) on every
          resident screen without competing with the society's own branding
          just below it. */}
      <div className="bg-navy-900 px-4 py-1 flex items-center justify-center gap-1.5">
        <span className="text-[10.5px] text-cream-100/60">Powered by</span>
        <PranganBrand variant="wordmark-white" height={12} decorative />
      </div>
      <SubscriptionBanner audience="resident" />
      <header className="glass sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <SocietyLogo />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-navy-900 leading-tight truncate">{society.name}</div>
          <div className="text-[12px] text-navy-400 leading-tight">{society.address}</div>
        </div>
        {flat && (
          <Link to="/app/profile" className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-navy-800 text-cream-50 px-3 py-1.5 text-[13px] font-semibold">
            <UserCircle2 size={15} /> ફ્લેટ {flat.number}
          </Link>
        )}
      </header>

      <main className="flex-1 px-4 py-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 max-w-2xl mx-auto glass border-t border-cream-200 px-1 pb-[env(safe-area-inset-bottom)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11.5px] font-semibold transition-colors ${isActive ? 'text-saffron-600' : 'text-navy-400 hover:text-navy-600'}`}>
              {({ isActive }) => (<>
                <tab.icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                {tab.label}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

/* ---------------- Admin / Accountant: sidebar shell ---------------- */
export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; module?: keyof SocietyModules; group?: string }

export function Shell({ items, title }: { items: NavItem[]; title: string }) {
  useAppLang()
  const { society, session, logout, moduleEnabled, exitImpersonation } = useData()
  const [open, setOpen] = useState(false)
  const visibleItems = items.filter(it => !it.module || moduleEnabled(it.module))

  const nav = (
    <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
      {visibleItems.map((it, i) => (
        <div key={it.to}>
          {it.group && it.group !== visibleItems[i - 1]?.group && (
            <div className="mx-3 mt-4 mb-1 text-[10.5px] font-bold tracking-wide text-navy-400 uppercase first:mt-1">{it.group}</div>
          )}
          <NavLink to={it.to} end={it.end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `mx-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-medium transition-colors ${isActive ? 'bg-navy-700 text-cream-50 shadow-soft' : 'text-navy-100/75 hover:bg-navy-800 hover:text-cream-50'}`}>
            {({ isActive }) => (<>
              <it.icon size={18} className={isActive ? 'text-saffron-400' : ''} />
              {it.label}
            </>)}
          </NavLink>
        </div>
      ))}
    </nav>
  )

  const sidebarInner = (
    <>
      <div className="px-5 py-4 flex items-center gap-3 border-b border-navy-800">
        <SocietyLogo size={36} dark />
        <div>
          <div className="font-bold text-cream-50 leading-tight">{society.name}</div>
          <div className="text-[12px] text-saffron-400 font-semibold">{title}</div>
        </div>
      </div>
      {nav}
      <div className="p-3 border-t border-navy-800">
        <Link to="/login" onClick={logout}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[14px] text-navy-100/70 hover:bg-navy-800 hover:text-cream-50">
          <ArrowLeftRight size={17} /> રોલ બદલો
          <span className="ml-auto text-[11.5px] bg-navy-800 rounded-full px-2 py-0.5">{session.role ? roleLabel[session.role] : ''}</span>
        </Link>
        <p className="text-center mt-3 flex items-center justify-center"><PoweredByPrangan dark /></p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-navy-900 min-h-screen sticky top-0 max-h-screen">
        {sidebarInner}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-900 flex flex-col animate-fadeUp">
            <button onClick={() => setOpen(false)} aria-label="બંધ કરો" className="absolute top-3 right-3 text-cream-100 h-9 w-9 flex items-center justify-center rounded-full hover:bg-navy-800"><X size={19} /></button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {session.actingAsOwner && (
          <div className="bg-saffron-500 text-navy-900 px-4 py-2 flex items-center justify-between gap-3 text-[13.5px] font-semibold sticky top-0 z-40">
            <span className="inline-flex items-center gap-1.5"><ShieldAlert size={16} /> તમે Prangan One સપોર્ટ તરીકે કામ કરી રહ્યા છો</span>
            <button onClick={exitImpersonation} className="underline shrink-0">બહાર જાઓ</button>
          </div>
        )}
        <SubscriptionBanner audience="admin" />
        <header className="glass sticky top-0 z-40 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="મેનુ" className="h-10 w-10 rounded-xl bg-navy-800 text-cream-50 flex items-center justify-center"><Menu size={19} /></button>
          <div className="font-bold text-navy-900 flex-1">{title}</div>
          <PranganBrand variant="wordmark-navy" height={16} className="opacity-70" />
        </header>
        <main className="p-4 sm:p-6 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
