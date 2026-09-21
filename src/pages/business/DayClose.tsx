import { useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button, Field, Input, Modal, Textarea } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, todayBusinessISO } from '../../lib/business/finance'
import type { BusinessDayClosing } from '../../lib/business/types'

export default function BusinessDayClose() {
  const { data, canWrite, canAdmin, closeDay, reopenDay } = useBusiness()
  const toast = useToast()
  const cash = data.accountBalances.filter(a => a.kind === 'cash')
  const [target, setTarget] = useState<string | null>(null)
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [reopen, setReopen] = useState<BusinessDayClosing | null>(null)
  const [reason, setReason] = useState('')

  const close = async () => { if (!target || counted === '') return; setBusy(true); try { await closeDay(target, Number(counted), note); toast.success('Cash day closed'); setTarget(null); setCounted(''); setNote('') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not close day') } finally { setBusy(false) } }
  const reopenNow = async () => { if (!reopen || reason.trim().length < 3) return; setBusy(true); try { await reopenDay(reopen.id, reason); toast.success('Day reopened'); setReopen(null); setReason('') } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not reopen day') } finally { setBusy(false) } }
  const today = todayBusinessISO()

  return <div className="space-y-3"><div><h1 className="text-[17px] font-bold text-navy-900">Day close</h1><p className="text-[11.5px] text-navy-400">Count actual cash and compare it with the ledger.</p></div>
    {cash.map(a => { const closing = data.closings.find(c => c.account_id === a.account_id && c.close_date === today); return <div key={a.account_id} className="rounded-2xl border border-cream-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div><div className="text-[12px] font-bold text-navy-800">{a.name}</div><div className="text-[10.5px] text-navy-400">Expected right now</div></div><div className="num text-[18px] font-bold">{businessMoney(a.balance)}</div></div>{closing ? <div className="mt-2 rounded-xl bg-green-50 border border-green-100 px-3 py-2 flex items-center gap-2"><CheckCircle2 size={15} className="text-paid" /><div className="flex-1"><div className="text-[11px] font-semibold text-paid">Closed · counted {businessMoney(closing.counted_balance)}</div><div className="text-[10px] text-navy-400">Difference {businessMoney(closing.difference)}</div></div>{canAdmin && <button onClick={() => setReopen(closing)} aria-label="Reopen day" className="h-8 w-8 rounded-lg bg-white text-navy-500 flex items-center justify-center"><RotateCcw size={13} /></button>}</div> : canWrite && <Button full variant="soft" className="mt-2 !min-h-[38px] !text-[12px]" onClick={() => { setTarget(a.account_id); setCounted(String(a.balance)) }}>Count & close</Button>}</div> })}
    {cash.length === 0 && <div className="rounded-2xl border border-cream-200 bg-white p-8 text-center text-[12.5px] text-navy-400">Add a Cash account first.</div>}
    <section><h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Recent closings</h2><div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">{data.closings.slice(0,15).map(c => <div key={c.id} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2"><div className="flex-1"><div className="text-[11.5px] font-semibold">{data.accounts.find(a => a.id === c.account_id)?.name || 'Cash'} · {new Date(c.close_date + 'T00:00:00').toLocaleDateString('en-IN')}</div><div className="text-[10px] text-navy-400">Expected {businessMoney(c.expected_balance)} · Counted {businessMoney(c.counted_balance)}</div></div><div className={`num text-[11.5px] font-bold ${Number(c.difference) === 0 ? 'text-paid' : 'text-over'}`}>{businessMoney(c.difference)}</div></div>)}</div></section>
    <Modal open={!!target} onClose={() => setTarget(null)} title="Close today’s cash"><Field label="Actual cash counted"><Input inputMode="decimal" value={counted} onChange={e => setCounted(e.target.value)} /></Field><Field label="Note"><Textarea value={note} onChange={e => setNote(e.target.value)} className="min-h-[70px]" placeholder="Optional reason for any difference" /></Field><Button full loading={busy} disabled={counted === ''} onClick={close}>Close day</Button></Modal>
    <Modal open={!!reopen} onClose={() => setReopen(null)} title="Reopen cash day"><Field label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this closing being reopened?" /></Field><Button full variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={reopenNow}>Reopen with audit log</Button></Modal>
  </div>
}
