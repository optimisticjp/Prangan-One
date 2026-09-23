import { useState } from 'react'
import { AlertTriangle, Banknote, HandCoins, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, summarizeBusinessMoney } from '../../lib/business/finance'
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

  const money = summarizeBusinessMoney(data.accountBalances, data.staffPositions)
  const activePartners = data.partners.filter(partner => partner.active)
  const negative = data.accountBalances.filter(balance => Number(balance.balance) < 0)

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
      toast.success('Money place added')
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add money place')
    } finally {
      setSaving(false)
    }
  }

  const edit = async () => {
    if (!editing || !name.trim()) return
    setSaving(true)
    try {
      await editAccount(editing.id, payload())
      toast.success('Money place updated')
      setConfirmEdit(false)
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update money place')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteAccount(deleting.id)
      toast.success('Money place deleted')
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete money place')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 min-w-0">
      <section className="rounded-2xl bg-navy-900 text-cream-50 p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-cream-100/55 font-bold">Money available now</div>
            <div className="num text-[25px] font-bold leading-tight">{businessMoney(money.available)}</div>
            <div className="text-[10px] text-cream-100/55 mt-1">Cash + bank + UPI + business money held by partners/staff.</div>
          </div>
          {canAdmin && (
            <button onClick={openAdd} className="min-h-[38px] shrink-0 px-3 rounded-xl bg-saffron-500 text-navy-950 text-[11.5px] font-bold flex items-center gap-1">
              <Plus size={14} /> Add place
            </button>
          )}
        </div>
      </section>

      {negative.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="px-3 py-2.5 flex gap-2.5">
            <AlertTriangle size={17} className="text-over shrink-0 mt-0.5" />
            <div>
              <div className="text-[12.5px] font-bold text-navy-900">Records need fixing: {businessMoney(money.recordGap)}</div>
              <p className="text-[10.5px] leading-relaxed text-navy-500 mt-0.5">
                This is <strong>not</strong> money someone owes you. It means a payment was recorded from one of these places before enough money was recorded there.
              </p>
            </div>
          </div>
          {negative.map(balance => (
            <div key={balance.account_id} className="border-t border-red-100 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-navy-800">{balance.name}</div>
                  <div className="text-[10px] text-navy-400">Recorded payments are {businessMoney(Math.abs(Number(balance.balance)))} more than recorded money.</div>
                </div>
                <div className="num text-[13px] font-bold text-over">{businessMoney(Math.abs(Number(balance.balance)))}</div>
              </div>
            </div>
          ))}
          <div className="border-t border-red-100 bg-white/60 px-3 py-2.5 text-[10.5px] leading-relaxed text-navy-500">
            <strong>How to fix:</strong> if that money really existed, record where it came from (customer money, partner capital/loan, etc.). If the payment was actually made personally by a partner, correct that payment instead of using Cash/Bank.
          </div>
        </section>
      )}

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] leading-relaxed text-navy-600">
        <strong>Simple rule:</strong> a money place answers “where is the business money?” Examples: HDFC Bank, Shop Cash, Business UPI, Cash with Yatin. Money owed to Yatin personally is shown separately under Partners.
      </div>

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Cash, bank, UPI & partner-held money</h2>
        <div className="space-y-2">
          {data.accountBalances.map(balance => {
            const account = data.accounts.find(item => item.id === balance.account_id)
            if (!account) return null
            const holder = account.custodian_partner_id ? data.partners.find(partner => partner.id === account.custodian_partner_id) : null
            const isShort = Number(balance.balance) < 0
            return (
              <div key={balance.account_id} className={'rounded-xl border bg-white px-3 py-2.5 min-w-0 ' + (isShort ? 'border-red-200' : 'border-cream-200')}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={'h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ' + (isShort ? 'bg-red-50 text-over' : 'bg-navy-50 text-navy-600')}>
                    {isShort ? <AlertTriangle size={17} /> : holder ? <UserRound size={17} /> : <Banknote size={17} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="text-[12.5px] font-bold text-navy-900 truncate">{balance.name}</div>
                      {holder && !isShort && <Badge tone="amber">WITH {holder.name.toUpperCase()}</Badge>}
                    </div>
                    <div className="text-[10px] text-navy-400 font-semibold">
                      {isShort ? 'PAYMENT SOURCE MISSING' : holder ? 'BUSINESS MONEY HELD BY PARTNER' : account.kind.toUpperCase()}
                    </div>
                  </div>
                  {isShort ? (
                    <div className="shrink-0 text-right"><div className="num text-[13px] font-bold text-over">{businessMoney(Math.abs(Number(balance.balance)))}</div><div className="text-[8.5px] text-navy-400">needs source</div></div>
                  ) : (
                    <div className="num shrink-0 text-[15px] font-bold text-navy-900">{businessMoney(balance.balance)}</div>
                  )}
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
            <div>
              <h2 className="text-[13px] font-bold text-navy-900">Business money currently with staff</h2>
              <div className="text-[9.5px] text-navy-400">Still belongs to the business until spent or returned.</div>
            </div>
            <Badge tone="blue">{businessMoney(money.staffHeld)}</Badge>
          </div>
          <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            {data.staffPositions.filter(position => Number(position.advance_balance) > 0).map(position => (
              <div key={position.staff_id} className="min-h-[52px] px-3 py-2 flex items-center gap-2.5 border-b border-cream-100 last:border-0">
                <div className="h-8 w-8 rounded-lg bg-saffron-50 text-saffron-700 flex items-center justify-center"><HandCoins size={15} /></div>
                <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-navy-800 truncate">{position.name}</div><div className="text-[10px] text-navy-400">Business money given for work expenses</div></div>
                <div className="num text-[12.5px] font-bold">{businessMoney(position.advance_balance)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal open={open} onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }} title={editing ? 'Edit money place' : 'Add money place'}>
        <Field label="Name" hint="Use a name anyone in the business understands instantly.">
          <Input value={name} onChange={event => setName(event.target.value)} placeholder="HDFC Bank / Shop Cash / Cash with Yatin" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="What is it?">
            <Select value={kind} onChange={event => setKind(event.target.value as BusinessAccountKind)}>
              <option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Who is holding it?">
            <Select value={custodianPartnerId} onChange={event => setCustodianPartnerId(event.target.value)}>
              <option value="">Business / shared</option>
              {activePartners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Money already there when tracking starts" hint={editing ? 'Changing this changes the calculated balance, so use it only to correct the starting figure.' : 'Example: if Shop Cash already has ₹5,000 when you start using Prangan, enter 5000.'}>
          <Input inputMode="decimal" value={opening} onChange={event => setOpening(event.target.value)} />
        </Field>
        {custodianPartnerId && <div className="rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2 text-[11px] text-navy-600">This money still belongs to the business. It is only being held by this partner.</div>}
        <Button full loading={saving} disabled={!name.trim()} onClick={editing ? () => setConfirmEdit(true) : add}>{editing ? 'Review change' : 'Add money place'}</Button>
      </Modal>

      <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm money-place edit" body="This changes the name, type, starting money and who holds this business money." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={edit} />
      <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete money place" body="This permanently deletes this place and Business records that depend on it. Type DELETE to continue." busy={saving} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  )
}
