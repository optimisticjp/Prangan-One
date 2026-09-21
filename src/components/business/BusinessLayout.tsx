import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { CheckSquare2, Home, LayoutGrid, List, Plus, Users } from 'lucide-react'
import { PranganBrand } from '../PranganBrand'
import { PageSkeleton } from '../Skeleton'
import { useBusiness } from '../../lib/business/store'
import type { BusinessTransactionKind } from '../../lib/business/types'
import { QuickTransactionSheet } from './QuickTransactionSheet'

export interface BusinessOutletContext {
  openTransaction: (kind?: Exclude<BusinessTransactionKind, 'reversal'>) => void
}

const tabs = [
  { to: '/business', label: 'Home', icon: Home, end: true },
  { to: '/business/ledger', label: 'Ledger', icon: List },
  { to: '/business/approvals', label: 'Approvals', icon: CheckSquare2 },
  { to: '/business/partners', label: 'Partners', icon: Users },
]

export default function BusinessLayout() {
  const { authenticated, loading, memberships, activeMembership, switchBusiness, data, refreshing } = useBusiness()
  const [composer, setComposer] = useState<Exclude<BusinessTransactionKind, 'reversal'> | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  if (loading) return <div className="min-h-screen bg-cream-50 p-4 max-w-2xl mx-auto"><PageSkeleton label="Loading business workspace..." /></div>
  if (!authenticated) return <Navigate to="/login" replace />
  if (!activeMembership) return <Navigate to="/business/onboarding" replace />
  if (!data.business) return <div className="min-h-screen bg-cream-50 p-4 max-w-2xl mx-auto"><PageSkeleton label="Loading business data..." /></div>

  const openTransaction = (kind: Exclude<BusinessTransactionKind, 'reversal'> = 'expense') => {
    setComposer(kind)
    setComposerOpen(true)
  }

  return (
    <div className="min-h-screen bg-cream-50 max-w-2xl mx-auto border-x border-cream-200/70">
      <header className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur border-b border-cream-200 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <PranganBrand variant="symbol-navy" height={30} />
          <div className="min-w-0 flex-1">
            {memberships.length > 1 ? (
              <select value={activeMembership.businessId} onChange={e => switchBusiness(e.target.value)} aria-label="Choose business"
                className="max-w-full bg-transparent font-bold text-[15px] text-navy-900 outline-none truncate">
                {memberships.map(m => <option key={m.membershipId} value={m.businessId}>{m.businessName}</option>)}
              </select>
            ) : <div className="font-bold text-[15px] text-navy-900 truncate">{data.business.name}</div>}
            <div className="text-[10.5px] text-navy-400 font-semibold uppercase tracking-wide">Business money workspace · {activeMembership.role}</div>
          </div>
          {refreshing && <span className="text-[10px] text-navy-300">Syncing…</span>}
          <Link to="/business/more" aria-label="More business tools" className="h-9 w-9 rounded-xl border border-cream-300 bg-white flex items-center justify-center text-navy-700 active:scale-95">
            <LayoutGrid size={17} />
          </Link>
        </div>
      </header>

      <main className="px-3 pt-3 pb-24">
        <Outlet context={{ openTransaction } satisfies BusinessOutletContext} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 max-w-2xl mx-auto border-t border-cream-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 items-end px-1">
          {tabs.slice(0, 2).map(tab => <BusinessTab key={tab.to} {...tab} />)}
          <button onClick={() => openTransaction('expense')} aria-label="Add transaction" className="relative -top-3 mx-auto h-12 w-12 rounded-2xl bg-saffron-500 text-navy-950 shadow-lift flex items-center justify-center active:scale-95">
            <Plus size={24} strokeWidth={2.6} />
          </button>
          {tabs.slice(2).map(tab => <BusinessTab key={tab.to} {...tab} />)}
        </div>
      </nav>

      <QuickTransactionSheet open={composerOpen} initialKind={composer ?? 'expense'} onClose={() => setComposerOpen(false)} />
    </div>
  )
}

function BusinessTab({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Home; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${isActive ? 'text-saffron-700' : 'text-navy-400'}`}>
      {({ isActive }) => <><Icon size={19} strokeWidth={isActive ? 2.5 : 2} /><span>{label}</span></>}
    </NavLink>
  )
}
