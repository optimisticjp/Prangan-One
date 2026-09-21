import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import * as api from './data'
import type {
  ApprovalMode, BusinessAccountKind, BusinessMembership, BusinessSnapshot, PostBusinessTransactionInput,
} from './types'

const EMPTY: BusinessSnapshot = {
  business: null, partners: [], accounts: [], categories: [], transactions: [], approvals: [], attachments: [], closings: [], accountBalances: [], partnerPositions: [],
}

interface BusinessContextValue {
  authenticated: boolean
  loading: boolean
  refreshing: boolean
  userId: string | null
  memberships: BusinessMembership[]
  activeMembership: BusinessMembership | null
  data: BusinessSnapshot
  canWrite: boolean
  canAdmin: boolean
  canApprove: boolean
  switchBusiness: (businessId: string) => void
  reload: () => Promise<void>
  createBusiness: (input: { name: string; ownerName: string; approvalMode: ApprovalMode; openingCash: number }) => Promise<string>
  postTransaction: (input: PostBusinessTransactionInput) => Promise<string>
  approveTransaction: (id: string, note?: string) => Promise<void>
  rejectTransaction: (id: string, note?: string) => Promise<void>
  reverseTransaction: (id: string, reason: string) => Promise<void>
  addPartner: (input: { name: string; email?: string; phone?: string; ownership?: number | null }) => Promise<void>
  addAccount: (input: { name: string; kind: BusinessAccountKind; openingBalance: number }) => Promise<void>
  saveSettings: (input: { name: string; approvalMode: ApprovalMode }) => Promise<void>
  closeDay: (accountId: string, counted: number, note?: string) => Promise<void>
  reopenDay: (closingId: string, reason: string) => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)
const ACTIVE_KEY = 'prangan-business-id'

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<BusinessMembership[]>([])
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY))
  const [data, setData] = useState<BusinessSnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadMemberships = useCallback(async () => {
    if (!supabase) { setAuthenticated(false); setLoading(false); return [] as BusinessMembership[] }
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setAuthenticated(false); setUserId(null); setMemberships([]); setLoading(false); return [] as BusinessMembership[] }
    setAuthenticated(true)
    setUserId(user.id)
    const list = await api.claimBusinessMemberships()
    setMemberships(list)
    setActiveBusinessId(current => {
      const valid = current && list.some(m => m.businessId === current)
      const next = valid ? current : list[0]?.businessId ?? null
      if (next) localStorage.setItem(ACTIVE_KEY, next)
      else localStorage.removeItem(ACTIVE_KEY)
      return next
    })
    return list
  }, [])

  const reload = useCallback(async () => {
    if (!activeBusinessId) { setData(EMPTY); return }
    setRefreshing(true)
    try { setData(await api.fetchBusinessSnapshot(activeBusinessId)) }
    finally { setRefreshing(false) }
  }, [activeBusinessId])

  useEffect(() => {
    let live = true
    ;(async () => {
      try { await loadMemberships() }
      finally { if (live) setLoading(false) }
    })()
    return () => { live = false }
  }, [loadMemberships])

  useEffect(() => { if (activeBusinessId) void reload(); else setData(EMPTY) }, [activeBusinessId, reload])

  const activeMembership = memberships.find(m => m.businessId === activeBusinessId) ?? null
  const role = activeMembership?.role
  const canWrite = role === 'admin' || role === 'partner' || role === 'bookkeeper'
  const canAdmin = role === 'admin'
  const canApprove = role === 'admin' || role === 'partner'

  const switchBusiness = (businessId: string) => {
    if (!memberships.some(m => m.businessId === businessId)) return
    localStorage.setItem(ACTIVE_KEY, businessId)
    setActiveBusinessId(businessId)
  }

  const createBusiness = async (input: { name: string; ownerName: string; approvalMode: ApprovalMode; openingCash: number }) => {
    const id = await api.createBusiness(input)
    localStorage.setItem(ACTIVE_KEY, id)
    setActiveBusinessId(id)
    await loadMemberships()
    return id
  }

  const withReload = async (fn: () => Promise<unknown>) => { await fn(); await reload() }
  const postTransaction = async (input: PostBusinessTransactionInput) => {
    if (!activeBusinessId) throw new Error('Choose a business first')
    const id = await api.postBusinessTransaction(activeBusinessId, input)
    // The financial post is the source of truth. A proof upload happens
    // afterward and must never make the UI report "transaction failed" after
    // money was already recorded, which could invite a duplicate retry.
    if (input.proof) {
      try { await api.uploadBusinessProof(activeBusinessId, id, input.proof) }
      catch (error) {
        // Keep the transaction successful and visible. The missing attachment
        // is obvious in Ledger and can be reattached in a later attachment UI.
        console.warn('[Prangan One] Business transaction saved but proof upload failed', error)
      }
    }
    await reload()
    return id
  }

  const value = useMemo<BusinessContextValue>(() => ({
    authenticated, loading, refreshing, userId, memberships, activeMembership, data, canWrite, canAdmin, canApprove,
    switchBusiness, reload, createBusiness, postTransaction,
    approveTransaction: async (id, note = '') => withReload(() => api.approveBusinessTransaction(id, note)),
    rejectTransaction: async (id, note = '') => withReload(() => api.rejectBusinessTransaction(id, note)),
    reverseTransaction: async (id, reason) => withReload(() => api.reverseBusinessTransaction(id, reason)),
    addPartner: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessPartner(activeBusinessId, input))
    },
    addAccount: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessAccount(activeBusinessId, input))
    },
    saveSettings: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.updateBusinessSettings(activeBusinessId, input))
      await loadMemberships()
    },
    closeDay: async (accountId, counted, note = '') => withReload(() => api.closeBusinessDay(accountId, counted, note)),
    reopenDay: async (closingId, reason) => withReload(() => api.reopenBusinessDay(closingId, reason)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [authenticated, loading, refreshing, userId, memberships, activeMembership, data, canWrite, canAdmin, canApprove, activeBusinessId, reload, loadMemberships])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const value = useContext(BusinessContext)
  if (!value) throw new Error('useBusiness must be used inside BusinessProvider')
  return value
}
