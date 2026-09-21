import type { PostBusinessTransactionInput } from './types'

export type SerializableTransactionInput = Omit<PostBusinessTransactionInput, 'proof'>

export interface BusinessTransactionPreset {
  id: string
  label: string
  input: SerializableTransactionInput
}

export interface BusinessEntryDefaults {
  accountId?: string | null
  partnerId?: string | null
  categoryId?: string | null
  paymentStatus?: 'unpaid' | 'paid'
  paidBy?: 'business' | 'partner'
}

export interface OfflineBusinessTransaction {
  id: string
  createdAt: string
  input: SerializableTransactionInput
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown, eventName?: string) => {
  localStorage.setItem(key, JSON.stringify(value))
  if (eventName) window.dispatchEvent(new Event(eventName))
}

const defaultsKey = (businessId: string) => `prangan-business-defaults:${businessId}`
const favoritesKey = (businessId: string) => `prangan-business-favorites:${businessId}`
const queueKey = (businessId: string) => `prangan-business-offline:${businessId}`

export const getBusinessEntryDefaults = (businessId: string) =>
  read<BusinessEntryDefaults>(defaultsKey(businessId), {})

export const saveBusinessEntryDefaults = (businessId: string, defaults: BusinessEntryDefaults) =>
  write(defaultsKey(businessId), defaults)

export const getBusinessFavorites = (businessId: string) =>
  read<BusinessTransactionPreset[]>(favoritesKey(businessId), [])

export function saveBusinessFavorite(businessId: string, label: string, input: SerializableTransactionInput) {
  const current = getBusinessFavorites(businessId)
  const next: BusinessTransactionPreset[] = [
    { id: crypto.randomUUID(), label: label.trim() || 'Favourite', input },
    ...current,
  ].slice(0, 8)
  write(favoritesKey(businessId), next, 'prangan-business-favorites')
  return next
}

export function removeBusinessFavorite(businessId: string, id: string) {
  const next = getBusinessFavorites(businessId).filter(item => item.id !== id)
  write(favoritesKey(businessId), next, 'prangan-business-favorites')
  return next
}

export const getOfflineBusinessQueue = (businessId: string) =>
  read<OfflineBusinessTransaction[]>(queueKey(businessId), [])

export function queueOfflineBusinessTransaction(businessId: string, input: SerializableTransactionInput) {
  const current = getOfflineBusinessQueue(businessId)
  const item: OfflineBusinessTransaction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
  }
  write(queueKey(businessId), [...current, item], 'prangan-business-queue')
  return item.id
}

export function removeOfflineBusinessTransaction(businessId: string, id: string) {
  const next = getOfflineBusinessQueue(businessId).filter(item => item.id !== id)
  write(queueKey(businessId), next, 'prangan-business-queue')
  return next
}
