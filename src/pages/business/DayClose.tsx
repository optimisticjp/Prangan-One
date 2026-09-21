import { useMemo, useState } from 'react'
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, todayBusinessISO } from '../../lib/business/finance'
import type { BusinessDayClosing } from '../../lib/business/types'

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1]

export default function BusinessDayClose() {
  const { data, canWrite, canAdmin, closeDay, editDayClose, deleteDayClose } = useBusiness()
  const toast = useToast()
  const cash = data.accountBalances.filter(account => account.kind === 'cash')
  const [target, setTarget] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [otherCash, setOtherCash] = useState('')
  const [differenceReason, setDifferenceReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<BusinessDayClosing | null>(null)
  const [deleting, setDeleting] = useState<BusinessDayClosing | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editAccountId, setEditAccountId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editExpected, setEditExpected] = useState('')
  const [editCounted, setEditCounted] = useState('')
  const [editNote, setEditNote] = useState('')

  const targetBalance = cash.find(account => account.account_id === target)?.balance ?? 0
  const counted = useMemo(() => DENOMINATIONS.reduce((sum, value) => sum + value * (Number(counts[String(value)]) || 0), 0) + (Number(otherCash) || 0), [counts, otherCash])
  const difference = counted - Number(targetBalance)
  const today = todayBusinessISO()

  const close = async () => {
    if (!target) return
    setBusy(true)
    try {
      const reasonText = Math.abs(difference) > 0.005 && differenceReason ? '[' + differenceReason + '] ' : ''
      await closeDay(target, counted, (reasonText + note.trim()).trim())
      toast.success('Cash day closed'); setTarget(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not close day') }
    finally { setBusy(false) }
  }

  const openEdit = (closing: BusinessDayClosing) => {
    setEditing(closing); setEditAccountId(closing.account_id); setEditDate(closing.close_date); setEditExpected(String(closing.expected_balance)); setEditCounted(String(closing.counted_balance)); setEditNote(closing.note ?? '')
  }

  const saveEdit = async () => {
    if (!editing || !editAccountId || !editDate) return
    setBusy(true)
    try {
      await editDayClose(editing.id, { accountId: editAccountId, closeDate: editDate, expectedBalance: Number(editExpected) || 0, countedBalance: Number(editCounted) || 0, note: editNote })
      toast.success('Day closing updated'); setConfirmEdit(false); setEditing(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update day closing') }
    finally { setBusy(false) }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteDayClose(deleting.id)
      toast.success('Day closing deleted'); setConfirmDelete(false); setDeleting(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not delete day closing') }
    finally { setBusy(false) }
  }

  return <div className="space-y-3 min-w-0">
    <div><h1 className="text-[17px] font-bold text-navy-900">Day close</h1><p className="text-[11.5px] text-navy-400">Count notes and coins. Existing closings can be fully edited or deleted.</p></div>

    {cash.map(account => {
      const closing = data.closings.find(item => item.account_id === account.account_id && item.close_date === today)
      return <div key={account.account_id} className="rounded-2xl border border-cream-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2"><div><div className="text-[12px] font-bold text-navy-800">{account.name}</div><div className="text-[10.5px] text-navy-400">Expected right now</div></div><div className="num text-[18px] font-bold">{businessMoney(account.balance)}</div></div>
        {closing ? <div className={'mt-2 rounded-xl border px-3 py-2 flex items-center gap-2 ' + (Number(closing.difference) === 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}><CheckCircle2 size={15} className={Number(closing.difference) === 0 ? 'text-paid' : 'text-over'} /><div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-navy-700">Closed · counted {businessMoney(closing.counted_balance)}</div><div className="text-[10px] text-navy-400 truncate">{Number(closing.difference) === 0 ? 'Matched' : (Number(closing.difference) < 0 ? 'Short ' : 'Over ') + businessMoney(Math.abs(Number(closing.difference)))}</div></div>{canAdmin && <button onClick={() => openEdit(closing)} className="h-8 w-8 rounded-lg bg-white text-navy-500 flex items-center justify-center"><Pencil size={13} /></button>}</div> : canWrite ? <Button full variant="soft" className="mt-2 !min-h-[38px] !text-[12px]" onClick={() => { setTarget(account.account_id); setCounts({}); setOtherCash(''); setDifferenceReason(''); setNote('') }}>Count notes & close</Button> : null}
      </div>
    })}

    <section><h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Recent closings</h2><div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">{data.closings.slice(0, 15).map(closing => <div key={closing.id} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2 min-w-0"><div className="flex-1 min-w-0"><div className="text-[11.5px] font-semibold truncate">{data.accounts.find(account => account.id === closing.account_id)?.name || 'Cash'} · {new Date(closing.close_date + 'T00:00:00').toLocaleDateString('en-IN')}</div><div className="text-[10px] text-navy-400 truncate">Expected {businessMoney(closing.expected_balance)} · Counted {businessMoney(closing.counted_balance)}</div></div><div className={'num text-[11.5px] font-bold ' + (Number(closing.difference) === 0 ? 'text-paid' : 'text-over')}>{businessMoney(closing.difference)}</div>{canAdmin && <><button onClick={() => openEdit(closing)} className="h-8 w-8 shrink-0 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center"><Pencil size={13} /></button><button onClick={() => { setDeleting(closing); setConfirmDelete(true) }} className="h-8 w-8 shrink-0 rounded-lg bg-red-50 text-over flex items-center justify-center"><Trash2 size={13} /></button></>}</div>)}</div></section>

    <Modal open={!!target} onClose={() => { if (!busy) setTarget(null) }} title="Count today’s cash" wide>
      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-navy-500">Expected</span><span className="num text-[17px] font-bold text-navy-900">{businessMoney(targetBalance)}</span></div>
      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">{DENOMINATIONS.map(value => { const count = Number(counts[String(value)]) || 0; return <div key={value} className="grid grid-cols-[52px_minmax(0,1fr)_82px] items-center gap-2 px-3 py-2 border-b border-cream-100 last:border-0"><div className="num text-[13px] font-bold">₹{value}</div><Input inputMode="numeric" value={counts[String(value)] ?? ''} onChange={event => setCounts(current => ({ ...current, [String(value)]: event.target.value.replace(/[^0-9]/g, '') }))} placeholder="0" className="!min-h-[36px]" /><div className="num text-right text-[11px] font-semibold">{businessMoney(value * count)}</div></div> })}</div>
      <Field label="Other cash / coins"><Input inputMode="decimal" value={otherCash} onChange={event => setOtherCash(event.target.value)} placeholder="0" /></Field>
      <div className={'rounded-xl border px-3 py-3 ' + (Math.abs(difference) < 0.005 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}><div className="flex justify-between"><span className="text-[11px]">Counted</span><span className="num font-bold">{businessMoney(counted)}</span></div><div className="flex justify-between mt-1"><span className="text-[11px]">Difference</span><span className="num font-bold">{Math.abs(difference) < 0.005 ? 'Matched' : (difference < 0 ? 'Short ' : 'Over ') + businessMoney(Math.abs(difference))}</span></div></div>
      {Math.abs(difference) > 0.005 && <Field label="Why is there a difference?"><Select value={differenceReason} onChange={event => setDifferenceReason(event.target.value)}><option value="">Choose reason</option><option>Missed cash expense</option><option>Cash given to partner</option><option>Counting difference</option><option>Other</option></Select></Field>}
      <Field label="Note"><Textarea value={note} onChange={event => setNote(event.target.value)} /></Field>
      <Button full loading={busy} disabled={Math.abs(difference) > 0.005 && !differenceReason} onClick={close}>Close day</Button>
    </Modal>

    <Modal open={!!editing} onClose={() => { if (!busy) setEditing(null) }} title="Edit day closing">
      <Field label="Cash account"><Select value={editAccountId} onChange={event => setEditAccountId(event.target.value)}>{cash.map(account => <option key={account.account_id} value={account.account_id}>{account.name}</option>)}</Select></Field>
      <Field label="Close date"><Input type="date" value={editDate} onChange={event => setEditDate(event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Expected"><Input inputMode="decimal" value={editExpected} onChange={event => setEditExpected(event.target.value)} /></Field><Field label="Counted"><Input inputMode="decimal" value={editCounted} onChange={event => setEditCounted(event.target.value)} /></Field></div>
      <Field label="Note"><Textarea value={editNote} onChange={event => setEditNote(event.target.value)} /></Field>
      <Button full onClick={() => setConfirmEdit(true)}>Review edit</Button>
    </Modal>

    <TypedConfirmModal open={confirmEdit} mode="EDIT" title="Confirm day-close edit" body="This directly replaces the selected closing values with the fields you entered." busy={busy} onClose={() => setConfirmEdit(false)} onConfirm={saveEdit} />
    <TypedConfirmModal open={confirmDelete} mode="DELETE" title="Delete day closing" body="This permanently deletes this day-closing record. Type DELETE to continue." busy={busy} onClose={() => { setConfirmDelete(false); setDeleting(null) }} onConfirm={remove} />
  </div>
}
