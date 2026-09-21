import { useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Button, Field, Input, Modal } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessPartner } from '../../lib/business/types'

type PartnerForm = {
  name: string
  email: string
  phone: string
  ownership: string
}

const emptyForm: PartnerForm = { name: '', email: '', phone: '', ownership: '' }

export default function BusinessPartners() {
  const { data, canAdmin, addPartner, editPartner, deletePartner } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessPartner | null>(null)
  const [deleting, setDeleting] = useState<BusinessPartner | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [form, setForm] = useState<PartnerForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (partner: BusinessPartner) => {
    setEditing(partner)
    setForm({
      name: partner.name,
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      ownership: partner.ownership_percent == null ? '' : String(partner.ownership_percent),
    })
    setOpen(true)
  }

  const submitAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await addPartner({
        name: form.name,
        email: form.email,
        phone: form.phone,
        ownership: form.ownership ? Number(form.ownership) : null,
      })
      toast.success('Partner added')
      setOpen(false)
      setForm(emptyForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add partner')
    } finally {
      setSaving(false)
    }
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
      })
      toast.success('Partner updated')
      setConfirmEdit(false)
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update partner')
    } finally {
      setSaving(false)
    }
  }

  const deleteNow = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deletePartner(deleting.id)
      toast.success('Partner deleted from active access')
      setDeleting(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not delete partner'
      toast.error(msg === 'last_admin_cannot_delete' ? 'The last Business Admin cannot be deleted.' : msg === 'partner_balance_must_be_zero' ? 'Settle the amount owed to this partner before deleting them.' : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-bold text-navy-900">Partners</h1>
          <p className="text-[11.5px] text-navy-400">Contributions, personal spending, dues and withdrawals.</p>
        </div>
        {canAdmin && (
          <button onClick={openAdd} className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1">
            <Plus size={14} /> Partner
          </button>
        )}
      </div>

      <div className="space-y-2">
        {data.partnerPositions.map(position => {
          const partner = data.partners.find(p => p.id === position.partner_id)
          if (!partner) return null
          return (
            <div key={position.partner_id} className="rounded-2xl border border-cream-200 bg-white p-3">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
                  <UserRound size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-navy-900 truncate">{position.name}</div>
                  <div className="text-[10.5px] text-navy-400 truncate">
                    {partner.ownership_percent != null ? String(partner.ownership_percent) + '% ownership · ' : ''}
                    {partner.email || partner.phone || 'No login invite yet'}
                  </div>
                </div>
                {Number(position.outstanding_due) > 0 && (
                  <div className="text-right">
                    <div className="text-[9.5px] text-pend font-semibold">BUSINESS OWES</div>
                    <div className="num text-[14px] font-bold text-pend">{businessMoney(position.outstanding_due)}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <Mini label="Capital" value={position.capital} />
                <Mini label="Paid personally" value={position.personal_expenses} />
                <Mini label="Withdrawn" value={position.withdrawals} />
              </div>

              {(Number(position.advances) > 0 || Number(position.reimbursements) > 0) && (
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <Mini label="Temporary advance" value={position.advances} />
                  <Mini label="Reimbursed" value={position.reimbursements} />
                </div>
              )}

              {canAdmin && (
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button variant="soft" className="!min-h-[38px] !text-[12px]" onClick={() => openEdit(partner)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button variant="danger" className="!min-h-[38px] !text-[12px]" onClick={() => setDeleting(partner)}>
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
        title={editing ? 'Edit partner' : 'Add partner'}
      >
        <Field label="Partner name">
          <Input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} autoFocus />
        </Field>
        <Field label="Email" hint="If present, this email gets Business login access.">
          <Input type="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Phone">
            <Input value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} />
          </Field>
          <Field label="Ownership %">
            <Input inputMode="decimal" value={form.ownership} onChange={e => setForm(v => ({ ...v, ownership: e.target.value }))} />
          </Field>
        </div>
        <Button
          full
          loading={saving}
          disabled={!form.name.trim()}
          onClick={editing ? () => setConfirmEdit(true) : submitAdd}
        >
          {editing ? 'Review edit' : 'Add partner'}
        </Button>
      </Modal>

      <TypedConfirmModal
        open={confirmEdit}
        mode="EDIT"
        title="Confirm partner edit"
        body="This changes the partner profile and may change which email can log in to this Business workspace."
        busy={saving}
        onClose={() => setConfirmEdit(false)}
        onConfirm={confirmEditNow}
      />

      <TypedConfirmModal
        open={!!deleting}
        mode="DELETE"
        title="Delete partner"
        body="The partner will be removed from active Business access. Historical transactions and money records will remain."
        busy={saving}
        onClose={() => setDeleting(null)}
        onConfirm={deleteNow}
      />
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream-100 px-2 py-2">
      <div className="text-[9.5px] text-navy-400 font-semibold truncate">{label}</div>
      <div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div>
    </div>
  )
}
