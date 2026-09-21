import { useEffect, useState } from 'react'
import { Button, Field, Input, Select } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { ApprovalMode } from '../../lib/business/types'

export default function BusinessSettings() {
  const { data, canAdmin, saveSettings } = useBusiness()
  const toast = useToast()
  const [name, setName] = useState(data.business?.name ?? '')
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(data.business?.approval_mode ?? 'one_partner')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setName(data.business?.name ?? ''); setApprovalMode(data.business?.approval_mode ?? 'one_partner') }, [data.business])
  const save = async () => { if (!canAdmin || !name.trim()) return; setSaving(true); try { await saveSettings({ name, approvalMode }); toast.success('Business settings saved') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save settings') } finally { setSaving(false) } }
  return <div className="space-y-3"><div><h1 className="text-[17px] font-bold text-navy-900">Business settings</h1><p className="text-[11.5px] text-navy-400">Only a business admin can change these rules.</p></div><div className="rounded-2xl border border-cream-200 bg-white p-3 space-y-3"><Field label="Business name"><Input value={name} onChange={e => setName(e.target.value)} disabled={!canAdmin} /></Field><Field label="Expense approval rule" hint="Recorded expenses still affect real cash immediately; approval is a separate accountability status."><Select value={approvalMode} onChange={e => setApprovalMode(e.target.value as ApprovalMode)} disabled={!canAdmin}><option value="none">No approval required</option><option value="one_partner">One other partner must approve</option><option value="all_partners">All other active partners must approve</option></Select></Field>{canAdmin && <Button full loading={saving} disabled={!name.trim()} onClick={save}>Save settings</Button>}</div><div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 text-[11.5px] text-navy-600"><strong>Corrections stay visible.</strong> Posted money movements cannot be silently edited. Use Reverse from the Ledger so the original and correction remain in the audit trail.</div></div>
}
