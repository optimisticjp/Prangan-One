import { supabase } from '../supabase'
import type {
  AccountBalance, ApprovalMode, Business, BusinessAccount, BusinessAccountKind, BusinessApproval,
  BusinessAttachment, BusinessCategory, BusinessDayClosing, BusinessMembership, BusinessPartner,
  BusinessSnapshot, BusinessTransaction, PartnerPosition, PostBusinessTransactionInput,
} from './types'

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

const message = (error: { message?: string } | null) => error?.message || 'Something went wrong'

export async function claimBusinessMemberships(): Promise<BusinessMembership[]> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('claim_business_memberships')
  if (error) throw error
  return ((data ?? []) as unknown as Array<{ membership_id: string; business_id: string; business_name: string; role: BusinessMembership['role']; partner_id: string | null }>).map(row => ({
    membershipId: row.membership_id,
    businessId: row.business_id,
    businessName: row.business_name,
    role: row.role,
    partnerId: row.partner_id,
  }))
}

export async function createBusiness(input: { name: string; ownerName: string; approvalMode: ApprovalMode; openingCash: number }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_business', {
    target_name: input.name.trim(),
    owner_name: input.ownerName.trim(),
    target_approval_mode: input.approvalMode,
    opening_cash: input.openingCash,
  })
  if (error) throw error
  return data as string
}

export async function fetchBusinessSnapshot(businessId: string): Promise<BusinessSnapshot> {
  const client = requireSupabase()
  const [businessRes, partnersRes, accountsRes, categoriesRes, transactionsRes, approvalsRes, attachmentsRes, closingsRes, balancesRes, positionsRes] = await Promise.all([
    client.from('businesses').select('id,name,currency,approval_mode,created_by,created_at').eq('id', businessId).maybeSingle(),
    client.from('business_partners').select('*').eq('business_id', businessId).eq('active', true).order('created_at'),
    client.from('business_accounts').select('*').eq('business_id', businessId).eq('active', true).order('created_at'),
    client.from('business_categories').select('*').eq('business_id', businessId).eq('active', true).order('name'),
    client.from('business_transactions').select('*').eq('business_id', businessId).order('occurred_at', { ascending: false }).limit(500),
    client.from('business_transaction_approvals').select('*').eq('business_id', businessId).order('decided_at', { ascending: false }).limit(500),
    client.from('business_attachments').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500),
    client.from('business_day_closings').select('*').eq('business_id', businessId).order('close_date', { ascending: false }).limit(90),
    client.rpc('get_business_account_balances', { target_business: businessId }),
    client.rpc('get_business_partner_positions', { target_business: businessId }),
  ])
  const errors = [businessRes.error, partnersRes.error, accountsRes.error, categoriesRes.error, transactionsRes.error, approvalsRes.error, attachmentsRes.error, closingsRes.error, balancesRes.error, positionsRes.error].filter(Boolean)
  if (errors.length) throw new Error(message(errors[0]))

  return {
    business: businessRes.data as unknown as Business | null,
    partners: (partnersRes.data ?? []) as unknown as BusinessPartner[],
    accounts: (accountsRes.data ?? []) as unknown as BusinessAccount[],
    categories: (categoriesRes.data ?? []) as unknown as BusinessCategory[],
    transactions: (transactionsRes.data ?? []) as unknown as BusinessTransaction[],
    approvals: (approvalsRes.data ?? []) as unknown as BusinessApproval[],
    attachments: (attachmentsRes.data ?? []) as unknown as BusinessAttachment[],
    closings: (closingsRes.data ?? []) as unknown as BusinessDayClosing[],
    accountBalances: (balancesRes.data ?? []) as unknown as AccountBalance[],
    partnerPositions: (positionsRes.data ?? []) as unknown as PartnerPosition[],
  }
}

export async function postBusinessTransaction(businessId: string, input: PostBusinessTransactionInput): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('post_business_transaction', {
    target_business: businessId,
    target_kind: input.kind,
    target_amount: input.amount,
    target_account: input.accountId || null,
    target_to_account: input.toAccountId || null,
    target_partner: input.partnerId || null,
    target_category: input.categoryId || null,
    target_counterparty: input.counterparty?.trim() || null,
    target_note: input.note?.trim() || null,
    target_occurred_at: input.occurredAt || new Date().toISOString(),
  })
  if (error) throw error
  return data as string
}

export async function uploadBusinessProof(businessId: string, transactionId: string, file: File): Promise<void> {
  const client = requireSupabase()
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) throw new Error('Use JPG, PNG, WebP or PDF proof files.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Proof file must be 8 MB or smaller.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'proof'
  const path = `${businessId}/${transactionId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await client.storage.from('business-proofs').upload(path, file, { upsert: false, contentType: file.type })
  if (uploadError) throw uploadError
  const user = (await client.auth.getUser()).data.user
  if (!user) throw new Error('Session expired')
  const { error } = await client.from('business_attachments').insert({
    business_id: businessId,
    transaction_id: transactionId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    uploaded_by: user.id,
  })
  if (error) throw error
}

export async function getBusinessProofUrl(path: string): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client.storage.from('business-proofs').createSignedUrl(path, 300)
  if (error) return null
  return data.signedUrl
}

export async function approveBusinessTransaction(transactionId: string, note = '') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('approve_business_transaction', { target_transaction: transactionId, target_note: note || null })
  if (error) throw error
  return data as string
}

export async function rejectBusinessTransaction(transactionId: string, note = '') {
  const client = requireSupabase()
  const { error } = await client.rpc('reject_business_transaction', { target_transaction: transactionId, target_note: note || null })
  if (error) throw error
}

export async function reverseBusinessTransaction(transactionId: string, reason: string) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('reverse_business_transaction', { target_transaction: transactionId, target_reason: reason.trim() })
  if (error) throw error
  return data as string
}

export async function addBusinessPartner(businessId: string, input: { name: string; email?: string; phone?: string; ownership?: number | null }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('add_business_partner', {
    target_business: businessId,
    partner_name: input.name.trim(),
    partner_email: input.email?.trim() || null,
    partner_phone: input.phone?.trim() || null,
    partner_ownership: input.ownership ?? null,
  })
  if (error) throw error
  return data as string
}

export async function addBusinessAccount(businessId: string, input: { name: string; kind: BusinessAccountKind; openingBalance: number }) {
  const client = requireSupabase()
  const { error } = await client.from('business_accounts').insert({
    business_id: businessId, name: input.name.trim(), kind: input.kind, opening_balance: input.openingBalance,
  })
  if (error) throw error
}

export async function updateBusinessSettings(businessId: string, input: { name: string; approvalMode: ApprovalMode }) {
  const client = requireSupabase()
  const { error } = await client.from('businesses').update({ name: input.name.trim(), approval_mode: input.approvalMode, updated_at: new Date().toISOString() }).eq('id', businessId)
  if (error) throw error
}

export async function closeBusinessDay(accountId: string, counted: number, note = '') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('close_business_day', { target_account: accountId, target_counted: counted, target_note: note || null })
  if (error) throw error
  return data as string
}

export async function reopenBusinessDay(closingId: string, reason: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('reopen_business_day', { target_closing: closingId, target_reason: reason.trim() })
  if (error) throw error
}
