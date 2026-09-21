import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, HandCoins, Landmark, ReceiptText, Upload, WalletCards } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import { useToast } from '../Toast'
import { useBusiness } from '../../lib/business/store'
import { businessTransactionHelp } from '../../lib/business/finance'
import type { BusinessPaidBy, BusinessPaymentStatus, BusinessTransactionKind } from '../../lib/business/types'

type ComposerKind = Exclude<BusinessTransactionKind, 'reversal' | 'personal_expense'>

const kinds: Array<{ kind: ComposerKind; label: string; icon: typeof ReceiptText }> = [
  { kind: 'expense', label: 'Expense', icon: ArrowUpRight },
  { kind: 'income', label: 'Money in', icon: ArrowDownLeft },
  { kind: 'partner_capital', label: 'Partner capital', icon: Landmark },
  { kind: 'partner_advance', label: 'Partner advance', icon: HandCoins },
  { kind: 'reimbursement', label: 'Reimburse partner', icon: ReceiptText },
  { kind: 'withdrawal', label: 'Partner withdrawal', icon: ArrowUpRight },
  { kind: 'transfer', label: 'Account transfer', icon: ArrowRightLeft },
  { kind: 'refund', label: 'Refund received', icon: WalletCards },
]

export function QuickTransactionSheet({ open, initialKind, onClose }: { open: boolean; initialKind: ComposerKind; onClose: () => void }) {
  const { data, canWrite, postTransaction } = useBusiness()
  const toast = useToast()
  const [kind, setKind] = useState<ComposerKind>(initialKind)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<BusinessPaymentStatus>('paid')
  const [paidBy, setPaidBy] = useState<BusinessPaidBy>('business')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setKind(initialKind)
      setAccountId(data.accounts[0]?.id ?? '')
      setToAccountId(data.accounts[1]?.id ?? '')
      setPartnerId(data.partners[0]?.id ?? '')
      setCategoryId('')
      setPaymentStatus('paid')
      setPaidBy('business')
      setDueDate('')
    }
  }, [open, initialKind, data.accounts, data.partners])

  const isExpense = kind === 'expense'
  const needsAccount = isExpense
    ? paymentStatus === 'paid' && paidBy === 'business'
    : true
  const needsPartner = isExpense
    ? paymentStatus === 'paid' && paidBy === 'partner'
    : ['partner_capital','partner_advance','reimbursement','withdrawal'].includes(kind)
  const showCategory = ['income','expense','refund'].includes(kind)
  const relevantCategories = useMemo(
    () => data.categories.filter(c => !showCategory ? false : kind === 'income' || kind === 'refund' ? c.kind !== 'expense' : c.kind !== 'income'),
    [data.categories, kind, showCategory],
  )

  const valid = canWrite
    && Number(amount) > 0
    && (!needsAccount || !!accountId)
    && (!needsPartner || !!partnerId)
    && (kind !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const reset = () => {
    setAmount('')
    setCounterparty('')
    setNote('')
    setProof(null)
    setCategoryId('')
    setPaymentStatus('paid')
    setPaidBy('business')
    setDueDate('')
  }

  const submit = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await postTransaction({
        kind,
        amount: Number(amount),
        accountId: needsAccount ? accountId : null,
        toAccountId: kind === 'transfer' ? toAccountId : null,
        partnerId: needsPartner ? partnerId : null,
        categoryId: showCategory ? (categoryId || null) : null,
        counterparty,
        note,
        proof,
        paymentStatus: isExpense ? paymentStatus : undefined,
        paidBy: isExpense && paymentStatus === 'paid' ? paidBy : undefined,
        dueDate: isExpense && paymentStatus === 'unpaid' ? (dueDate || null) : null,
      })
      toast.success(isExpense && paymentStatus === 'unpaid' ? 'Unpaid expense recorded' : 'Transaction recorded')
      reset()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save transaction')
    } finally {
      setSaving(false)
    }
  }

  const helper = businessTransactionHelp[kind]

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose() }} title="Add transaction" wide>
      {!canWrite && <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-navy-700">Your role is view-only.</div>}

      <div className="grid grid-cols-2 gap-1.5">
        {kinds.map(item => {
          const meta = businessTransactionHelp[item.kind]
          const active = kind === item.kind
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => setKind(item.kind)}
              className={'min-h-[60px] rounded-xl border px-2.5 py-2 text-left flex items-center gap-2 ' + (active ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-700 border-cream-300')}
            >
              <item.icon size={17} className="shrink-0" />
              <span className="min-w-0">
                <span className={'block text-[9px] font-bold tracking-wide ' + (active ? 'text-saffron-300' : 'text-saffron-700')}>{meta.tag}</span>
                <span className="block text-[11.5px] font-semibold leading-tight">{item.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5">
        <div className="text-[9.5px] font-bold tracking-wide text-saffron-700">{helper.tag}</div>
        <div className="text-[12px] text-navy-600 mt-0.5">{helper.help}</div>
      </div>

      <Field label="Amount">
        <Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹ 0" aria-label="Amount" />
      </Field>

      {isExpense && (
        <>
          <Field label="Payment status" hint="Payment and approval are separate. An unpaid expense does not change Cash, Bank or partner balances.">
            <div className="grid grid-cols-2 gap-2">
              <Choice active={paymentStatus === 'unpaid'} title="UNPAID" text="Pay later" onClick={() => setPaymentStatus('unpaid')} />
              <Choice active={paymentStatus === 'paid'} title="PAID" text="Already paid" onClick={() => setPaymentStatus('paid')} />
            </div>
          </Field>

          {paymentStatus === 'paid' ? (
            <Field label="Paid by">
              <div className="grid grid-cols-2 gap-2">
                <Choice active={paidBy === 'business'} title="BUSINESS FUNDS" text="Cash / Bank" onClick={() => setPaidBy('business')} />
                <Choice active={paidBy === 'partner'} title="PARTNER" text="Business owes them" onClick={() => setPaidBy('partner')} />
              </div>
            </Field>
          ) : (
            <Field label="Due date" hint="Optional. Useful for bills that will be paid later.">
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </Field>
          )}
        </>
      )}

      {needsAccount && (
        <Field label={kind === 'transfer' ? 'From account' : kind === 'income' || kind === 'refund' || kind === 'partner_capital' || kind === 'partner_advance' ? 'Money goes to' : 'Paid from'}>
          <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      )}

      {kind === 'transfer' && (
        <Field label="To account">
          <Select value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            {data.accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      )}

      {needsPartner && (
        <Field label={isExpense ? 'Partner who paid' : 'Partner'}>
          <Select value={partnerId} onChange={e => setPartnerId(e.target.value)}>
            {data.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      )}

      {showCategory && (
        <Field label="Category">
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {relevantCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}

      {!['transfer','partner_capital','partner_advance','reimbursement','withdrawal'].includes(kind) && (
        <Field label={isExpense ? 'Vendor / paid to' : 'Paid to / received from'}>
          <Input value={counterparty} onChange={e => setCounterparty(e.target.value)} placeholder="Optional name" />
        </Field>
      )}

      <Field label="Note">
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional details" className="min-h-[70px]" />
      </Field>

      {['expense','refund'].includes(kind) && (
        <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-cream-300 bg-white px-3 min-h-[44px] cursor-pointer text-[12.5px] font-semibold text-navy-600">
          <Upload size={15} />
          <span className="truncate">{proof ? proof.name : 'Attach receipt / proof (optional)'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={e => setProof(e.target.files?.[0] ?? null)} />
        </label>
      )}

      <Button full loading={saving} disabled={!valid} onClick={submit}>
        {isExpense ? paymentStatus === 'unpaid' ? 'Save unpaid expense' : 'Record paid expense' : 'Save transaction'}
      </Button>
    </Modal>
  )
}

function Choice({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={'min-h-[50px] rounded-xl border px-2.5 py-2 text-left ' + (active ? 'border-navy-800 bg-navy-50' : 'border-cream-300 bg-white')}>
      <span className="block text-[10px] font-bold text-navy-800">{title}</span>
      <span className="block text-[10.5px] text-navy-400 mt-0.5">{text}</span>
    </button>
  )
}
