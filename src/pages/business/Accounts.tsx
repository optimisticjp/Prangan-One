import { useState } from 'react'
import { Banknote, HandCoins, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'
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
  const [custodianPartnerId, setCustodianPartnerId] = useState('')
  const [saving, setSaving] = useState(false)

  const accountMoney = data.accountBalances.reduce((sum, account) => sum + Number(account.balance), 0)
  const staffHeld = data.staffPositions.reduce((sum, staff) => sum + Number(staff.advance_balance), 0)
  const total = accountMoney + staffHeld
  const activePartners = data.partners.filter(partner => partner.active)

  const openAdd = () => {
    setEditing(null)
    setName('')
    setKind('bank')
    setOpening('0')
    setCustodianPartnerId('')
    setOpen(true)
  }

  const openEdit = (account: BusinessAccount) => {
    setEditing(account)
    setName(account.name)
    setKind(account.kind)
    setOpening(String(account.opening_balance))
    setCustodianPartnerId(account.custodian_partner_id ?? '')
    setOpen(true)
  }

  const payload = () => ({
    name,
    kind,
    openingBalance: Number(opening) || 0,
    custodianPartnerId: custodianPartnerId || null,
  })

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addAccount(payload())
      toast.success('Money location added')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add money location')
    } finally {
      setSaving(false)
    }
  }

  const edit = async () => {
    if (!editing || !name.trim()) return
    setSaving(true)
    try {
      await editAccount(editing.id, payload())
      toast.success('Money location updated')
      setConfirmEdit(false)
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update money location')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteAccount(deleting.id)
      toast.success('Money location and related records deleted')
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete money location')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 min-w-0">
      <section className="rounded-2xl bg-navy-900 text-cream-50 p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-cream-100/55 font-bold">All business money</div>
            <div className="num text-[25px] font-bold leading-tight">{businessMoney(total)}</div>
          </div>
          {canAdmin && (
            <button onClick={openAdd} className="min-h-[38px] shrink-0 px-3 rounded-xl bg-saffron-500 text-navy-950 text-[11.5px] font-bold flex items-center gap-1">
              <Plus size={14} /> Location
            </button>
          )}
        </div>
        {staffHeld > 0 && <div className="mt-2 text-[10.5px] text-cream-100/70">Includes {businessMoney(staffHeld)} currently held by staff.</div>}
      </section>

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] text-navy-600">
        A money location tells Prangan <strong>where business money is right now</strong>. If Raj holds business cash, create “Cash with Raj” and set Raj as the holder. This is different from money the business owes Raj personally.
      </div>

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Cash, bank & payment locations</h2>
        <div className="space-y-2">
          {data.accountBalances.map(balance => {
            const account = data.accounts.find(item => item.id === balance.account_id)
            if (!account) return null
            const holder = account.custodian_partner_id ? data.partners.find(partner => partner.id === account.custodian_partner_id) : null
            return (
              <div key={balance.account_id} className="rounded-xl border border-cream-200 bg-white px-3 py-2.5 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center">
                    {holder ? <UserRound size={17} /> : <Banknote size={17} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="text-[12.5px] font-bold text-navy-900 truncate">{balance.name}</div>
                      {holder && <Badge tone="amber">WITH {holder.name.toUpperCase()}</Badge>}
                    </div>
                    <div className="text-[10px] uppercase text-navy-400 font-semibold">{balance.kind}</div>
                  </div>
                  <div className="num shrink-0 text-[15px] font-bold text-navy-900">{businessMoney(balance.balance)}</div>
                </div>
                {canAdmin && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="soft" className="!min-h-[36px] !text-[11.5px]" onClick={() => openEdit(account)}><Pencil size={13} /> Edit</Button>
                    <Button variant="danger" className="!min-h-[36px] !text-[11.5px]" onClick={() => setDeleting(account)}><Trash2 size={13} /> Delete</Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {data.staffPositions.some(position => Number(position.advance_balance) > 0) && (
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-[13px] font-bold text-navy-900">Business money with staff</h2>
            <Badge tone="blue">{businessMoney(staffHeld)}</Badge>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            {data.staffPositions.filter(position => Number(position.advance_balance) > 0).map(position => (
              <div key={position.staff_id} className="min-h-[52px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0">
                <div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center"><HandCoins size={15} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-navy-800 truncate">{position.name}</div>
                  <div className="text-[10px] text-navy-400">Business money issued for work expenses</div>
                </div>
                <div className="num text-[12.5px] font-bold">{businessMoney(position.advance_balance)}</div>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-navy-400 mt-1.5">Staff-held money stays a business asset until staff spends it, returns it, or a manager uses it to settle an approved pocket expense.</p>
        </section>
      )}

      <Modal open={open} onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }} title={editing ? 'Edit money location' : 'Add money location'}>
        <Field label="Name" hint="Use a name people recognize instantly: HDFC Current, Shop Cash, Cash with Raj.">
          <Input value={name} onChange={event => setName(event.target.value)} placeholder="HDFC Current / Cash with Raj" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <Select value={kind} onChange={event => setKind(event.target.value as BusinessAccountKind)}>
              <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Who holds it?">
            <Select value={custodianPartnerId} onChange={event => setCustodianPartnerId(event.target.value)}>
              <option value="">Business / shared</option>
              {activePartners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Opening balance" hint={editing ? 'Changing this immediately changes the calculated balance.' : 'Balance at the moment Prangan starts tracking this location.'}>
          <Input inputMode="decimal" value={opening} onChange={event => setOpening(event.target.value)} />
        </Field>
        {custodianPartnerId && <div className="rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2 text-[11px] text-navy-600">This remains <strong>business money</strong>. It will appear separately from any personal amount owed to this partner.</div>}
        <Button full loading={saving} disabled={!name.trim()} onClick={editing ? () => setConfirmEdit(true) : add}>{editing ? 'Review edit' : 'Add money location'}</Button>
      </Modal>

      <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm money-location edit" body="This changes the account name, type, opening balance and who currently holds this money location." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={edit} />
      <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete money location" body="This permanently deletes this account and Business records that depend on it. Type DELETE to continue." busy={saving} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  )
}
