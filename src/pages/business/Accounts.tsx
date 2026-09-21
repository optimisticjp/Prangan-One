import { useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import type { BusinessAccountKind } from '../../lib/business/types'

export default function BusinessAccounts() {
  const { data, canAdmin, addAccount } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<BusinessAccountKind>('bank')
  const [opening, setOpening] = useState('0')
  const [saving, setSaving] = useState(false)
  const total = data.accountBalances.reduce((sum, a) => sum + Number(a.balance), 0)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await addAccount({ name, kind, openingBalance: Number(opening) || 0 }); toast.success('Account added'); setOpen(false); setName(''); setOpening('0') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add account') }
    finally { setSaving(false) }
  }

  return <div className="space-y-3"><div className="flex items-end justify-between"><div><div className="text-[10.5px] uppercase tracking-wide text-navy-400 font-semibold">Total funds</div><div className="num text-[24px] font-bold text-navy-900">{businessMoney(total)}</div></div>{canAdmin && <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1"><Plus size={14} /> Account</button>}</div>
    <div className="space-y-2">{data.accountBalances.map(a => <div key={a.account_id} className="rounded-2xl border border-cream-200 bg-white px-3 py-3 flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center"><Banknote size={18} /></div><div className="flex-1 min-w-0"><div className="text-[13px] font-bold text-navy-900 truncate">{a.name}</div><div className="text-[10.5px] uppercase text-navy-400 font-semibold">{a.kind}</div></div><div className="num text-[16px] font-bold text-navy-900">{businessMoney(a.balance)}</div></div>)}</div>
    <Modal open={open} onClose={() => setOpen(false)} title="Add money account"><Field label="Account name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="HDFC Current / Petty Cash" /></Field><Field label="Type"><Select value={kind} onChange={e => setKind(e.target.value as BusinessAccountKind)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="upi">UPI</option><option value="wallet">Wallet</option><option value="other">Other</option></Select></Field><Field label="Opening balance" hint="Use the real balance when you start tracking this account."><Input inputMode="decimal" value={opening} onChange={e => setOpening(e.target.value)} /></Field><Button full loading={saving} disabled={!name.trim()} onClick={save}>Add account</Button></Modal>
  </div>
}
