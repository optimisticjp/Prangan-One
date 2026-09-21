import { supabase } from '../supabase'
import type {
  AccountBalance, ApprovalMode, Business, BusinessAccount, BusinessAccountKind, BusinessActivityLog, BusinessApproval,
  BusinessAttachment, BusinessCategory, BusinessDayClosing, BusinessMemberSummary, BusinessMembership, BusinessOnboardingRequest,
  BusinessPartner, BusinessPartnerEditInput, BusinessSnapshot, BusinessTransaction, BusinessTransactionEditInput,
  BusinessDayClosingEditInput, MarkBusinessExpensePaidInput, PartnerPosition, PostBusinessTransactionInput,
} from './types'

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

const message = (error: { message?: string } | null) => error?.message || 'Something went wrong'

async function removeProofFilesForTransactions(transactionIds: string[]) {
  if (transactionIds.length === 0) return
  const client = requireSupabase()
  const { data } = await client.from('business_attachments').select('storage_path').in('transaction_id', transactionIds)
  const paths = (data ?? []).map(row => row.storage_path as string).filter(Boolean)
  if (paths.length) await client.storage.from('business-proofs').remove(paths)
}

async function transactionIdsForPartner(partnerId: string) {
  const client = requireSupabase()
  const { data } = await client.from('business_transactions').select('id').eq('partner_id', partnerId)
  return (data ?? []).map(row => row.id as string)
}

async function transactionIdsForAccount(accountId: string) {
  const client = requireSupabase()
  const [direct, destination, ledger] = await Promise.all([
    client.from('business_transactions').select('id').eq('account_id', accountId),
    client.from('business_transactions').select('id').eq('to_account_id', accountId),
    client.from('business_ledger_entries').select('transaction_id').eq('account_id', accountId),
  ])
  return Array.from(new Set([
    ...(direct.data ?? []).map(row => row.id as string),
    ...(destination.data ?? []).map(row => row.id as string),
    ...(ledger.data ?? []).map(row => row.transaction_id as string),
  ]))
}

async function transactionIdsForDelete(transactionId: string) {
  const client = requireSupabase()
  const { data } = await client.from('business_transactions').select('id').eq('reversed_transaction_id', transactionId)
  return [transactionId, ...(data ?? []).map(row => row.id as string)]
}


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

type OnboardingRow = {
  request_id: string
  business_name: string
  requester_name: string
  requester_email: string
  requester_phone: string | null
  city: string | null
  business_type: string | null
  status: BusinessOnboardingRequest['status']
  decision_note: string | null
  business_id: string | null
  created_at: string
  decided_at: string | null
}

const mapOnboarding = (row: OnboardingRow): BusinessOnboardingRequest => ({
  id: row.request_id,
  businessName: row.business_name,
  requesterName: row.requester_name,
  requesterEmail: row.requester_email,
  requesterPhone: row.requester_phone,
  city: row.city,
  businessType: row.business_type,
  status: row.status,
  decisionNote: row.decision_note,
  businessId: row.business_id,
  createdAt: row.created_at,
  decidedAt: row.decided_at,
})

export async function getMyBusinessOnboarding(): Promise<BusinessOnboardingRequest | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_my_business_onboarding')
  if (error) throw error
  const row = ((data ?? []) as unknown as OnboardingRow[])[0]
  return row ? mapOnboarding(row) : null
}

export async function requestBusinessOnboarding(input: {
  name: string
  ownerName: string
  phone?: string
  city?: string
  businessType?: string
}): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('request_business_onboarding', {
    target_name: input.name.trim(),
    requester_name: input.ownerName.trim(),
    requester_phone: input.phone?.trim() || null,
    requester_city: input.city?.trim() || null,
    target_business_type: input.businessType?.trim() || null,
  })
  if (error) throw error
  return data as string
}

export async function fetchBusinessSnapshot(businessId: string): Promise<BusinessSnapshot> {
  const client = requireSupabase()
  const [businessRes, partnersRes, membersRes, accountsRes, categoriesRes, transactionsRes, approvalsRes, attachmentsRes, closingsRes, activityRes, balancesRes, positionsRes] = await Promise.all([
    client.from('businesses').select('id,name,currency,approval_mode,created_by,created_at,archived_at').eq('id', businessId).maybeSingle(),
    client.from('business_partners').select('*').eq('business_id', businessId).order('created_at'),
    client.from('business_memberships').select('id,user_id,partner_id,email,display_name,role,status').eq('business_id', businessId).order('created_at'),
    client.from('business_accounts').select('*').eq('business_id', businessId).order('created_at'),
    client.from('business_categories').select('*').eq('business_id', businessId).order('name'),
    client.from('business_transactions').select('*').eq('business_id', businessId).order('occurred_at', { ascending: false }).limit(500),
    client.from('business_transaction_approvals').select('*').eq('business_id', businessId).order('decided_at', { ascending: false }).limit(500),
    client.from('business_attachments').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(500),
    client.from('business_day_closings').select('*').eq('business_id', businessId).order('close_date', { ascending: false }).limit(90),
    client.from('business_activity_logs').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(80),
    client.rpc('get_business_account_balances', { target_business: businessId }),
    client.rpc('get_business_partner_positions', { target_business: businessId }),
  ])
  const errors = [businessRes.error, partnersRes.error, membersRes.error, accountsRes.error, categoriesRes.error, transactionsRes.error, approvalsRes.error, attachmentsRes.error, closingsRes.error, activityRes.error, balancesRes.error, positionsRes.error].filter(Boolean)
  if (errors.length) throw new Error(message(errors[0]))

  return {
    business: businessRes.data as unknown as Business | null,
    partners: (partnersRes.data ?? []) as unknown as BusinessPartner[],
    members: (membersRes.data ?? []) as unknown as BusinessMemberSummary[],
    accounts: (accountsRes.data ?? []) as unknown as BusinessAccount[],
    categories: (categoriesRes.data ?? []) as unknown as BusinessCategory[],
    transactions: (transactionsRes.data ?? []) as unknown as BusinessTransaction[],
    approvals: (approvalsRes.data ?? []) as unknown as BusinessApproval[],
    attachments: (attachmentsRes.data ?? []) as unknown as BusinessAttachment[],
    closings: (closingsRes.data ?? []) as unknown as BusinessDayClosing[],
    activity: (activityRes.data ?? []) as unknown as BusinessActivityLog[],
    accountBalances: (balancesRes.data ?? []) as unknown as AccountBalance[],
    partnerPositions: (positionsRes.data ?? []) as unknown as PartnerPosition[],
  }
}

export async function recordBusinessExpense(businessId: string, input: PostBusinessTransactionInput): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('record_business_expense', {
    target_business: businessId,
    target_amount: input.amount,
    target_payment_status: input.paymentStatus ?? 'paid',
    target_paid_by: input.paidBy ?? 'business',
    target_account: input.accountId || null,
    target_partner: input.partnerId || null,
    target_category: input.categoryId || null,
    target_counterparty: input.counterparty?.trim() || null,
    target_note: input.note?.trim() || null,
    target_due_date: input.dueDate || null,
    target_occurred_at: input.occurredAt || new Date().toISOString(),
  })
  if (error) throw error
  return data as string
}

export async function postBusinessTransaction(businessId: string, input: PostBusinessTransactionInput): Promise<string> {
  if (input.kind === 'expense') return recordBusinessExpense(businessId, input)
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

export async function markBusinessExpensePaid(transactionId: string, input: MarkBusinessExpensePaidInput): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.rpc('mark_business_expense_paid', {
    target_transaction: transactionId,
    target_paid_by: input.paidBy,
    target_account: input.accountId || null,
    target_partner: input.partnerId || null,
    target_paid_at: new Date().toISOString(),
  })
  if (error) throw error
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

export async function updateBusinessPartner(partnerId: string, input: BusinessPartnerEditInput) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_partner_full', {
    target_partner: partnerId,
    partner_name: input.name.trim(),
    partner_email: input.email?.trim() || null,
    partner_phone: input.phone?.trim() || null,
    partner_ownership: input.ownership ?? null,
    member_role: input.role,
    member_status: input.status,
  })
  if (error) throw error
}

export async function hardDeleteBusinessPartner(partnerId: string) {
  const client = requireSupabase()
  await removeProofFilesForTransactions(await transactionIdsForPartner(partnerId))
  const { error } = await client.rpc('hard_delete_business_partner', { target_partner: partnerId })
  if (error) throw error
}

export async function addBusinessAccount(businessId: string, input: { name: string; kind: BusinessAccountKind; openingBalance: number }) {
  const client = requireSupabase()
  const { error } = await client.from('business_accounts').insert({
    business_id: businessId, name: input.name.trim(), kind: input.kind, opening_balance: input.openingBalance,
  })
  if (error) throw error
}

export async function updateBusinessAccount(accountId: string, input: { name: string; kind: BusinessAccountKind; openingBalance: number }) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_account_full', {
    target_account: accountId,
    target_name: input.name.trim(),
    target_kind: input.kind,
    target_opening_balance: input.openingBalance,
  })
  if (error) throw error
}

export async function hardDeleteBusinessAccount(accountId: string) {
  const client = requireSupabase()
  await removeProofFilesForTransactions(await transactionIdsForAccount(accountId))
  const { error } = await client.rpc('hard_delete_business_account', { target_account: accountId })
  if (error) throw error
}

export async function addBusinessCategory(businessId: string, input: { name: string; kind: BusinessCategory['kind'] }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('add_business_category', {
    target_business: businessId,
    target_name: input.name.trim(),
    target_kind: input.kind,
  })
  if (error) throw error
  return data as string
}

export async function updateBusinessCategory(categoryId: string, input: { name: string; kind: BusinessCategory['kind'] }) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_category', {
    target_category: categoryId,
    target_name: input.name.trim(),
    target_kind: input.kind,
  })
  if (error) throw error
}

export async function hardDeleteBusinessCategory(categoryId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('hard_delete_business_category', { target_category: categoryId })
  if (error) throw error
}

export async function updateBusinessTransactionFull(transactionId: string, input: BusinessTransactionEditInput) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_transaction_full', {
    target_transaction: transactionId,
    target_kind: input.kind,
    target_amount: input.amount,
    target_account: input.accountId || null,
    target_to_account: input.toAccountId || null,
    target_partner: input.partnerId || null,
    target_category: input.categoryId || null,
    target_counterparty: input.counterparty?.trim() || null,
    target_note: input.note?.trim() || null,
    target_occurred_at: input.occurredAt,
    target_payment_status: input.paymentStatus,
    target_paid_by: input.paidBy,
    target_due_date: input.dueDate || null,
    target_approval_status: input.approvalStatus,
  })
  if (error) throw error
}

export async function hardDeleteBusinessTransaction(transactionId: string) {
  const client = requireSupabase()
  await removeProofFilesForTransactions(await transactionIdsForDelete(transactionId))
  const { error } = await client.rpc('hard_delete_business_transaction', { target_transaction: transactionId })
  if (error) throw error
}

export async function updateBusinessSettings(businessId: string, input: { name: string; approvalMode: ApprovalMode }) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_settings', {
    target_business: businessId,
    target_name: input.name.trim(),
    target_approval_mode: input.approvalMode,
  })
  if (error) throw error
}

export async function hardDeleteBusiness(businessId: string) {
  const client = requireSupabase()
  const { data } = await client.from('business_attachments').select('storage_path').eq('business_id', businessId)
  const paths = (data ?? []).map(row => row.storage_path as string).filter(Boolean)
  if (paths.length) await client.storage.from('business-proofs').remove(paths)
  const { error } = await client.rpc('hard_delete_business', { target_business: businessId })
  if (error) throw error
}

export async function closeBusinessDay(accountId: string, counted: number, note = '') {
  const client = requireSupabase()
  const { data, error } = await client.rpc('close_business_day', { target_account: accountId, target_counted: counted, target_note: note || null })
  if (error) throw error
  return data as string
}

export async function updateBusinessDayClosing(closingId: string, input: BusinessDayClosingEditInput) {
  const client = requireSupabase()
  const { error } = await client.rpc('update_business_day_closing', {
    target_closing: closingId,
    target_account: input.accountId,
    target_close_date: input.closeDate,
    target_expected: input.expectedBalance,
    target_counted: input.countedBalance,
    target_note: input.note?.trim() || null,
  })
  if (error) throw error
}

export async function hardDeleteBusinessDayClosing(closingId: string) {
  const client = requireSupabase()
  const { error } = await client.rpc('hard_delete_business_day_closing', { target_closing: closingId })
  if (error) throw error
}
