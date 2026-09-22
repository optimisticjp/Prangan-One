export type BusinessRole = 'admin' | 'partner' | 'bookkeeper' | 'viewer' | 'staff'
export type ApprovalMode = 'none' | 'one_partner' | 'all_partners'
export type BusinessAccountKind = 'cash' | 'bank' | 'upi' | 'wallet' | 'other'
export type BusinessTransactionKind =
  | 'income' | 'expense' | 'partner_capital' | 'partner_advance'
  | 'personal_expense' | 'reimbursement' | 'withdrawal' | 'transfer'
  | 'refund' | 'reversal'
export type BusinessApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'
export type BusinessPaymentStatus = 'unpaid' | 'paid'
export type BusinessPaidBy = 'business' | 'partner'
export type BusinessOnboardingStatus = 'pending' | 'approved' | 'rejected'

export interface BusinessMembership {
  membershipId: string
  businessId: string
  businessName: string
  role: BusinessRole
  partnerId: string | null
  staffId?: string | null
}

export interface BusinessMemberSummary {
  id: string
  user_id: string | null
  partner_id: string | null
  email: string
  display_name: string
  role: BusinessRole
  status: string
}

export interface BusinessOnboardingRequest {
  id: string
  businessName: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string | null
  city: string | null
  businessType: string | null
  status: BusinessOnboardingStatus
  decisionNote: string | null
  businessId: string | null
  createdAt: string
  decidedAt: string | null
}

export interface Business {
  id: string
  name: string
  currency: 'INR'
  approval_mode: ApprovalMode
  created_by: string
  created_at: string
  archived_at?: string | null
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
  payment_status: BusinessPaymentStatus
  due_date: string | null
  paid_at: string | null
  occurred_at: string
  created_by: string
  created_at: string
  reversed_transaction_id: string | null
  supersedes_transaction_id: string | null
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

export interface BusinessActivityLog {
  id: string
  business_id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
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
  members: BusinessMemberSummary[]
  accounts: BusinessAccount[]
  categories: BusinessCategory[]
  transactions: BusinessTransaction[]
  approvals: BusinessApproval[]
  attachments: BusinessAttachment[]
  closings: BusinessDayClosing[]
  activity: BusinessActivityLog[]
  accountBalances: AccountBalance[]
  partnerPositions: PartnerPosition[]
  staff: BusinessStaff[]
  tasks: BusinessTask[]
  taskNotes: BusinessTaskNote[]
  notifications: BusinessNotification[]
  staffMoney: BusinessStaffMoney[]
  staffPositions: BusinessStaffPosition[]
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
  paymentStatus?: BusinessPaymentStatus
  paidBy?: BusinessPaidBy
  dueDate?: string | null
}

export interface MarkBusinessExpensePaidInput {
  paidBy: BusinessPaidBy
  accountId?: string | null
  partnerId?: string | null
}


export interface BusinessTransactionEditInput {
  kind: Exclude<BusinessTransactionKind, 'reversal'>
  amount: number
  accountId?: string | null
  toAccountId?: string | null
  partnerId?: string | null
  categoryId?: string | null
  counterparty?: string
  note?: string
  occurredAt: string
  paymentStatus: BusinessPaymentStatus
  paidBy: BusinessPaidBy
  dueDate?: string | null
  approvalStatus: BusinessApprovalStatus
}

export interface BusinessPartnerEditInput {
  name: string
  email?: string
  phone?: string
  ownership?: number | null
  role: BusinessRole
  status: 'active' | 'disabled'
}

export interface BusinessDayClosingEditInput {
  accountId: string
  closeDate: string
  expectedBalance: number
  countedBalance: number
  note?: string
}


export type BusinessTaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type BusinessTaskStatus = 'pending' | 'in_progress' | 'completed'
export type BusinessStaffSalaryPeriod = 'monthly' | 'weekly' | 'daily'
export type BusinessStaffMoneyKind = 'advance' | 'advance_expense' | 'pocket_expense' | 'reimbursement' | 'salary' | 'advance_return'

export interface BusinessStaff {
  id: string
  business_id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  title: string | null
  salary_amount: number
  salary_period: BusinessStaffSalaryPeriod
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface BusinessTask {
  id: string
  business_id: string
  title: string
  description: string | null
  category: string
  priority: BusinessTaskPriority
  status: BusinessTaskStatus
  assignee_partner_id: string | null
  assignee_staff_id: string | null
  due_at: string | null
  status_note: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface BusinessTaskNote {
  id: string
  business_id: string
  task_id: string
  author_user_id: string
  note: string
  status_snapshot: string | null
  created_at: string
}

export interface BusinessNotification {
  id: string
  business_id: string
  task_id: string | null
  sender_user_id: string | null
  target_partner_id: string | null
  target_staff_id: string | null
  kind: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

export interface BusinessStaffMoney {
  id: string
  business_id: string
  staff_id: string
  kind: BusinessStaffMoneyKind
  amount: number
  account_id: string | null
  category_id: string | null
  counterparty: string | null
  note: string | null
  occurred_at: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface BusinessStaffPosition {
  staff_id: string
  name: string
  title: string | null
  salary_amount: number
  salary_period: BusinessStaffSalaryPeriod
  advance_received: number
  advance_spent: number
  advance_returned: number
  advance_balance: number
  pocket_expenses: number
  reimbursements: number
  outstanding_due: number
  salary_paid: number
}
