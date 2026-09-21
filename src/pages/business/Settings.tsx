import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { ApprovalMode } from '../../lib/business/types'

export default function BusinessSettings() {
  const { data, canAdmin, saveSettings, deleteBusiness } = useBusiness()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState(data.business?.name ?? '')
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(data.business?.approval_mode ?? 'one_partner')
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(data.business?.name ?? ''); setApprovalMode(data.business?.approval_mode ?? 'one_partner') }, [data.business])

  const save = async () => {
    if (!canAdmin || !name.trim()) return
    setSaving(true)
    try { await saveSettings({ name, approvalMode }); toast.success('Business settings saved'); setConfirmEdit(false) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save settings') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    if (!canAdmin) return
    setSaving(true)
    try {
      await deleteBusiness()
      toast.success('Business permanently deleted')
      setConfirmDelete(false)
      navigate('/business/onboarding', { replace: true })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete business') }
    finally { setSaving(false) }
  }

  return <div className="space-y-3 min-w-0">
    <div><h1 className="text-[17px] font-bold text-navy-900">Business settings</h1><p className="text-[11.5px] text-navy-400">Business admins control the workspace name, approval rule and deletion.</p></div>
    <div className="rounded-2xl border border-cream-200 bg-white p-3 space-y-3">
      <Field label="Business name"><Input value={name} onChange={event => setName(event.target.value)} disabled={!canAdmin} /></Field>
      <Field label="Expense approval rule"><Select value={approvalMode} onChange={event => setApprovalMode(event.target.value as ApprovalMode)} disabled={!canAdmin}><option value="none">No approval required</option><option value="one_partner">One other partner must approve</option><option value="all_partners">All other active partners must approve</option></Select></Field>
      {canAdmin && <Button full loading={saving} disabled={!name.trim()} onClick={() => setConfirmEdit(true)}>Save changes</Button>}
    </div>
    {canAdmin && <div className="rounded-2xl border border-red-200 bg-red-50 p-3"><div className="font-bold text-[13px] text-over">Delete entire Business</div><p className="text-[11.5px] text-navy-500 mt-1">Permanently removes this Business, partners, accounts, categories, transactions, approvals, proofs and day-closing records.</p><Button variant="danger" full className="mt-3" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete Business</Button></div>}
    <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm Business edit" body="This changes the Business name and expense approval rule." busy={saving} onClose={() => setConfirmEdit(false)} onConfirm={save} />
    <TypedConfirmModal open={confirmDelete} mode="DELETE" title="Delete entire Business" body="This permanently deletes the complete Business workspace and all Business data inside it. This cannot be undone from the app." busy={saving} onClose={() => setConfirmDelete(false)} onConfirm={remove} />
  </div>
}
