import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, todayBusinessISO } from '../../lib/business/finance'
import type { BusinessDayClosing } from '../../lib/business/types'

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1]

export default function BusinessDayClose() {
  const { data, canWrite, canAdmin, closeDay, reopenDay } = useBusiness()
  const toast = useToast()
  const cash = data.accountBalances.filter(a => a.kind === 'cash' && data.accounts.find(x => x.id === a.account_id)?.active !== false)
  const [target, setTarget] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [otherCash, setOtherCash] = useState('')
  const [differenceReason, setDifferenceReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [reopen, setReopen] = useState<BusinessDayClosing | null>(null)
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const targetBalance = cash.find(a => a.account_id === target)?.balance ?? 0
  const counted = useMemo(() => {
    const notes = DENOMINATIONS.reduce((sum, value) => sum + value * (Number(counts[String(value)]) || 0), 0)
    return notes + (Number(otherCash) || 0)
  }, [counts, otherCash])
  const difference = counted - Number(targetBalance)
  const today = todayBusinessISO()

  const openClose = (accountId: string) => {
    setTarget(accountId)
    setCounts({})
    setOtherCash('')
    setDifferenceReason('')
    setNote('')
  }

  const close = async () => {
    if (!target) return
    setBusy(true)
    try {
      const reasonText = Math.abs(difference) > 0.005 && differenceReason ? '[' + differenceReason + '] ' : ''
      await closeDay(target, counted, (reasonText + note.trim()).trim())
      toast.success('Cash day closed')
      setTarget(null)
      setCounts({})
      setOtherCash('')
      setDifferenceReason('')
      setNote('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not close day')
    } finally {
      setBusy(false)
    }
  }

  const reopenNow = async () => {
    if (!reopen || reason.trim().length < 3) return
    setBusy(true)
    try {
      await reopenDay(reopen.id, reason)
      toast.success('Day closing deleted / reopened')
      setConfirmDelete(false)
      setReopen(null)
      setReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reopen day')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[17px] font-bold text-navy-900">Day close</h1>
        <p className="text-[11.5px] text-navy-400">Count notes and coins. Prangan compares them with expected cash automatically.</p>
      </div>

      {cash.map(account => {
        const closing = data.closings.find(c => c.account_id === account.account_id && c.close_date === today)
        return (
          <div key={account.account_id} className="rounded-2xl border border-cream-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-bold text-navy-800">{account.name}</div>
                <div className="text-[10.5px] text-navy-400">Expected right now</div>
              </div>
              <div className="num text-[18px] font-bold">{businessMoney(account.balance)}</div>
            </div>

            {closing ? (
              <div className={'mt-2 rounded-xl border px-3 py-2 flex items-center gap-2 ' + (Number(closing.difference) === 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
                <CheckCircle2 size={15} className={Number(closing.difference) === 0 ? 'text-paid' : 'text-over'} />
                <div className="flex-1">
                  <div className={'text-[11px] font-semibold ' + (Number(closing.difference) === 0 ? 'text-paid' : 'text-over')}>
                    Closed · counted {businessMoney(closing.counted_balance)}
                  </div>
                  <div className="text-[10px] text-navy-400">
                    {Number(closing.difference) === 0
                      ? 'Cash matched perfectly'
                      : (Number(closing.difference) < 0 ? 'Short ' : 'Over ') + businessMoney(Math.abs(Number(closing.difference)))}
                  </div>
                </div>
                {canAdmin && (
                  <button onClick={() => setReopen(closing)} aria-label="Reopen day" className="h-8 w-8 rounded-lg bg-white text-navy-500 flex items-center justify-center">
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            ) : canWrite ? (
              <Button full variant="soft" className="mt-2 !min-h-[38px] !text-[12px]" onClick={() => openClose(account.account_id)}>
                Count notes & close
              </Button>
            ) : null}
          </div>
        )
      })}

      {cash.length === 0 && (
        <div className="rounded-2xl border border-cream-200 bg-white p-8 text-center text-[12.5px] text-navy-400">Add a Cash account first.</div>
      )}

      <section>
        <h2 className="text-[13px] font-bold text-navy-900 mb-1.5">Recent closings</h2>
        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {data.closings.slice(0, 15).map(c => (
            <div key={c.id} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold">{data.accounts.find(a => a.id === c.account_id)?.name || 'Cash'} · {new Date(c.close_date + 'T00:00:00').toLocaleDateString('en-IN')}</div>
                <div className="text-[10px] text-navy-400">Expected {businessMoney(c.expected_balance)} · Counted {businessMoney(c.counted_balance)}</div>
              </div>
              <div className={'num text-[11.5px] font-bold ' + (Number(c.difference) === 0 ? 'text-paid' : 'text-over')}>{businessMoney(c.difference)}</div>
            </div>
          ))}
        </div>
      </section>

      <Modal open={!!target} onClose={() => { if (!busy) setTarget(null) }} title="Count today’s cash" wide>
        <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-navy-500">Expected</span>
          <span className="num text-[17px] font-bold text-navy-900">{businessMoney(targetBalance)}</span>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
          {DENOMINATIONS.map(value => {
            const count = Number(counts[String(value)]) || 0
            return (
              <div key={value} className="grid grid-cols-[70px_1fr_90px] items-center gap-2 px-3 py-2 border-b border-cream-100 last:border-0">
                <div className="num text-[13px] font-bold text-navy-800">₹{value}</div>
                <Input
                  inputMode="numeric"
                  aria-label={'Count of ₹' + String(value)}
                  value={counts[String(value)] ?? ''}
                  onChange={e => setCounts(current => ({ ...current, [String(value)]: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="0"
                  className="!min-h-[36px] !text-[12px]"
                />
                <div className="num text-right text-[12px] font-semibold text-navy-600">{businessMoney(value * count)}</div>
              </div>
            )
          })}
        </div>

        <Field label="Other cash / coins" hint="Optional amount not covered above.">
          <Input inputMode="decimal" value={otherCash} onChange={e => setOtherCash(e.target.value)} placeholder="0" />
        </Field>

        <div className={'rounded-xl border px-3 py-3 ' + (Math.abs(difference) < 0.005 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-navy-500">Counted cash</span>
            <span className="num text-[18px] font-bold text-navy-900">{businessMoney(counted)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-semibold text-navy-500">Difference</span>
            <span className={'num text-[15px] font-bold ' + (Math.abs(difference) < 0.005 ? 'text-paid' : 'text-over')}>
              {Math.abs(difference) < 0.005 ? 'Matched' : (difference < 0 ? 'Short ' : 'Over ') + businessMoney(Math.abs(difference))}
            </span>
          </div>
        </div>

        {Math.abs(difference) > 0.005 && (
          <Field label="Why is there a difference?">
            <Select value={differenceReason} onChange={e => setDifferenceReason(e.target.value)}>
              <option value="">Choose reason</option>
              <option value="Missed cash expense">Missed cash expense</option>
              <option value="Cash given to partner">Cash given to partner</option>
              <option value="Counting difference">Counting difference</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        )}

        <Field label="Note">
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="min-h-[64px]" placeholder="Optional detail" />
        </Field>

        <Button full loading={busy} disabled={Math.abs(difference) > 0.005 && !differenceReason} onClick={close}>Close day</Button>
      </Modal>

      <Modal open={!!reopen} onClose={() => setReopen(null)} title="Reopen cash day">
        <Field label="Reason">
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this closing being reopened?" />
        </Field>
        <Button full variant="danger" disabled={reason.trim().length < 3} onClick={() => setConfirmDelete(true)}>Delete / reopen closing</Button>
      </Modal>

      <TypedConfirmModal
        open={confirmDelete}
        mode="DELETE"
        title="Delete day closing"
        body="This removes the closing so the day can be closed again. The reopen action stays in the activity audit log."
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={reopenNow}
      />
    </div>
  )
}
