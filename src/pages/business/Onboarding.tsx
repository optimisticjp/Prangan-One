import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react'
import { Button, Field, Input, Select } from '../../components/ui'
import { PranganBrand } from '../../components/PranganBrand'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { ApprovalMode } from '../../lib/business/types'

export default function BusinessOnboarding() {
  const { authenticated, loading, memberships, createBusiness } = useBusiness()
  const nav = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [openingCash, setOpeningCash] = useState('0')
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('one_partner')
  const [saving, setSaving] = useState(false)
  if (loading) return null
  if (!authenticated) return <Navigate to="/login" replace />
  if (memberships.length > 0) return <Navigate to="/business" replace />
  const submit = async () => { if (!name.trim() || !ownerName.trim()) return; setSaving(true); try { await createBusiness({ name, ownerName, approvalMode, openingCash: Number(openingCash) || 0 }); toast.success('Business workspace created'); nav('/business', { replace: true }) } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create business') } finally { setSaving(false) } }
  return <main className="min-h-screen bg-cream-50 px-4 py-6"><div className="max-w-md mx-auto"><div className="text-center mb-4"><PranganBrand variant="symbol-navy" height={36} className="mx-auto mb-2" /><div className="inline-flex items-center gap-1.5 rounded-full bg-saffron-50 border border-saffron-100 text-saffron-700 px-2.5 py-1 text-[10.5px] font-bold"><BriefcaseBusiness size={13} /> BUSINESS MONEY</div><h1 className="text-[22px] font-bold text-navy-900 mt-2">Start your business ledger</h1><p className="text-[12.5px] text-navy-400 mt-1">Track partner funds, expenses, approvals and daily cash. No invoicing or accounting jargon.</p></div><div className="rounded-2xl border border-cream-200 bg-white p-4 space-y-3"><Field label="Business name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Patel Trading" autoFocus /></Field><Field label="Your name"><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="You’ll be the first admin partner" /></Field><Field label="Opening cash"><Input inputMode="decimal" value={openingCash} onChange={e => setOpeningCash(e.target.value)} /></Field><Field label="Expense approval"><Select value={approvalMode} onChange={e => setApprovalMode(e.target.value as ApprovalMode)}><option value="none">No approval required</option><option value="one_partner">One other partner approves</option><option value="all_partners">All other partners approve</option></Select></Field><div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-navy-500"><Feature text="Cash / bank / UPI" /><Feature text="Partner contributions" /><Feature text="Personal-paid expenses" /><Feature text="Day closing" /></div><Button full loading={saving} disabled={!name.trim() || !ownerName.trim()} onClick={submit}>Create business workspace</Button></div></div></main>
}
function Feature({ text }: { text: string }) { return <div className="flex items-center gap-1.5 rounded-lg bg-cream-100 px-2 py-1.5"><CheckCircle2 size={12} className="text-paid" />{text}</div> }
