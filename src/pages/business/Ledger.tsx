import { useMemo, useState } from 'react'
import { Download, Paperclip, RotateCcw, Search } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney, businessTransactionLabels, expensePaidByLabel, transactionCashDirection } from '../../lib/business/finance'
import { exportCsv } from '../../lib/csv'
import type { BusinessPaidBy, BusinessTransaction } from '../../lib/business/types'
import type { BusinessOutletContext } from '../../components/business/BusinessLayout'

const filters = ['all', 'income', 'expense', 'unpaid', 'partner', 'approval'] as const

export default function BusinessLedger() {
  const { data, canWrite, reverseTransaction, markExpensePaid } = useBusiness()
  const { openTransaction } = useOutletContext<BusinessOutletContext>()
  const toast = useToast()
  const [filter, setFilter] = useState<typeof filters[number]>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BusinessTransaction | null>(null)
  const [reason, setReason] = useState('')
  const [reversing, setReversing] = useState(false)
  const [paidBy, setPaidBy] = useState<BusinessPaidBy>('business')
  const [payAccountId, setPayAccountId] = useState('')
  const [payPartnerId, setPayPartnerId] = useState('')
  const [paying, setPaying] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.transactions.filter(tx => {
      if (filter === 'income' && !['income','refund'].includes(tx.kind)) return false
      if (filter === 'expense' && !['expense','personal_expense','reimbursement'].includes(tx.kind)) return false
      if (filter === 'unpaid' && !(tx.kind === 'expense' && tx.payment_status === 'unpaid' && !tx.reversed_at)) return false
      if (filter === 'partner' && !['partner_capital','partner_advance','personal_expense','reimbursement','withdrawal'].includes(tx.kind) && !(tx.kind === 'expense' && !!tx.partner_id)) return false
      if (filter === 'approval' && tx.approval_status !== 'pending') return false
      if (!q) return true

      const partner = data.partners.find(p => p.id === tx.partner_id)?.name ?? ''
      const category = data.categories.find(c => c.id === tx.category_id)?.name ?? ''
      const payer = expensePaidByLabel(tx, data.accounts, data.partners) ?? ''
      return [tx.amount, tx.counterparty, tx.note, partner, category, payer, tx.payment_status, tx.approval_status, businessTransactionLabels[tx.kind]]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    })
  }, [data.transactions, data.partners, data.categories, data.accounts, filter, query])

  const download = () => exportCsv(
    'business-ledger.csv',
    ['Date','Type','Amount','Payment','Paid by','Account','Partner','Category','Approval','Party','Note'],
    list.map(tx => [
      new Date(tx.occurred_at).toLocaleString('en-IN'),
      businessTransactionLabels[tx.kind],
      Number(tx.amount),
      tx.kind === 'expense' ? tx.payment_status : '',
      tx.kind === 'expense' ? expensePaidByLabel(tx, data.accounts, data.partners) ?? '' : '',
      data.accounts.find(a => a.id === tx.account_id)?.name,
      data.partners.find(p => p.id === tx.partner_id)?.name,
      data.categories.find(c => c.id === tx.category_id)?.name,
      tx.approval_status,
      tx.counterparty ?? '',
      tx.note ?? '',
    ]),
  )

  const openDetails = (tx: BusinessTransaction) => {
    setSelected(tx)
    setReason('')
    setPaidBy('business')
    setPayAccountId(data.accounts[0]?.id ?? '')
    setPayPartnerId(data.partners[0]?.id ?? '')
  }

  const reverse = async () => {
    if (!selected || reason.trim().length < 3) return
    setReversing(true)
    try {
      await reverseTransaction(selected.id, reason)
      toast.success('Transaction reversed')
      setSelected(null)
      setReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reverse transaction')
    } finally {
      setReversing(false)
    }
  }

  const markPaid = async () => {
    if (!selected || selected.kind !== 'expense' || selected.payment_status !== 'unpaid') return
    if (paidBy === 'business' && !payAccountId) return
    if (paidBy === 'partner' && !payPartnerId) return

    setPaying(true)
    try {
      await markExpensePaid(selected.id, {
        paidBy,
        accountId: paidBy === 'business' ? payAccountId : null,
        partnerId: paidBy === 'partner' ? payPartnerId : null,
      })
      toast.success(paidBy === 'business' ? 'Expense paid from business funds' : 'Expense marked paid by partner')
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not mark expense paid')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2 text-[11px] text-navy-600">
        <strong>UNPAID</strong> = recorded expense, no money moved yet. <strong>APPROVAL</strong> = another partner still needs to accept it.
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search amount, partner, note…" className="!min-h-[40px] !text-[13px] !pl-9" />
        </div>
        <button onClick={download} aria-label="Export ledger CSV" className="h-10 w-10 rounded-xl border border-cream-300 bg-white flex items-center justify-center text-navy-600">
          <Download size={16} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={'shrink-0 rounded-full border px-3 min-h-[34px] text-[11px] font-semibold capitalize ' + (filter === f ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-cream-300 text-navy-500')}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
        {list.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-navy-400">No matching transactions.</div>
        ) : list.map(tx => {
          const direction = transactionCashDirection(tx)
          const partner = data.partners.find(p => p.id === tx.partner_id)?.name
          const proof = data.attachments.some(a => a.transaction_id === tx.id)
          const payer = expensePaidByLabel(tx, data.accounts, data.partners)

          return (
            <button key={tx.id} onClick={() => openDetails(tx)} className="w-full min-h-[58px] flex items-center gap-2 px-3 py-2 border-b border-cream-100 last:border-0 text-left active:bg-cream-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12.5px] font-semibold text-navy-800 truncate">{businessTransactionLabels[tx.kind]}</span>
                  {proof && <Paperclip size={11} className="text-navy-300" />}
                  {tx.kind === 'expense' && <Badge tone={tx.payment_status === 'paid' ? 'green' : 'amber'}>{tx.payment_status === 'paid' ? 'PAID' : 'UNPAID'}</Badge>}
                  {tx.approval_status === 'pending' && <Badge tone="amber">APPROVAL</Badge>}
                  {tx.approval_status === 'rejected' && <Badge tone="red">REJECTED</Badge>}
                  {tx.reversed_at && <Badge tone="gray">REVERSED</Badge>}
                </div>
                <div className="text-[10.5px] text-navy-400 truncate">
                  {tx.kind === 'expense' ? payer : partner || tx.counterparty || data.accounts.find(a => a.id === tx.account_id)?.name || 'Business'}
                  {' · '}
                  {new Date(tx.occurred_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                </div>
              </div>
              <div className={'num text-[13px] font-bold whitespace-nowrap ' + (direction === 'in' ? 'text-paid' : direction === 'out' ? 'text-over' : 'text-navy-700')}>
                {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}{businessMoney(tx.amount)}
              </div>
            </button>
          )
        })}
      </div>

      <Button full variant="soft" onClick={() => openTransaction('expense')}>Add transaction</Button>

      <Modal open={!!selected} onClose={() => { if (!paying && !reversing) { setSelected(null); setReason('') } }} title="Transaction details">
        {selected && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">{businessTransactionLabels[selected.kind]}</div>
                <div className="text-[12px] text-navy-400">{new Date(selected.occurred_at).toLocaleString('en-IN')}</div>
              </div>
              <div className="num text-[20px] font-bold">{businessMoney(selected.amount)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {selected.kind === 'expense' && <Info label="Payment" value={selected.payment_status === 'paid' ? 'Paid' : 'Unpaid'} />}
              {selected.kind === 'expense' && <Info label="Paid by" value={expensePaidByLabel(selected, data.accounts, data.partners) || '—'} />}
              <Info label="Account" value={data.accounts.find(a => a.id === selected.account_id)?.name || '—'} />
              <Info label="Partner" value={data.partners.find(p => p.id === selected.partner_id)?.name || '—'} />
              <Info label="Category" value={data.categories.find(c => c.id === selected.category_id)?.name || '—'} />
              <Info label="Approval" value={selected.approval_status.replace('_',' ')} />
              {selected.kind === 'expense' && selected.due_date && <Info label="Due date" value={new Date(selected.due_date + 'T00:00:00').toLocaleDateString('en-IN')} />}
            </div>

            {(selected.counterparty || selected.note) && (
              <div className="rounded-xl bg-cream-100 px-3 py-2 text-[12.5px] text-navy-600">
                {selected.counterparty && <div className="font-semibold">{selected.counterparty}</div>}
                {selected.note && <div>{selected.note}</div>}
              </div>
            )}

            {canWrite && selected.kind === 'expense' && selected.payment_status === 'unpaid' && !selected.reversed_at && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                <div>
                  <div className="text-[10px] font-bold tracking-wide text-pend">MARK AS PAID</div>
                  <div className="text-[11.5px] text-navy-600">Choose who actually paid. This is when the financial balance will move.</div>
                </div>

                <Field label="Paid by">
                  <Select value={paidBy} onChange={e => setPaidBy(e.target.value as BusinessPaidBy)}>
                    <option value="business">Business funds</option>
                    <option value="partner">Partner personally</option>
                  </Select>
                </Field>

                {paidBy === 'business' ? (
                  <Field label="Paid from account">
                    <Select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}>
                      {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Partner who paid">
                    <Select value={payPartnerId} onChange={e => setPayPartnerId(e.target.value)}>
                      {data.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                )}

                <Button full loading={paying} disabled={paidBy === 'business' ? !payAccountId : !payPartnerId} onClick={markPaid}>
                  Mark expense paid
                </Button>
              </div>
            )}

            {canWrite && !selected.reversed_at && selected.kind !== 'reversal' && (
              <>
                <Field label="Reverse this transaction">
                  <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for correction" />
                </Field>
                <Button variant="danger" full loading={reversing} disabled={reason.trim().length < 3} onClick={reverse}>
                  <RotateCcw size={15} /> Reverse with audit trail
                </Button>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-3 py-2">
      <div className="text-[10px] text-navy-400">{label}</div>
      <div className="font-semibold text-navy-700 truncate">{value}</div>
    </div>
  )
}
