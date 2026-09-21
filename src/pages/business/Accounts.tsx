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
  const total = data.accountBalances.reduce((sum, a) => sum + Number(a.balance), 0)

  const openAdd = () => {
    setEditing(null)
    setName('')
    setKind('bank')
    setOpening('0')
    setOpen(true)
  }

  const openEdit = (account: BusinessAccount) => {
    setEditing(account)
    setName(account.name)
    setKind(account.kind)
    setOpening(String(account.opening_balance))
    setOpen(true)
  }

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addAccount({ name, kind, openingBalance: Number(opening) || 0 })
      toast.success('Account added')
      setOpen(false)
      setName('')
      setOpening('0')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add account')
    } finally {
      setSaving(false)
    }
  }

  const edit = async () => {
    if (!editing || !name.trim()) return
    setSaving(true)
    try {
      await editAccount(editing.id, { name, kind })
      toast.success('Account updated')
      setConfirmEdit(false)
      setOpen(false)
      setEditing(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not update account'
      toast.error(msg === 'account_kind_locked_after_use' ? 'Account type cannot change after the account has financial history. You can still rename it.' : msg)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteAccount(deleting.id)
      toast.success('Account deleted from active use')
      setDeleting(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not delete account'
      toast.error(msg === 'account_balance_must_be_zero' ? 'Move or settle the account balance to ₹0 before deleting it.' : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-navy-400 font-semibold">Total funds</div>
          <div className="num text-[24px] font-bold text-navy-900">{businessMoney(total)}</div>
        </div>
        {canAdmin && (
          <button onClick={openAdd} className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1">
            <Plus size={14} /> Account
          </button>
        )}
      </div>

      <div className="space-y-2">
        {data.accountBalances.map(balance => {
          const account = data.accounts.find(a => a.id === balance.account_id)
          if (!account) return null
          return (
            <div key={balance.account_id} className="rounded-2xl border border-cream-200 bg-white px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-navy-900 truncate">{balance.name}</div>
                  <div className="text-[10.5px] uppercase text-navy-400 font-semibold">{balance.kind}</div>
                </div>
                <div className="num text-[16px] font-bold text-navy-900">{businessMoney(balance.balance)}</div>
              </div>

              {canAdmin && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button variant="soft" className="!min-h-[38px] !text-[12px]" onClick={() => openEdit(account)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="danger" className="!min-h-[38px] !text-[12px]" onClick={() => setDeleting(account)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={open}
        onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }}
        title={editing ? 'Edit money account' : 'Add money account'}
      >
        <Field label="Account name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="HDFC Current / Petty Cash" autoFocus />
        </Field>
        <Field label="Type" hint={editing ? 'Once an account has financial history, its type is locked.' : undefined}>
          <Select value={kind} onChange={e => setKind(e.target.value as BusinessAccountKind)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="upi">UPI</option>
            <option value="wallet">Wallet</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        {!editing && (
          <Field label="Opening balance" hint="Use the real balance when you start tracking this account.">
            <Input inputMode="decimal" value={opening} onChange={e => setOpening(e.target.value)} />
          </Field>
        )}
        {editing && (
          <div className="rounded-xl border border-cream-200 bg-cream-100 px-3 py-2 text-[11.5px] text-navy-500">
            Opening balance is locked after account creation so historical balances stay trustworthy.
          </div>
        )}
        <Button
          full
          loading={saving}
          disabled={!name.trim()}
          onClick={editing ? () => setConfirmEdit(true) : add}
        >
          {editing ? 'Review edit' : 'Add account'}
        </Button>
      </Modal>

      <TypedConfirmModal
        open={confirmEdit}
        mode="EDIT"
        title="Confirm account edit"
        body="This updates the account name/type. Opening balance and posted money history will not be rewritten."
        busy={saving}
        onClose={() => setConfirmEdit(false)}
        onConfirm={edit}
      />

      <TypedConfirmModal
        open={!!deleting}
        mode="DELETE"
        title="Delete money account"
        body="The account will be removed from active use but kept in historical records. Its current balance must be exactly ₹0."
        busy={saving}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
