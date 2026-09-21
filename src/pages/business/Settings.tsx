import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Field, Input, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { ApprovalMode } from '../../lib/business/types'

export default function BusinessSettings() {
  const { data, canAdmin, saveSettings, deleteBusiness } = useBusiness()
  const toast = useToast()
  const [name, setName] = useState(data.business?.name ?? '')
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(data.business?.approval_mode ?? 'one_partner')
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(data.business?.name ?? '')
    setApprovalMode(data.business?.approval_mode ?? 'one_partner')
  }, [data.business])

  const save = async () => {
    if (!canAdmin || !name.trim()) return
    setSaving(true)
    try {
      await saveSettings({ name, approvalMode })
      toast.success('Business settings saved')
      setConfirmEdit(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!canAdmin) return
    setSaving(true)
    try {
      await deleteBusiness()
      toast.success('Business workspace deleted from active use')
      setConfirmDelete(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete business')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[17px] font-bold text-navy-900">Business settings</h1>
        <p className="text-[11.5px] text-navy-400">Only a business admin can change these rules.</p>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-3 space-y-3">
        <Field label="Business name">
          <Input value={name} onChange={e => setName(e.target.value)} disabled={!canAdmin} />
        </Field>
        <Field label="Expense approval rule" hint="Approval and payment status are separate.">
          <Select value={approvalMode} onChange={e => setApprovalMode(e.target.value as ApprovalMode)} disabled={!canAdmin}>
            <option value="none">No approval required</option>
            <option value="one_partner">One other partner must approve</option>
            <option value="all_partners">All other active partners must approve</option>
          </Select>
        </Field>
        {canAdmin && (
          <Button full loading={saving} disabled={!name.trim()} onClick={() => setConfirmEdit(true)}>
            Save changes
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 text-[11.5px] text-navy-600">
        <strong>EDIT confirmation is required.</strong> Financial transactions themselves are never silently rewritten; money corrections stay visible in the audit trail.
      </div>

      {canAdmin && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
          <div className="font-bold text-[13px] text-over">Delete Business workspace</div>
          <p className="text-[11.5px] text-navy-500 mt-1">
            This removes active access for all members. Financial history is archived rather than physically erased.
          </p>
          <Button variant="danger" full className="mt-3" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Delete Business
          </Button>
        </div>
      )}

      <TypedConfirmModal
        open={confirmEdit}
        mode="EDIT"
        title="Confirm Business edit"
        body="This changes the Business name and expense approval rule."
        busy={saving}
        onClose={() => setConfirmEdit(false)}
        onConfirm={save}
      />

      <TypedConfirmModal
        open={confirmDelete}
        mode="DELETE"
        title="Delete Business workspace"
        body="This is a high-impact action. All active Business memberships will be disabled. Historical money records remain archived for integrity."
        busy={saving}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  )
}
