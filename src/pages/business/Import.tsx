import { useMemo, useState } from 'react'
import { FileUp, Landmark, Upload } from 'lucide-react'
import { Badge, Button, Field, Select } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import { parseBankStatementCsv } from '../../lib/business/statementImport'
import type { ParsedStatementRow } from '../../lib/business/statementImport'

export default function BusinessImport() {
  const { data, canWrite, importTransactions } = useBusiness()
  const toast = useToast()
  const activeAccounts = data.accounts.filter(a => a.active)
  const bankAccounts = activeAccounts.filter(a => a.kind === 'bank')
  const [accountId, setAccountId] = useState(bankAccounts[0]?.id ?? activeAccounts[0]?.id ?? '')
  const [expenseCategoryId, setExpenseCategoryId] = useState(data.categories.find(c => c.active && c.name === 'Other / Miscellaneous')?.id ?? '')
  const [rows, setRows] = useState<ParsedStatementRow[]>([])
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)

  const totals = useMemo(() => ({
    moneyIn: rows.filter(r => r.direction === 'in').reduce((sum, r) => sum + r.amount, 0),
    moneyOut: rows.filter(r => r.direction === 'out').reduce((sum, r) => sum + r.amount, 0),
  }), [rows])

  const readFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseBankStatementCsv(text).slice(0, 500)
      setRows(parsed)
      setFileName(file.name)
      if (!parsed.length) toast.error('No debit/credit rows could be detected in this CSV.')
      else toast.success(String(parsed.length) + ' bank rows detected')
    } catch {
      toast.error('Could not read this CSV file.')
    }
  }

  const importNow = async () => {
    if (!canWrite || !accountId || rows.length === 0) return
    setBusy(true)
    try {
      const count = await importTransactions(rows.map(row => ({
        kind: row.direction === 'in' ? 'income' as const : 'expense' as const,
        amount: row.amount,
        accountId,
        categoryId: row.direction === 'out' ? (expenseCategoryId || null) : null,
        counterparty: row.description,
        note: 'Imported from bank statement: ' + fileName,
        occurredAt: row.date + 'T12:00:00',
        paymentStatus: row.direction === 'out' ? 'paid' as const : undefined,
        paidBy: row.direction === 'out' ? 'business' as const : undefined,
      })))
      toast.success(String(count) + ' statement rows imported')
      setRows([])
      setFileName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not import statement')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[17px] font-bold text-navy-900">Import bank statement</h1>
        <p className="text-[11.5px] text-navy-400">Upload a CSV from your bank. Prangan detects dates, narration and debit/credit amounts.</p>
      </div>

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 text-[11px] text-navy-600">
        Supported patterns include <strong>Date + Narration + Debit + Credit</strong> and <strong>Date + Description + Amount + Type</strong>. Review the preview before importing.
      </div>

      <Field label="Bank account">
        <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
          {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.kind}</option>)}
        </Select>
      </Field>

      <Field label="Default expense category" hint="You can recategorize individual transactions later.">
        <Select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)}>
          <option value="">No category</option>
          {data.categories.filter(c => c.active && c.kind !== 'income').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <label className="min-h-[64px] rounded-2xl border border-dashed border-saffron-300 bg-saffron-50 px-4 flex items-center justify-center gap-2 cursor-pointer text-[12.5px] font-bold text-saffron-800">
        <FileUp size={18} />
        {fileName || 'Choose bank CSV'}
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={e => void readFile(e.target.files?.[0] ?? null)} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Summary label="Detected money in" value={totals.moneyIn} />
            <Summary label="Detected money out" value={totals.moneyOut} />
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white overflow-hidden">
            {rows.slice(0, 30).map(row => (
              <div key={row.id} className="px-3 py-2.5 border-b border-cream-100 last:border-0 flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center shrink-0"><Landmark size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold text-navy-800 truncate">{row.description || 'Bank transaction'}</div>
                  <div className="text-[10px] text-navy-400">{new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN')}</div>
                </div>
                <Badge tone={row.direction === 'in' ? 'green' : 'red'}>{row.direction === 'in' ? 'IN' : 'OUT'}</Badge>
                <div className="num text-[12px] font-bold">{businessMoney(row.amount)}</div>
              </div>
            ))}
            {rows.length > 30 && <div className="px-3 py-2 text-center text-[10.5px] text-navy-400">+ {rows.length - 30} more rows</div>}
          </div>

          <Button full loading={busy} disabled={!canWrite || !accountId} onClick={importNow}><Upload size={15} /> Import {rows.length} rows</Button>
        </>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-white px-3 py-2">
      <div className="text-[9.5px] text-navy-400">{label}</div>
      <div className="num text-[14px] font-bold text-navy-900">{businessMoney(value)}</div>
    </div>
  )
}
