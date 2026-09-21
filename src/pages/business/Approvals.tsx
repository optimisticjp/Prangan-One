import { useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionLabels, expensePaidByLabel } from '../../lib/business/finance'

export default function BusinessApprovals() {
  const { data, userId, canApprove, approveTransaction, rejectTransaction } = useBusiness()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const pending = data.transactions.filter(t => t.approval_status === 'pending')
  const recent = data.transactions.filter(t => ['approved','rejected'].includes(t.approval_status)).slice(0, 20)

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(id)
    try {
      if (decision === 'approve') await approveTransaction(id)
      else await rejectTransaction(id)
      toast.success(decision === 'approve' ? 'Expense approved' : 'Expense rejected')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update approval')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 text-[11.5px] text-navy-600">
        <strong>APPROVAL</strong> answers “is this expense accepted?” Payment is separate: an approved expense can still be <strong>UNPAID</strong>.
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[17px] font-bold text-navy-900">Waiting for approval</h1>
          <Badge tone={pending.length ? 'amber' : 'green'}>{pending.length}</Badge>
        </div>
        <div className="space-y-2">
          {pending.length === 0 ? <Empty text="Nothing waiting. You’re caught up." /> : pending.map(tx => {
            const partner = data.partners.find(p => p.id === tx.partner_id)?.name
            const own = tx.created_by === userId
            const payer = expensePaidByLabel(tx, data.accounts, data.partners)
            return (
              <div key={tx.id} className="rounded-2xl border border-cream-200 bg-white p-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-50 text-pend flex items-center justify-center shrink-0"><Clock3 size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-navy-900">{businessTransactionLabels[tx.kind]}</span>
                      {tx.kind === 'expense' && <Badge tone={tx.payment_status === 'paid' ? 'green' : 'amber'}>{tx.payment_status === 'paid' ? 'PAID' : 'UNPAID'}</Badge>}
                    </div>
                    <div className="text-[11px] text-navy-400 truncate">{partner || tx.counterparty || payer || 'Business expense'} · {new Date(tx.occurred_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="num text-[16px] font-bold text-navy-900">{businessMoney(tx.amount)}</div>
                </div>
                {own ? (
                  <div className="mt-2 text-[11.5px] text-navy-400 rounded-lg bg-cream-100 px-2.5 py-2">You recorded this. Another partner must approve it.</div>
                ) : canApprove ? (
                  <div className="mt-2 flex gap-2">
                    <Button variant="soft" className="!min-h-[38px] !text-[12px] flex-1" loading={busy === tx.id} onClick={() => decide(tx.id, 'approve')}><Check size={14} /> Approve</Button>
                    <Button variant="danger" className="!min-h-[38px] !text-[12px] flex-1" disabled={busy === tx.id} onClick={() => decide(tx.id, 'reject')}><X size={14} /> Reject</Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-[14px] font-bold text-navy-900 mb-2">Recent decisions</h2>
          <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
            {recent.map(tx => (
              <div key={tx.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-cream-100 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-navy-800 truncate">{businessTransactionLabels[tx.kind]}</div>
                  <div className="text-[10.5px] text-navy-400">{new Date(tx.occurred_at).toLocaleDateString('en-IN')}</div>
                </div>
                {tx.kind === 'expense' && <Badge tone={tx.payment_status === 'paid' ? 'green' : 'amber'}>{tx.payment_status}</Badge>}
                <Badge tone={tx.approval_status === 'approved' ? 'green' : 'red'}>{tx.approval_status}</Badge>
                <div className="num text-[12.5px] font-bold">{businessMoney(tx.amount)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-cream-200 bg-white px-4 py-8 text-center text-[13px] text-navy-400">{text}</div>
}
