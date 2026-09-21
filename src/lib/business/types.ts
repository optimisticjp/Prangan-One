export type BusinessRole = 'admin' | 'partner' | 'bookkeeper' | 'viewer'
export type ApprovalMode = 'none' | 'one_partner' | 'all_partners'
export type BusinessAccountKind = 'cash' | 'bank' | 'upi' | 'wallet' | 'other'
export type BusinessTransactionKind =
  | 'income' | 'expense' | 'partner_capital' | 'partner_advance'
  | 'personal_expense' | 'reimbursement' | 'withdrawal' | 'transfer'
  | 'refund' | 'reversal'
export type BusinessApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'

export interface BusinessMembership {
  membershipId: string
  businessId: string
  businessName: string
  role: BusinessRole
  partnerId: string | null
}

export interface Business {
  id: string
  name: string
  currency: 'INR'
  approval_mode: ApprovalMode
  created_by: string
  created_at: string
}

export interface BusinessPartner {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  ownership_percent: number | null
  active: boolean
  created_at: string
}

export interface BusinessAccount {
  id: string
  business_id: string
  name: string
  kind: BusinessAccountKind
  opening_balance: number
  active: boolean
  created_at: string
}

export interface BusinessCategory {
  id: string
  business_id: string
  name: string
  kind: 'income' | 'expense' | 'both'
  active: boolean
}

export interface BusinessTransaction {
  id: string
  business_id: string
  kind: BusinessTransactionKind
  amount: number
  account_id: string | null
  to_account_id: string | null
  partner_id: string | null
  category_id: string | null
  counterparty: string | null
  note: string | null
  approval_status: BusinessApprovalStatus
  occurred_at: string
  created_by: string
  created_at: string
  reversed_transaction_id: string | null
  reversed_at: string | null
  reversed_by: string | null
}

export interface BusinessApproval {
  id: string
  business_id: string
  transaction_id: string
  approver_user_id: string
  decision: 'approved' | 'rejected'
  note: string | null
  decided_at: string
}

export interface BusinessAttachment {
  id: string
  business_id: string
  transaction_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  uploaded_by: string
  created_at: string
}

export interface BusinessDayClosing {
  id: string
  business_id: string
  account_id: string
  close_date: string
  expected_balance: number
  counted_balance: number
  difference: number
  note: string | null
  closed_by: string
  closed_at: string
}

export interface AccountBalance {
  account_id: string
  name: string
  kind: BusinessAccountKind
  balance: number
}

export interface PartnerPosition {
  partner_id: string
  name: string
  capital: number
  advances: number
  personal_expenses: number
  reimbursements: number
  outstanding_due: number
  withdrawals: number
}

export interface BusinessSnapshot {
  business: Business | null
  partners: BusinessPartner[]
  accounts: BusinessAccount[]
  categories: BusinessCategory[]
  transactions: BusinessTransaction[]
  approvals: BusinessApproval[]
  attachments: BusinessAttachment[]
  closings: BusinessDayClosing[]
  accountBalances: AccountBalance[]
  partnerPositions: PartnerPosition[]
}

export interface PostBusinessTransactionInput {
  kind: Exclude<BusinessTransactionKind, 'reversal'>
  amount: number
  accountId?: string | null
  toAccountId?: string | null
  partnerId?: string | null
  categoryId?: string | null
  counterparty?: string
  note?: string
  occurredAt?: string
  proof?: File | null
}
