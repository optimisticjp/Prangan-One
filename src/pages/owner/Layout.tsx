/**
 * Owner console shell. Deliberately separate from the tenant-facing Shell
 * in src/layouts/Layouts.tsx: this one's branding is fixed to Prangan One
 * itself, not whichever society happens to be active in session, since
 * this is the Prangan One platform owner's own console, not a
 * committee-facing surface.
 */
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Wallet, Inbox, ScrollText, ArrowLeftRight, LogOut, Menu, X } from 'lucide-react'
import { useData } from '../../lib/store'
import { PranganBrand } from '../../components/PranganBrand'
import { useAppLang } from '../../lib/useAppLang'
import { SyncFailureBanner } from '../../components/SyncFailureBanner'

const nav = [
  { to: '/owner', label: 'ડેશબોર્ડ', icon: LayoutDashboard, end: true },
  { to: '/owner/societies', label: 'સોસાયટીઓ', icon: Building2 },
  { to: '/owner/billing', label: 'પ્લેટફોર્મ બિલિંગ', icon: Wallet },
  { to: '/owner/leads', label: 'લીડ ઈનબોક્સ', icon: Inbox },
  { to: '/owner/activity', label: 'એક્ટિવિટી લોગ', icon: ScrollText },
]

export default function OwnerLayout() {
  useAppLang()
  const { logout, session } = useData()
  const nav_ = useNavigate()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex-1">
          <PranganBrand variant="wordmark-white" height={24} />
          <div className="text-[11.5px] text-saffron-400 font-semibold leading-tight mt-1.5">ઓનર કન્સોલ</div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-cream-100/70" aria-label="બંધ કરો"><X size={20} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {nav.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-medium transition-colors ${isActive ? 'bg-saffron-500 text-navy-900 font-semibold' : 'text-cream-100/80 hover:bg-navy-800 hover:text-cream-50'}`}>
            <it.icon size={18} /> {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-navy-800">
        <button onClick={() => { logout(); nav_('/login') }}
          className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[14px] text-navy-100/70 hover:bg-navy-800 hover:text-cream-50">
          {session.isRealSession ? <LogOut size={17} /> : <ArrowLeftRight size={17} />}
          {session.isRealSession ? 'લોગ આઉટ' : 'રોલ બદલો'}
        </button>
        <p className="text-center text-[10.5px] text-navy-500 mt-2">Prangan One · The Society OS</p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-cream-100 flex">
      <SyncFailureBanner />
      <aside className="hidden md:flex md:w-64 md:flex-col bg-brand-navy shrink-0">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-brand-navy flex flex-col">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-brand-navy text-cream-50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} aria-label="મેનુ ખોલો"><Menu size={22} /></button>
          <PranganBrand variant="symbol-white" height={24} />
          <span className="font-bold">Prangan One ઓનર કન્સોલ</span>
        </header>
        <main className="p-4 sm:p-6 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
