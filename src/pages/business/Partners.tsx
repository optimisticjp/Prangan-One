import { useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import { Button, Field, Input, Modal } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'

export default function BusinessPartners() {
  const { data, canAdmin, addPartner } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ownership, setOwnership] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addPartner({ name, email, phone, ownership: ownership ? Number(ownership) : null })
      toast.success('Partner added')
      setOpen(false); setName(''); setEmail(''); setPhone(''); setOwnership('')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add partner') }
    finally { setSaving(false) }
  }

  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><h1 className="text-[17px] font-bold text-navy-900">Partners</h1><p className="text-[11.5px] text-navy-400">Contributions, personal spending, dues and withdrawals.</p></div>{canAdmin && <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14} /> Partner</button>}</div>
    <div className="space-y-2">{data.partnerPositions.map(position => {
      const partner = data.partners.find(p => p.id === position.partner_id)
      return <div key={position.partner_id} className="rounded-2xl border border-cream-200 bg-white p-3">
        <div className="flex items-center gap-2.5 mb-2.5"><div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><UserRound size={17} /></div><div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-navy-900 truncate">{position.name}</div><div className="text-[10.5px] text-navy-400 truncate">{partner?.ownership_percent != null ? `${partner.ownership_percent}% ownership · ` : ''}{partner?.email || partner?.phone || 'No login invite yet'}</div></div>{Number(position.outstanding_due) > 0 && <div className="text-right"><div className="text-[9.5px] text-pend font-semibold">BUSINESS OWES</div><div className="num text-[14px] font-bold text-pend">{businessMoney(position.outstanding_due)}</div></div>}</div>
        <div className="grid grid-cols-3 gap-1.5"><Mini label="Capital" value={position.capital} /><Mini label="Paid personally" value={position.personal_expenses} /><Mini label="Withdrawn" value={position.withdrawals} /></div>
        {(Number(position.advances) > 0 || Number(position.reimbursements) > 0) && <div className="mt-1.5 grid grid-cols-2 gap-1.5"><Mini label="Temporary advance" value={position.advances} /><Mini label="Reimbursed" value={position.reimbursements} /></div>}
      </div>
    })}</div>

    <Modal open={open} onClose={() => setOpen(false)} title="Add partner">
      <Field label="Partner name"><Input value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
      <Field label="Email" hint="Optional. If added, this email can log in as a partner."><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Phone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field><Field label="Ownership %"><Input inputMode="decimal" value={ownership} onChange={e => setOwnership(e.target.value)} /></Field></div>
      <Button full loading={saving} disabled={!name.trim()} onClick={save}>Add partner</Button>
    </Modal>
  </div>
}
function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-cream-100 px-2 py-2"><div className="text-[9.5px] text-navy-400 font-semibold truncate">{label}</div><div className="num text-[12px] font-bold text-navy-800 truncate">{businessMoney(value)}</div></div> }
