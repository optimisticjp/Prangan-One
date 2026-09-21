import { useMemo, useState } from 'react'
import { Download, ExternalLink, Paperclip, Pencil, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { getBusinessProofUrl } from '../../lib/business/data'
import { businessMoney, businessTransactionLabels, expensePaidByLabel, transactionCashDirection } from '../../lib/business/finance'
import { exportCsv } from '../../lib/csv'
import type { SerializableTransactionInput } from '../../lib/business/preferences'
import type {
  BusinessApprovalStatus, BusinessPaidBy, BusinessPaymentStatus,
  BusinessTransaction, BusinessTransactionKind,
} from '../../lib/business/types'
import type { BusinessOutletContext } from '../../components/business/BusinessLayout'

const filters = ['all', 'income', 'expense', 'unpaid', 'partner', 'approval'] as const
const editableKinds: Array<Exclude<BusinessTransactionKind, 'reversal'>> = [
  'income', 'expense', 'partner_capital', 'partner_advance', 'personal_expense',
  'reimbursement', 'withdrawal', 'transfer', 'refund',
]

const toLocalInput = (iso: string) => {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function BusinessLedger() {
  const { data, canWrite, deleteTransaction, editTransaction, attachProof } = useBusiness()
  const { openTransaction } = useOutletContext<BusinessOutletContext>()
  const toast = useToast()
  const [filter, setFilter] = useState<typeof filters[number]>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BusinessTransaction | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editKind, setEditKind] = useState<Exclude<BusinessTransactionKind, 'reversal'>>('expense')
  const [editAmount, setEditAmount] = useState('')
  const [editAccountId, setEditAccountId] = useState('')
  const [editToAccountId, setEditToAccountId] = useState('')
  const [editPartnerId, setEditPartnerId] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editCounterparty, setEditCounterparty] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editOccurredAt, setEditOccurredAt] = useState('')
  const [editPaymentStatus, setEditPaymentStatus] = useState<BusinessPaymentStatus>('paid')
  const [editPaidBy, setEditPaidBy] = useState<BusinessPaidBy>('business')
  const [editDueDate, setEditDueDate] = useState('')
  const [editApprovalStatus, setEditApprovalStatus] = useState<BusinessApprovalStatus>('not_required')
  const [saving, setSaving] = useState(false)
  const [proofUploading, setProofUploading] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.transactions.filter(tx => {
      if (filter === 'income' && !['income', 'refund'].includes(tx.kind)) return false
      if (filter === 'expense' && !['expense', 'personal_expense', 'reimbursement'].includes(tx.kind)) return false
      if (filter === 'unpaid' && !(tx.kind === 'expense' && tx.payment_status === 'unpaid')) return false
      if (filter === 'partner' && !['partner_capital', 'partner_advance', 'personal_expense', 'reimbursement', 'withdrawal'].includes(tx.kind) && !(tx.kind === 'expense' && !!tx.partner_id)) return false
      if (filter === 'approval' && tx.approval_status !== 'pending') return false
      if (!q) return true

      const partner = data.partners.find(p => p.id === tx.partner_id)?.name ?? ''
      const category = data.categories.find(c => c.id === tx.category_id)?.name ?? ''
      const payer = expensePaidByLabel(tx, data.accounts, data.partners) ?? ''
      return [tx.amount, tx.counterparty, tx.note, partner, category, payer, tx.payment_status, tx.approval_status, businessTransactionLabels[tx.kind]]
        .some(value => String(value ?? '').toLowerCase().includes(q))
    })
  }, [data.transactions, data.partners, data.categories, data.accounts, filter, query])

  const download = () => exportCsv(
    'business-ledger.csv',
    ['Date', 'Type', 'Amount', 'Payment', 'Paid by', 'From account', 'To account', 'Partner', 'Category', 'Approval', 'Party', 'Note'],
    list.map(tx => [
      new Date(tx.occurred_at).toLocaleString('en-IN'),
      businessTransactionLabels[tx.kind],
      Number(tx.amount),
      tx.kind === 'expense' ? tx.payment_status : '',
      tx.kind === 'expense' ? expensePaidByLabel(tx, data.accounts, data.partners) ?? '' : '',
      data.accounts.find(a => a.id === tx.account_id)?.name,
      data.accounts.find(a => a.id === tx.to_account_id)?.name,
      data.partners.find(p => p.id === tx.partner_id)?.name,
      data.categories.find(c => c.id === tx.category_id)?.name,
      tx.approval_status,
      tx.counterparty ?? '',
      tx.note ?? '',
    ]),
  )

  const openEdit = () => {
    if (!selected || selected.kind === 'reversal') return
    setEditKind(selected.kind)
    setEditAmount(String(selected.amount))
    setEditAccountId(selected.account_id ?? '')
    setEditToAccountId(selected.to_account_id ?? '')
    setEditPartnerId(selected.partner_id ?? '')
    setEditCategoryId(selected.category_id ?? '')
    setEditCounterparty(selected.counterparty ?? '')
    setEditNote(selected.note ?? '')
    setEditOccurredAt(toLocalInput(selected.occurred_at))
    setEditPaymentStatus(selected.payment_status)
    setEditPaidBy(selected.kind === 'expense' && selected.payment_status === 'paid' && selected.partner_id ? 'partner' : 'business')
    setEditDueDate(selected.due_date ?? '')
    setEditApprovalStatus(selected.approval_status)
    setEditOpen(true)
  }

  const showAccount = ['income', 'partner_capital', 'partner_advance', 'reimbursement', 'withdrawal', 'refund', 'transfer'].includes(editKind)
    || (editKind === 'expense' && editPaymentStatus === 'paid' && editPaidBy === 'business')
  const showPartner = ['partner_capital', 'partner_advance', 'personal_expense', 'reimbursement', 'withdrawal'].includes(editKind)
    || (editKind === 'expense' && editPaymentStatus === 'paid' && editPaidBy === 'partner')

  const categoriesForEdit = data.categories.filter(category => {
    if (['income', 'refund'].includes(editKind)) return category.kind !== 'expense'
    if (['expense', 'personal_expense'].includes(editKind)) return category.kind !== 'income'
    return true
  })

  const saveEdit = async () => {
    if (!selected || selected.kind === 'reversal' || Number(editAmount) <= 0 || !editOccurredAt) return
    setSaving(true)
    try {
      if (showAccount && !editAccountId) throw new Error('Choose an account.')
      if (editKind === 'transfer' && (!editToAccountId || editToAccountId === editAccountId)) throw new Error('Choose a different destination account.')
      if (showPartner && !editPartnerId) throw new Error('Choose a partner.')

      await editTransaction(selected.id, {
        kind: editKind,
        amount: Number(editAmount),
        accountId: showAccount ? editAccountId : null,
        toAccountId: editKind === 'transfer' ? editToAccountId : null,
        partnerId: showPartner ? editPartnerId : null,
        categoryId: editCategoryId || null,
        counterparty: editCounterparty,
        note: editNote,
        occurredAt: new Date(editOccurredAt).toISOString(),
        paymentStatus: editKind === 'expense' ? editPaymentStatus : 'paid',
        paidBy: editKind === 'expense' ? editPaidBy : 'business',
        dueDate: editKind === 'expense' && editPaymentStatus === 'unpaid' ? (editDueDate || null) : null,
        approvalStatus: editApprovalStatus,
      })
      toast.success('Transaction updated')
      setConfirmEdit(false)
      setEditOpen(false)
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not edit transaction')
    } finally {
      setSaving(false)
    }
  }

  const removeTransaction = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await deleteTransaction(selected.id)
      toast.success('Transaction permanently deleted')
      setConfirmDelete(false)
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete transaction')
    } finally {
      setSaving(false)
    }
  }

  const repeatSelected = () => {
    if (!selected || selected.kind === 'reversal') return
    const preset = transactionPreset(selected)
    setSelected(null)
    openTransaction(preset.kind as Exclude<BusinessTransaction['kind'], 'reversal' | 'personal_expense'>, preset)
  }

  const viewProof = async () => {
    if (!selected) return
    const attachment = data.attachments.find(a => a.transaction_id === selected.id)
    if (!attachment) return
    const url = await getBusinessProofUrl(attachment.storage_path)
    if (!url) {
      toast.error('Could not open this proof.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const addProof = async (file: File | null) => {
    if (!file || !selected) return
    setProofUploading(true)
    try {
      await attachProof(selected.id, file)
      toast.success('Proof attached')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not attach proof')
    } finally {
      setProofUploading(false)
    }
  }

  return (
    <div className="space-y-2.5 min-w-0">
      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] text-navy-600">
        Tap any transaction to view it. <strong>Edit</strong> can change all Business fields. <strong>Delete</strong> permanently removes it.
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search amount, partner, note…" className="!min-h-[40px] !text-[13px] !pl-9" />
        </div>
        <button onClick={download} aria-label="Export ledger CSV" className="h-10 w-10 shrink-0 rounded-xl border border-cream-300 bg-white flex items-center justify-center text-navy-600"><Download size={16} /></button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 max-w-full">
        {filters.map(item => (
          <button key={item} onClick={() => setFilter(item)} className={'shrink-0 rounded-full border px-3 min-h-[34px] text-[11px] font-semibold capitalize ' + (filter === item ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-cream-300 text-navy-500')}>{item}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden min-w-0">
        {list.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-navy-400">No matching transactions.</div>
        ) : list.map(tx => {
          const direction = transactionCashDirection(tx)
          const partner = data.partners.find(p => p.id === tx.partner_id)?.name
          const proof = data.attachments.some(a => a.transaction_id === tx.id)
          const payer = expensePaidByLabel(tx, data.accounts, data.partners)
          return (
            <button key={tx.id} onClick={() => setSelected(tx)} className="w-full min-w-0 min-h-[58px] flex items-center gap-2 px-3 py-2 border-b border-cream-100 last:border-0 text-left active:bg-cream-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[12.5px] font-semibold text-navy-800 truncate">{businessTransactionLabels[tx.kind]}</span>
                  {proof && <Paperclip size={11} className="text-navy-300 shrink-0" />}
                  {tx.kind === 'expense' && <Badge tone={tx.payment_status === 'paid' ? 'green' : 'amber'}>{tx.payment_status === 'paid' ? 'PAID' : 'UNPAID'}</Badge>}
                  {tx.approval_status === 'pending' && <Badge tone="amber">APPROVAL</Badge>}
                  {tx.approval_status === 'rejected' && <Badge tone="red">REJECTED</Badge>}
                </div>
                <div className="text-[10.5px] text-navy-400 truncate">
                  {tx.kind === 'expense' ? payer : partner || tx.counterparty || data.accounts.find(a => a.id === tx.account_id)?.name || 'Business'} · {new Date(tx.occurred_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </div>
              </div>
              <div className={'num shrink-0 text-[13px] font-bold whitespace-nowrap ' + (direction === 'in' ? 'text-paid' : direction === 'out' ? 'text-over' : 'text-navy-700')}>
                {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}{businessMoney(tx.amount)}
              </div>
            </button>
          )
        })}
      </div>

      <Button full variant="soft" onClick={() => openTransaction('expense')}>Add transaction</Button>

      <Modal open={!!selected} onClose={() => { if (!saving && !proofUploading) setSelected(null) }} title="Transaction details">
        {selected && (
          <>
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0"><div className="font-bold text-navy-900 truncate">{businessTransactionLabels[selected.kind]}</div><div className="text-[12px] text-navy-400">{new Date(selected.occurred_at).toLocaleString('en-IN')}</div></div>
              <div className="num shrink-0 text-[20px] font-bold">{businessMoney(selected.amount)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Info label="Payment" value={selected.kind === 'expense' ? selected.payment_status : 'Paid'} />
              <Info label="Approval" value={selected.approval_status.replace('_', ' ')} />
              <Info label="From account" value={data.accounts.find(a => a.id === selected.account_id)?.name || '—'} />
              <Info label="To account" value={data.accounts.find(a => a.id === selected.to_account_id)?.name || '—'} />
              <Info label="Partner" value={data.partners.find(p => p.id === selected.partner_id)?.name || '—'} />
              <Info label="Category" value={data.categories.find(c => c.id === selected.category_id)?.name || '—'} />
            </div>

            {(selected.counterparty || selected.note) && <div className="rounded-xl bg-cream-100 px-3 py-2 text-[12.5px] text-navy-600 break-words">{selected.counterparty && <div className="font-semibold">{selected.counterparty}</div>}{selected.note && <div>{selected.note}</div>}</div>}

            {data.attachments.some(a => a.transaction_id === selected.id) ? (
              <Button full variant="soft" onClick={() => void viewProof()}><ExternalLink size={14} /> View proof</Button>
            ) : canWrite && ['expense', 'refund'].includes(selected.kind) ? (
              <label className="min-h-[42px] rounded-xl border border-dashed border-saffron-300 bg-saffron-50 px-3 flex items-center justify-center gap-2 cursor-pointer text-[11.5px] font-bold text-saffron-800">
                <Upload size={14} /> {proofUploading ? 'Uploading…' : 'Add proof'}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="sr-only" disabled={proofUploading} onChange={e => void addProof(e.target.files?.[0] ?? null)} />
              </label>
            ) : null}

            {selected.kind !== 'reversal' && <Button full variant="soft" onClick={repeatSelected}><RefreshCw size={14} /> Repeat this transaction</Button>}
            {canWrite && selected.kind !== 'reversal' && <div className="grid grid-cols-2 gap-2"><Button variant="soft" onClick={openEdit}><Pencil size={14} /> Edit</Button><Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</Button></div>}
          </>
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => { if (!saving) setEditOpen(false) }} title="Edit all transaction fields" wide>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type"><Select value={editKind} onChange={e => setEditKind(e.target.value as Exclude<BusinessTransactionKind, 'reversal'>)}>{editableKinds.map(kind => <option key={kind} value={kind}>{businessTransactionLabels[kind]}</option>)}</Select></Field>
          <Field label="Amount"><Input inputMode="decimal" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></Field>
        </div>
        <Field label="Date & time"><Input type="datetime-local" value={editOccurredAt} onChange={e => setEditOccurredAt(e.target.value)} /></Field>

        {editKind === 'expense' && <div className="grid grid-cols-2 gap-2">
          <Field label="Payment status"><Select value={editPaymentStatus} onChange={e => setEditPaymentStatus(e.target.value as BusinessPaymentStatus)}><option value="paid">Paid</option><option value="unpaid">Unpaid</option></Select></Field>
          {editPaymentStatus === 'paid' && <Field label="Paid by"><Select value={editPaidBy} onChange={e => setEditPaidBy(e.target.value as BusinessPaidBy)}><option value="business">Business funds</option><option value="partner">Partner personally</option></Select></Field>}
        </div>}

        {showAccount && <Field label={editKind === 'transfer' ? 'From account' : 'Account'}><Select value={editAccountId} onChange={e => setEditAccountId(e.target.value)}><option value="">Choose account</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>}
        {editKind === 'transfer' && <Field label="To account"><Select value={editToAccountId} onChange={e => setEditToAccountId(e.target.value)}><option value="">Choose account</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>}
        {showPartner && <Field label="Partner"><Select value={editPartnerId} onChange={e => setEditPartnerId(e.target.value)}><option value="">Choose partner</option>{data.partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</Select></Field>}
        <Field label="Category"><Select value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)}><option value="">No category</option>{categoriesForEdit.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
        <Field label="Approval status"><Select value={editApprovalStatus} onChange={e => setEditApprovalStatus(e.target.value as BusinessApprovalStatus)}><option value="not_required">Not required</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select></Field>
        {editKind === 'expense' && editPaymentStatus === 'unpaid' && <Field label="Due date"><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} /></Field>}
        <Field label="Vendor / counterparty"><Input value={editCounterparty} onChange={e => setEditCounterparty(e.target.value)} /></Field>
        <Field label="Note"><Textarea value={editNote} onChange={e => setEditNote(e.target.value)} /></Field>
        <Button full disabled={Number(editAmount) <= 0 || !editOccurredAt} onClick={() => setConfirmEdit(true)}>Review edit</Button>
      </Modal>

      <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm transaction edit" body="This directly updates the transaction and recalculates Business balances from the values you entered." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={saveEdit} />
      <TypedConfirmModal open={confirmDelete} mode="DELETE" title="Delete transaction permanently" body="This permanently deletes this transaction, its balance entries, approvals and proof record. Type DELETE to continue." busy={saving} onClose={() => setConfirmDelete(false)} onConfirm={removeTransaction} />
    </div>
  )
}

function transactionPreset(tx: BusinessTransaction): SerializableTransactionInput {
  if (tx.kind === 'personal_expense') {
    return { kind: 'expense', amount: Number(tx.amount), partnerId: tx.partner_id, categoryId: tx.category_id, counterparty: tx.counterparty ?? '', note: tx.note ?? '', paymentStatus: 'paid', paidBy: 'partner' }
  }
  return {
    kind: tx.kind as SerializableTransactionInput['kind'],
    amount: Number(tx.amount),
    accountId: tx.account_id,
    toAccountId: tx.to_account_id,
    partnerId: tx.partner_id,
    categoryId: tx.category_id,
    counterparty: tx.counterparty ?? '',
    note: tx.note ?? '',
    paymentStatus: tx.kind === 'expense' ? tx.payment_status : undefined,
    paidBy: tx.kind === 'expense' && tx.payment_status === 'paid' ? (tx.partner_id ? 'partner' : 'business') : undefined,
    dueDate: tx.due_date,
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-cream-200 bg-white px-3 py-2 min-w-0"><div className="text-[10px] text-navy-400">{label}</div><div className="font-semibold text-navy-700 truncate">{value}</div></div>
}
