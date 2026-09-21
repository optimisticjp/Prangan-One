import { useState } from 'react'
import { Banknote, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessAccount, BusinessAccountKind } from '../../lib/business/types'

export default function BusinessAccounts() {
  const { data, canAdmin, addAccount, editAccount, deleteAccount } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessAccount | null>(null)
  const [deleting, setDeleting] = useState<BusinessAccount | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<BusinessAccountKind>('bank')
  const [opening, setOpening] = useState('0')
  const [saving, setSaving] = useState(false)
  const total = data.accountBalances.reduce((sum, account) => sum + Number(account.balance), 0)

  const openAdd = () => { setEditing(null); setName(''); setKind('bank'); setOpening('0'); setOpen(true) }
  const openEdit = (account: BusinessAccount) => { setEditing(account); setName(account.name); setKind(account.kind); setOpening(String(account.opening_balance)); setOpen(true) }

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addAccount({ name, kind, openingBalance: Number(opening) || 0 })
      toast.success('Account added'); setOpen(false)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add account') } finally { setSaving(false) }
  }

  const edit = async () => {
    if (!editing || !name.trim()) return
    setSaving(true)
    try {
      await editAccount(editing.id, { name, kind, openingBalance: Number(opening) || 0 })
      toast.success('Account updated'); setConfirmEdit(false); setOpen(false); setEditing(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update account') } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteAccount(deleting.id)
      toast.success('Account and related records deleted'); setDeleting(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete account') } finally { setSaving(false) }
  }

  return <div className="space-y-3 min-w-0">
    <div className="flex items-end justify-between gap-2">
      <div className="min-w-0"><div className="text-[10.5px] uppercase tracking-wide text-navy-400 font-semibold">Total funds</div><div className="num text-[24px] font-bold text-navy-900">{businessMoney(total)}</div></div>
      {canAdmin && <button onClick={openAdd} className="h-9 shrink-0 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14} /> Account</button>}
    </div>

    <div className="space-y-2">{data.accountBalances.map(balance => {
      const account = data.accounts.find(item => item.id === balance.account_id)
      if (!account) return null
      return <div key={balance.account_id} className="rounded-2xl border border-cream-200 bg-white px-3 py-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><Banknote size={18} /></div>
          <div className="flex-1 min-w-0"><div className="text-[13px] font-bold text-navy-900 truncate">{balance.name}</div><div className="text-[10.5px] uppercase text-navy-400 font-semibold">{balance.kind}</div></div>
          <div className="num shrink-0 text-[16px] font-bold text-navy-900">{businessMoney(balance.balance)}</div>
        </div>
        {canAdmin && <div className="mt-2.5 grid grid-cols-2 gap-2"><Button variant="soft" className="!min-h-[38px] !text-[12px]" onClick={() => openEdit(account)}><Pencil size={14} /> Edit</Button><Button variant="danger" className="!min-h-[38px] !text-[12px]" onClick={() => setDeleting(account)}><Trash2 size={14} /> Delete</Button></div>}
      </div>
    })}</div>

    <Modal open={open} onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }} title={editing ? 'Edit money account' : 'Add money account'}>
      <Field label="Account name"><Input value={name} onChange={event => setName(event.target.value)} placeholder="HDFC Current / Petty Cash" autoFocus /></Field>
      <Field label="Type"><Select value={kind} onChange={event => setKind(event.target.value as BusinessAccountKind)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="other">Other</option></Select></Field>
      <Field label="Opening balance" hint={editing ? 'Editing this immediately changes the calculated account balance.' : 'Enter the balance when you start tracking this account.'}><Input inputMode="decimal" value={opening} onChange={event => setOpening(event.target.value)} /></Field>
      <Button full loading={saving} disabled={!name.trim()} onClick={editing ? () => setConfirmEdit(true) : add}>{editing ? 'Review edit' : 'Add account'}</Button>
    </Modal>

    <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm account edit" body="This changes the account name, type and opening balance exactly as entered." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={edit} />
    <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete money account" body="This permanently deletes the account and Business transactions/day-closes that depend on it. Type DELETE to continue." busy={saving} onClose={() => setDeleting(null)} onConfirm={remove} />
  </div>
}
