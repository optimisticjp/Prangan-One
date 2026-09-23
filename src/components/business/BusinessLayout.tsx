import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { Bell, Home, LayoutGrid, List, ListTodo, MapPinned, Plus, Users, WalletCards, WifiOff } from 'lucide-react'
import { PranganBrand } from '../PranganBrand'
import { PageSkeleton } from '../Skeleton'
import { useBusiness } from '../../lib/business/store'
import { useBusinessLanguage } from '../../lib/business/i18n'
import type { SerializableTransactionInput } from '../../lib/business/preferences'
import type { BusinessTransactionKind } from '../../lib/business/types'
import { QuickTransactionSheet } from './QuickTransactionSheet'

type BusinessComposerKind = Exclude<BusinessTransactionKind, 'reversal' | 'personal_expense'>

export interface BusinessOutletContext {
  openTransaction: (kind?: BusinessComposerKind, preset?: SerializableTransactionInput | null) => void
}

export default function BusinessLayout() {
  const { authenticated, loading, memberships, activeMembership, switchBusiness, data, refreshing, offlineQueueCount, syncOfflineQueue, isStaff } = useBusiness()
  const { t } = useBusinessLanguage()
  const [composer, setComposer] = useState<BusinessComposerKind | null>(null)
  const [preset, setPreset] = useState<SerializableTransactionInput | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => {
    if (navigator.onLine && offlineQueueCount > 0) void syncOfflineQueue()
  }, [offlineQueueCount, syncOfflineQueue])

  if (loading) return <div className="min-h-[100dvh] bg-cream-50 p-4 max-w-2xl mx-auto"><PageSkeleton label="Loading business workspace..." /></div>
  if (!authenticated) return <Navigate to="/business/login" replace />
  if (!activeMembership) return <Navigate to="/business/onboarding" replace />
  if (!data.business) return <div className="min-h-[100dvh] bg-cream-50 p-4 max-w-2xl mx-auto"><PageSkeleton label="Loading business data..." /></div>

  const tabs = isStaff ? [
    { to: '/business', label: 'Home', icon: Home, end: true },
    { to: '/business/tasks', label: 'Tasks', icon: ListTodo },
    { to: '/business/my-money', label: 'My money', icon: WalletCards },
    { to: '/business/notifications', label: 'Alerts', icon: Bell },
  ] : [
    { to: '/business', label: t('home'), icon: Home, end: true },
    { to: '/business/ledger', label: t('ledger'), icon: List },
    { to: '/business/money-map', label: 'Money', icon: MapPinned },
    { to: '/business/partners', label: t('partners'), icon: Users },
  ]

  const openTransaction = (kind: BusinessComposerKind = 'expense', nextPreset: SerializableTransactionInput | null = null) => {
    setComposer(nextPreset?.kind as BusinessComposerKind || kind)
    setPreset(nextPreset)
    setComposerOpen(true)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setPreset(null)
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-2xl mx-auto overflow-x-hidden bg-cream-50 border-x border-cream-200/70">
      <header className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur border-b border-cream-200 px-3 py-2">
        <div className="flex items-center gap-2.5">
          <PranganBrand variant="symbol-navy" height={28} />
          <div className="min-w-0 flex-1">
            {memberships.length > 1 ? (
              <select value={activeMembership.businessId} onChange={e => switchBusiness(e.target.value)} aria-label="Choose business"
                className="max-w-full bg-transparent font-bold text-[14px] text-navy-900 outline-none truncate">
                {memberships.map(m => <option key={m.membershipId} value={m.businessId}>{m.businessName}</option>)}
              </select>
            ) : <div className="font-bold text-[15px] text-navy-900 truncate">{data.business.name}</div>}
            <div className="text-[10px] text-navy-400 font-semibold uppercase tracking-wide">{isStaff ? 'Staff workspace' : 'Business money'} · {activeMembership.role}</div>
          </div>
          {offlineQueueCount > 0 ? (
            <button onClick={() => void syncOfflineQueue()} className="min-h-[34px] rounded-xl bg-amber-50 border border-amber-200 px-2 flex items-center gap-1 text-[10px] font-semibold text-pend" title="Offline entries waiting to sync">
              <WifiOff size={13} /> {offlineQueueCount}
            </button>
          ) : refreshing ? <span className="text-[10px] text-navy-300">Syncing…</span> : null}
          <Link to={isStaff ? "/business/notifications" : "/business/more"} aria-label="More business tools" className="h-9 w-9 rounded-xl border border-cream-300 bg-white flex items-center justify-center text-navy-700 active:scale-95">
            {isStaff ? <Bell size={17} /> : <LayoutGrid size={17} />}
          </Link>
        </div>
      </header>

      <main className="w-full min-w-0 overflow-x-hidden px-3 pt-2.5 pb-20">
        <Outlet context={{ openTransaction } satisfies BusinessOutletContext} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 max-w-2xl mx-auto border-t border-cream-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 items-end px-1 min-h-[54px]">
          {isStaff ? tabs.map(tab => <BusinessTab key={tab.to} {...tab} />) : <>
            {tabs.slice(0, 2).map(tab => <BusinessTab key={tab.to} {...tab} />)}
            <button onClick={() => openTransaction('expense')} aria-label="Add transaction" className="relative -top-2.5 mx-auto h-11 w-11 rounded-xl bg-saffron-500 text-navy-950 shadow-lift flex items-center justify-center active:scale-95">
              <Plus size={24} strokeWidth={2.6} />
            </button>
            {tabs.slice(2).map(tab => <BusinessTab key={tab.to} {...tab} />)}
          </>}
        </div>
      </nav>

      {!isStaff && <QuickTransactionSheet open={composerOpen} initialKind={composer ?? 'expense'} initialPreset={preset} onClose={closeComposer} />}
    </div>
  )
}

function BusinessTab({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Home; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `min-h-[50px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${isActive ? 'text-saffron-700' : 'text-navy-400'}`}>
      {({ isActive }) => <><Icon size={18} strokeWidth={isActive ? 2.5 : 2} /><span>{label}</span></>}
    </NavLink>
  )
}
