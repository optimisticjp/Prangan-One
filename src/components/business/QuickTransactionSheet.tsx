import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, HandCoins, Landmark, ReceiptText, Upload, UserRound } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { useToast } from '../Toast'
import { useBusiness } from '../../lib/business/store'
import type { BusinessTransactionKind } from '../../lib/business/types'

const kinds: Array<{ kind: Exclude<BusinessTransactionKind, 'reversal'>; label: string; icon: typeof ReceiptText }> = [
  { kind: 'expense', label: 'Expense', icon: ArrowUpRight },
  { kind: 'income', label: 'Money in', icon: ArrowDownLeft },
  { kind: 'partner_capital', label: 'Partner capital', icon: Landmark },
  { kind: 'personal_expense', label: 'Partner paid', icon: UserRound },
  { kind: 'partner_advance', label: 'Partner advance', icon: HandCoins },
  { kind: 'reimbursement', label: 'Reimburse', icon: ReceiptText },
  { kind: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight },
  { kind: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { kind: 'refund', label: 'Refund', icon: ArrowDownLeft },
]

export function QuickTransactionSheet({ open, initialKind, onClose }: { open: boolean; initialKind: Exclude<BusinessTransactionKind, 'reversal'>; onClose: () => void }) {
  const { data, canWrite, postTransaction } = useBusiness()
  const toast = useToast()
  const [kind, setKind] = useState(initialKind)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setKind(initialKind)
      setAccountId(data.accounts[0]?.id ?? '')
      setToAccountId(data.accounts[1]?.id ?? '')
      setPartnerId(data.partners[0]?.id ?? '')
      setCategoryId('')
    }
  }, [open, initialKind, data.accounts, data.partners])

  const needsAccount = !['personal_expense'].includes(kind)
  const needsPartner = ['partner_capital','partner_advance','personal_expense','reimbursement','withdrawal'].includes(kind)
  const showCategory = ['income','expense','personal_expense','refund'].includes(kind)
  const relevantCategories = useMemo(() => data.categories.filter(c => !showCategory ? false : kind === 'income' || kind === 'refund' ? c.kind !== 'expense' : c.kind !== 'income'), [data.categories, kind, showCategory])
  const valid = canWrite && Number(amount) > 0 && (!needsAccount || !!accountId) && (!needsPartner || !!partnerId) && (kind !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const reset = () => { setAmount(''); setCounterparty(''); setNote(''); setProof(null); setCategoryId('') }
  const submit = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await postTransaction({
        kind, amount: Number(amount), accountId: needsAccount ? accountId : null,
        toAccountId: kind === 'transfer' ? toAccountId : null, partnerId: needsPartner ? partnerId : null,
        categoryId: showCategory ? (categoryId || null) : null, counterparty, note, proof,
      })
      toast.success(kind === 'expense' || kind === 'personal_expense' ? 'Expense recorded' : 'Transaction recorded')
      reset(); onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save transaction')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose() }} title="Add transaction" wide>
      {!canWrite && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-navy-700">Your role is view-only.</div>}
      <div className="grid grid-cols-3 gap-1.5">
        {kinds.map(item => <button key={item.kind} type="button" onClick={() => setKind(item.kind)}
          className={`min-h-[48px] rounded-xl border px-1.5 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${kind === item.kind ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-600 border-cream-300'}`}>
          <item.icon size={16} /><span className="leading-tight text-center">{item.label}</span>
        </button>)}
      </div>

      <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹ 0" aria-label="Amount" /></Field>

      {needsAccount && <Field label={kind === 'transfer' ? 'From account' : kind === 'income' || kind === 'refund' || kind === 'partner_capital' || kind === 'partner_advance' ? 'Money goes to' : 'Paid from'}>
        <Select value={accountId} onChange={e => setAccountId(e.target.value)}>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
      </Field>}
      {kind === 'transfer' && <Field label="To account"><Select value={toAccountId} onChange={e => setToAccountId(e.target.value)}>{data.accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>}
      {needsPartner && <Field label="Partner"><Select value={partnerId} onChange={e => setPartnerId(e.target.value)}>{data.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
      {showCategory && <Field label="Category"><Select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">No category</option>{relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
      {!['transfer','partner_capital','partner_advance','reimbursement','withdrawal'].includes(kind) && <Field label="Paid to / received from"><Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Optional name" /></Field>}
      <Field label="Note"><Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional details" className="min-h-[70px]" /></Field>
      {['expense','personal_expense','refund'].includes(kind) && <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-cream-300 bg-white px-3 min-h-[44px] cursor-pointer text-[12.5px] font-semibold text-navy-600">
        <Upload size={15} /> <span className="truncate">{proof ? proof.name : 'Attach receipt / UPI screenshot (optional)'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={e => setProof(e.target.files?.[0] ?? null)} />
      </label>}
      <Button full loading={saving} disabled={!valid} onClick={submit}>Save transaction</Button>
    </Modal>
  )
}
