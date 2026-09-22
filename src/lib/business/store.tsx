import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import * as api from './data'
import {
  getOfflineBusinessQueue,
  queueOfflineBusinessTransaction,
  removeOfflineBusinessTransaction,
} from './preferences'
import type {
  ApprovalMode, BusinessAccountKind, BusinessDayClosingEditInput, BusinessMembership, BusinessOnboardingRequest,
  BusinessPartnerEditInput, BusinessSnapshot, BusinessTransactionEditInput, MarkBusinessExpensePaidInput, PostBusinessTransactionInput,
} from './types'

const EMPTY: BusinessSnapshot = {
  business: null,
  partners: [],
  members: [],
  accounts: [],
  categories: [],
  transactions: [],
  approvals: [],
  attachments: [],
  closings: [],
  activity: [],
  accountBalances: [],
  partnerPositions: [],
  staff: [],
  tasks: [],
  taskNotes: [],
  notifications: [],
  staffMoney: [],
  staffPositions: [],
}

interface BusinessContextValue {
  authenticated: boolean
  loading: boolean
  refreshing: boolean
  userId: string | null
  memberships: BusinessMembership[]
  onboardingRequest: BusinessOnboardingRequest | null
  activeMembership: BusinessMembership | null
  data: BusinessSnapshot
  canWrite: boolean
  canAdmin: boolean
  canApprove: boolean
  isStaff: boolean
  canManageTeam: boolean
  offlineQueueCount: number
  switchBusiness: (businessId: string) => void
  reload: () => Promise<void>
  refreshAccess: () => Promise<void>
  syncOfflineQueue: () => Promise<number>
  requestBusiness: (input: { name: string; ownerName: string; phone?: string; city?: string; businessType?: string }) => Promise<string>
  postTransaction: (input: PostBusinessTransactionInput) => Promise<string>
  importTransactions: (inputs: PostBusinessTransactionInput[]) => Promise<number>
  attachProof: (transactionId: string, file: File) => Promise<void>
  markExpensePaid: (id: string, input: MarkBusinessExpensePaidInput) => Promise<void>
  approveTransaction: (id: string, note?: string) => Promise<void>
  rejectTransaction: (id: string, note?: string) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  editTransaction: (id: string, input: BusinessTransactionEditInput) => Promise<void>
  addPartner: (input: { name: string; email?: string; phone?: string; ownership?: number | null }) => Promise<void>
  editPartner: (id: string, input: BusinessPartnerEditInput) => Promise<void>
  deletePartner: (id: string) => Promise<void>
  addAccount: (input: { name: string; kind: BusinessAccountKind; openingBalance: number }) => Promise<void>
  editAccount: (id: string, input: { name: string; kind: BusinessAccountKind; openingBalance: number }) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  addCategory: (input: { name: string; kind: 'income' | 'expense' | 'both' }) => Promise<void>
  editCategory: (id: string, input: { name: string; kind: 'income' | 'expense' | 'both' }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  saveSettings: (input: { name: string; approvalMode: ApprovalMode }) => Promise<void>
  deleteBusiness: () => Promise<void>
  closeDay: (accountId: string, counted: number, note?: string) => Promise<void>
  editDayClose: (closingId: string, input: BusinessDayClosingEditInput) => Promise<void>
  deleteDayClose: (closingId: string) => Promise<void>
  addStaff: (input: { name: string; email?: string; phone?: string; title?: string; salary: number; salaryPeriod: 'monthly' | 'weekly' | 'daily' }) => Promise<void>
  editStaff: (id: string, input: { name: string; email?: string; phone?: string; title?: string; salary: number; salaryPeriod: 'monthly' | 'weekly' | 'daily'; active: boolean }) => Promise<void>
  deleteStaff: (id: string) => Promise<void>
  addTask: (input: { title: string; description?: string; category: string; priority: 'urgent' | 'high' | 'normal' | 'low'; partnerId?: string | null; staffId?: string | null; dueAt?: string | null }) => Promise<void>
  editTask: (id: string, input: { title: string; description?: string; category: string; priority: 'urgent' | 'high' | 'normal' | 'low'; partnerId?: string | null; staffId?: string | null; dueAt?: string | null }) => Promise<void>
  setTaskStatus: (id: string, status: 'pending' | 'in_progress' | 'completed', note?: string) => Promise<void>
  addTaskNote: (id: string, note: string, notify?: boolean) => Promise<void>
  sendTaskReminder: (id: string, message?: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addStaffMoney: (input: { staffId: string; kind: 'advance' | 'advance_expense' | 'pocket_expense' | 'reimbursement' | 'salary' | 'advance_return'; amount: number; accountId?: string | null; categoryId?: string | null; counterparty?: string; note?: string; occurredAt?: string }) => Promise<void>
  deleteStaffMoney: (id: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)
const ACTIVE_KEY = 'prangan-business-id'

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<BusinessMembership[]>([])
  const [onboardingRequest, setOnboardingRequest] = useState<BusinessOnboardingRequest | null>(null)
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY))
  const [data, setData] = useState<BusinessSnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)

  const loadMemberships = useCallback(async () => {
    if (!supabase) {
      setAuthenticated(false)
      setOnboardingRequest(null)
      setLoading(false)
      return [] as BusinessMembership[]
    }

    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      setAuthenticated(false)
      setUserId(null)
      setMemberships([])
      setOnboardingRequest(null)
      setLoading(false)
      return [] as BusinessMembership[]
    }

    setAuthenticated(true)
    setUserId(user.id)
    const [list, request] = await Promise.all([
      api.claimBusinessMemberships(),
      api.getMyBusinessOnboarding(),
    ])

    setMemberships(list)
    setOnboardingRequest(request)
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
    if (!activeBusinessId) {
      setData(EMPTY)
      return
    }
    const membership = memberships.find(item => item.businessId === activeBusinessId)
    if (!membership) {
      setData(EMPTY)
      return
    }
    setRefreshing(true)
    try {
      setData(await api.fetchBusinessSnapshot(
        activeBusinessId,
        membership.role,
        membership.businessName,
        membership.staffId ?? null,
      ))
    } finally {
      setRefreshing(false)
    }
  }, [activeBusinessId, memberships])

  const syncOfflineQueue = useCallback(async () => {
    if (!activeBusinessId || !navigator.onLine) return 0
    const queue = getOfflineBusinessQueue(activeBusinessId)
    let synced = 0
    for (const item of queue) {
      try {
        await api.postBusinessTransaction(activeBusinessId, item.input)
        removeOfflineBusinessTransaction(activeBusinessId, item.id)
        synced += 1
      } catch {
        break
      }
    }
    setOfflineQueueCount(getOfflineBusinessQueue(activeBusinessId).length)
    if (synced > 0) await reload()
    return synced
  }, [activeBusinessId, reload])

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        await loadMemberships()
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [loadMemberships])

  useEffect(() => {
    if (activeBusinessId) {
      setOfflineQueueCount(getOfflineBusinessQueue(activeBusinessId).length)
      void reload()
    } else {
      setData(EMPTY)
      setOfflineQueueCount(0)
    }
  }, [activeBusinessId, reload])

  useEffect(() => {
    const refreshQueue = () => {
      if (activeBusinessId) setOfflineQueueCount(getOfflineBusinessQueue(activeBusinessId).length)
    }
    const online = () => { void syncOfflineQueue() }
    window.addEventListener('prangan-business-queue', refreshQueue)
    window.addEventListener('storage', refreshQueue)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('prangan-business-queue', refreshQueue)
      window.removeEventListener('storage', refreshQueue)
      window.removeEventListener('online', online)
    }
  }, [activeBusinessId, syncOfflineQueue])

  const activeMembership = memberships.find(m => m.businessId === activeBusinessId) ?? null
  const role = activeMembership?.role
  const canWrite = role === 'admin' || role === 'partner' || role === 'bookkeeper'
  const canAdmin = role === 'admin'
  const canApprove = role === 'admin' || role === 'partner'
  const isStaff = role === 'staff'
  const canManageTeam = role === 'admin' || role === 'partner'

  const switchBusiness = (businessId: string) => {
    if (!memberships.some(m => m.businessId === businessId)) return
    localStorage.setItem(ACTIVE_KEY, businessId)
    setActiveBusinessId(businessId)
  }

  const requestBusiness = async (input: { name: string; ownerName: string; phone?: string; city?: string; businessType?: string }) => {
    const id = await api.requestBusinessOnboarding(input)
    await loadMemberships()
    return id
  }

  const withReload = async (fn: () => Promise<unknown>) => {
    await fn()
    await reload()
  }

  const postTransaction = async (input: PostBusinessTransactionInput) => {
    if (!activeBusinessId) throw new Error('Choose a business first')

    if (!navigator.onLine) {
      const { proof: _proof, ...serializable } = input
      const queueId = queueOfflineBusinessTransaction(activeBusinessId, serializable)
      setOfflineQueueCount(getOfflineBusinessQueue(activeBusinessId).length)
      return 'offline:' + queueId
    }

    const id = await api.postBusinessTransaction(activeBusinessId, input)
    if (input.proof) {
      try {
        await api.uploadBusinessProof(activeBusinessId, id, input.proof)
      } catch (error) {
        console.warn('[Prangan One] Business transaction saved but proof upload failed', error)
      }
    }
    await reload()
    return id
  }

  const importTransactions = async (inputs: PostBusinessTransactionInput[]) => {
    if (!activeBusinessId) throw new Error('Choose a business first')
    let imported = 0

    if (!navigator.onLine) {
      for (const input of inputs) {
        const { proof: _proof, ...serializable } = input
        queueOfflineBusinessTransaction(activeBusinessId, serializable)
        imported += 1
      }
      setOfflineQueueCount(getOfflineBusinessQueue(activeBusinessId).length)
      return imported
    }

    for (const input of inputs) {
      await api.postBusinessTransaction(activeBusinessId, input)
      imported += 1
    }
    await reload()
    return imported
  }

  const value = useMemo<BusinessContextValue>(() => ({
    authenticated,
    loading,
    refreshing,
    userId,
    memberships,
    onboardingRequest,
    activeMembership,
    data,
    canWrite,
    canAdmin,
    canApprove,
    isStaff,
    canManageTeam,
    offlineQueueCount,
    switchBusiness,
    reload,
    refreshAccess: async () => { await loadMemberships() },
    syncOfflineQueue,
    requestBusiness,
    postTransaction,
    importTransactions,
    attachProof: async (transactionId, file) => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await api.uploadBusinessProof(activeBusinessId, transactionId, file)
      await reload()
    },
    markExpensePaid: async (id, input) => withReload(() => api.markBusinessExpensePaid(id, input)),
    approveTransaction: async (id, note = '') => withReload(() => api.approveBusinessTransaction(id, note)),
    rejectTransaction: async (id, note = '') => withReload(() => api.rejectBusinessTransaction(id, note)),
    deleteTransaction: async id => withReload(() => api.hardDeleteBusinessTransaction(id)),
    editTransaction: async (id, input) => withReload(() => api.updateBusinessTransactionFull(id, input)),
    addPartner: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessPartner(activeBusinessId, input))
    },
    editPartner: async (id, input) => withReload(() => api.updateBusinessPartner(id, input)),
    deletePartner: async id => {
      await withReload(() => api.hardDeleteBusinessPartner(id))
      await loadMemberships()
    },
    addAccount: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessAccount(activeBusinessId, input))
    },
    editAccount: async (id, input) => withReload(() => api.updateBusinessAccount(id, input)),
    deleteAccount: async id => withReload(() => api.hardDeleteBusinessAccount(id)),
    addCategory: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessCategory(activeBusinessId, input))
    },
    editCategory: async (id, input) => withReload(() => api.updateBusinessCategory(id, input)),
    deleteCategory: async id => withReload(() => api.hardDeleteBusinessCategory(id)),
    saveSettings: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.updateBusinessSettings(activeBusinessId, input))
      await loadMemberships()
    },
    deleteBusiness: async () => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await api.hardDeleteBusiness(activeBusinessId)
      setData(EMPTY)
      await loadMemberships()
    },
    closeDay: async (accountId, counted, note = '') => withReload(() => api.closeBusinessDay(accountId, counted, note)),
    editDayClose: async (closingId, input) => withReload(() => api.updateBusinessDayClosing(closingId, input)),
    deleteDayClose: async closingId => withReload(() => api.hardDeleteBusinessDayClosing(closingId)),
    addStaff: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.addBusinessStaff(activeBusinessId, input))
    },
    editStaff: async (id, input) => withReload(() => api.updateBusinessStaff(id, input)),
    deleteStaff: async id => withReload(() => api.deleteBusinessStaff(id)),
    addTask: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.createBusinessTask(activeBusinessId, input))
    },
    editTask: async (id, input) => withReload(() => api.updateBusinessTask(id, input)),
    setTaskStatus: async (id, status, note) => withReload(() => api.setBusinessTaskStatus(id, status, note)),
    addTaskNote: async (id, note, notify = true) => withReload(() => api.addBusinessTaskNote(id, note, notify)),
    sendTaskReminder: async (id, message) => withReload(() => api.sendBusinessTaskReminder(id, message)),
    deleteTask: async id => withReload(() => api.deleteBusinessTask(id)),
    addStaffMoney: async input => {
      if (!activeBusinessId) throw new Error('Choose a business first')
      await withReload(() => api.recordBusinessStaffMoney(activeBusinessId, input))
    },
    deleteStaffMoney: async id => withReload(() => api.deleteBusinessStaffMoney(id)),
    markNotificationRead: async id => withReload(() => api.markBusinessNotificationRead(id)),
    markAllNotificationsRead: async () => {
      if (!activeBusinessId) return
      await withReload(() => api.markAllBusinessNotificationsRead(activeBusinessId))
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    authenticated, loading, refreshing, userId, memberships, onboardingRequest,
    activeMembership, data, canWrite, canAdmin, canApprove, isStaff, canManageTeam, offlineQueueCount,
    activeBusinessId, reload, loadMemberships, syncOfflineQueue,
  ])

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const value = useContext(BusinessContext)
  if (!value) throw new Error('useBusiness must be used inside BusinessProvider')
  return value
}
