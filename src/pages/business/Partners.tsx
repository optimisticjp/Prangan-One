import { useState } from 'react'
import { Banknote, HandCoins, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessPartner, BusinessRole } from '../../lib/business/types'

type PartnerForm = { name: string; email: string; phone: string; ownership: string; role: BusinessRole; status: 'active' | 'disabled' }
const emptyForm: PartnerForm = { name: '', email: '', phone: '', ownership: '', role: 'partner', status: 'active' }

export default function BusinessPartners() {
  const { data, canAdmin, canWrite, addPartner, editPartner, deletePartner, postTransaction } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessPartner | null>(null)
  const [deleting, setDeleting] = useState<BusinessPartner | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [form, setForm] = useState<PartnerForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [settling, setSettling] = useState<{ partnerId: string; name: string; due: number } | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleAccountId, setSettleAccountId] = useState('')

  const activeAccounts = data.accounts.filter(account => account.active)

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (partner: BusinessPartner) => {
    const membership = data.members.find(member => member.partner_id === partner.id)
    setEditing(partner)
    setForm({
      name: partner.name,
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      ownership: partner.ownership_percent == null ? '' : String(partner.ownership_percent),
      role: membership?.role ?? 'partner',
      status: membership?.status === 'disabled' ? 'disabled' : 'active',
    })
    setOpen(true)
  }

  const submitAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await addPartner({ name: form.name, email: form.email, phone: form.phone, ownership: form.ownership ? Number(form.ownership) : null })
      toast.success('Partner added'); setOpen(false); setForm(emptyForm)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add partner') }
    finally { setSaving(false) }
  }

  const confirmEditNow = async () => {
    if (!editing || !form.name.trim()) return
    setSaving(true)
    try {
      await editPartner(editing.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        ownership: form.ownership ? Number(form.ownership) : null,
        role: form.role,
        status: form.status,
      })
      toast.success('Partner updated'); setConfirmEdit(false); setOpen(false); setEditing(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update partner') }
    finally { setSaving(false) }
  }

  const deleteNow = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deletePartner(deleting.id)
      toast.success('Partner and related records deleted'); setDeleting(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete partner') }
    finally { setSaving(false) }
  }

  const settle = async () => {
    if (!settling || Number(settleAmount) <= 0 || !settleAccountId) return
    setSaving(true)
    try {
      await postTransaction({ kind: 'reimbursement', amount: Number(settleAmount), accountId: settleAccountId, partnerId: settling.partnerId, note: 'Partner settlement' })
      toast.success('Partner settlement recorded'); setSettling(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not settle partner') }
    finally { setSaving(false) }
  }

  return <div className="space-y-3 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0"><h1 className="text-[17px] font-bold text-navy-900">Partners</h1><p className="text-[11.5px] text-navy-400">Money position, login access and partner role in one place.</p></div>
      {canAdmin && <button onClick={openAdd} className="h-9 shrink-0 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14} /> Partner</button>}
    </div>

    <div className="space-y-2">{data.partnerPositions.map(position => {
      const partner = data.partners.find(item => item.id === position.partner_id)
      if (!partner || !partner.active) return null
      const membership = data.members.find(member => member.partner_id === partner.id)
      const due = Number(position.outstanding_due)
      return <div key={position.partner_id} className="rounded-2xl border border-cream-200 bg-white p-3 min-w-0">
        <div className="flex items-center gap-2.5 mb-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><UserRound size={17} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0"><div className="text-[13px] font-bold text-navy-900 truncate">{position.name}</div>{membership && <Badge tone={membership.status === 'active' ? 'green' : 'gray'}>{membership.role.toUpperCase()}</Badge>}</div>
            <div className="text-[10.5px] text-navy-400 truncate">{partner.email || partner.phone || 'No login access'}</div>
          </div>
        </div>

        {due > 0 && <div className="rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2.5 flex items-center gap-2 mb-2.5">
          <HandCoins size={17} className="text-saffron-700 shrink-0" />
          <div className="flex-1 min-w-0"><div className="text-[9.5px] font-bold text-saffron-700">BUSINESS OWES</div><div className="num text-[17px] font-bold text-navy-900">{businessMoney(due)}</div></div>
          {canWrite && <Button variant="accent" className="!min-h-[36px] !px-3 !text-[11px]" onClick={() => { setSettling({ partnerId: position.partner_id, name: position.name, due }); setSettleAmount(String(due)); setSettleAccountId(activeAccounts[0]?.id ?? '') }}>Pay</Button>}
        </div>}

        <div className="grid grid-cols-3 gap-1.5"><Mini label="Capital" value={position.capital} /><Mini label="Paid personally" value={position.personal_expenses} /><Mini label="Withdrawn" value={position.withdrawals} /></div>
        {canAdmin && <div className="mt-2.5 grid grid-cols-2 gap-2"><Button variant="soft" className="!min-h-[38px] !text-[12px]" onClick={() => openEdit(partner)}><Pencil size={14} /> Edit</Button><Button variant="danger" className="!min-h-[38px] !text-[12px]" onClick={() => setDeleting(partner)}><Trash2 size={14} /> Delete</Button></div>}
      </div>
    })}</div>

    <Modal open={!!settling} onClose={() => { if (!saving) setSettling(null) }} title={settling ? 'Pay ' + settling.name : 'Pay partner'}>
      {settling && <div className="rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2"><div className="text-[10px] font-bold text-saffron-700">OUTSTANDING</div><div className="num text-[18px] font-bold text-navy-900">{businessMoney(settling.due)}</div></div>}
      <Field label="Amount to pay"><Input inputMode="decimal" value={settleAmount} onChange={event => setSettleAmount(event.target.value)} /></Field>
      <Field label="Pay from"><Select value={settleAccountId} onChange={event => setSettleAccountId(event.target.value)}>{activeAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></Field>
      <Button full loading={saving} disabled={!settleAccountId || Number(settleAmount) <= 0} onClick={settle}><Banknote size={15} /> Record payment</Button>
    </Modal>

    <Modal open={open} onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }} title={editing ? 'Edit partner' : 'Add partner'}>
      <Field label="Partner name"><Input value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} autoFocus /></Field>
      <Field label="Email" hint="Email controls who can log in to this Business workspace."><Input type="email" value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))} /></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={form.phone} onChange={event => setForm(value => ({ ...value, phone: event.target.value }))} /></Field><Field label="Ownership %"><Input inputMode="decimal" value={form.ownership} onChange={event => setForm(value => ({ ...value, ownership: event.target.value }))} /></Field></div>
      {editing && <div className="grid grid-cols-2 gap-2">
        <Field label="Workspace role"><Select value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value as BusinessRole }))}><option value="admin">Admin</option><option value="partner">Partner</option><option value="bookkeeper">Bookkeeper</option><option value="viewer">Viewer</option></Select></Field>
        <Field label="Login status"><Select value={form.status} onChange={event => setForm(value => ({ ...value, status: event.target.value as 'active' | 'disabled' }))}><option value="active">Active</option><option value="disabled">Disabled</option></Select></Field>
      </div>}
      <Button full loading={saving} disabled={!form.name.trim()} onClick={editing ? () => setConfirmEdit(true) : submitAdd}>{editing ? 'Review edit' : 'Add partner'}</Button>
    </Modal>

    <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm partner edit" body="This changes the partner profile, ownership, login email, workspace role and login status exactly as entered." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={confirmEditNow} />
    <TypedConfirmModal open={!!deleting} mode="DELETE" title="Delete partner" body="This permanently deletes the partner, their Business login membership and transactions tied to this partner. Type DELETE to continue." busy={saving} onClose={() => setDeleting(null)} onConfirm={deleteNow} />
  </div>
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-cream-100 px-2 py-2 min-w-0"><div className="text-[9.5px] text-navy-400 font-semibold truncate">{label}</div><div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div></div>
}
