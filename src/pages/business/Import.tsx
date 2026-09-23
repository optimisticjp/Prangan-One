import { useMemo, useState } from 'react'
import { FileUp, Landmark, Sparkles, Upload } from 'lucide-react'
import { Badge, Button, Field, Select } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import { businessMoney } from '../../lib/business/finance'
import {
  parseBankStatementCsv,
  rememberStatementCategoryRule,
  suggestStatementCategory,
} from '../../lib/business/statementImport'
import type { ParsedStatementRow } from '../../lib/business/statementImport'

type RowMeta = { categoryId: string; suggested: boolean; duplicate: boolean }

export default function BusinessImport() {
  const { data, canWrite, importTransactions } = useBusiness()
  const toast = useToast()
  const businessId = data.business?.id ?? ''
  const activeAccounts = data.accounts.filter(a => a.active)
  const bankAccounts = activeAccounts.filter(a => a.kind === 'bank')
  const [accountId, setAccountId] = useState(bankAccounts[0]?.id ?? activeAccounts[0]?.id ?? '')
  const [expenseCategoryId, setExpenseCategoryId] = useState(data.categories.find(c => c.active && c.name === 'Other / Miscellaneous')?.id ?? '')
  const [rows, setRows] = useState<ParsedStatementRow[]>([])
  const [rowMeta, setRowMeta] = useState<Record<string, RowMeta>>({})
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)

  const existingKeys = useMemo(() => new Set(
    data.transactions
      .filter(tx => !tx.reversed_at)
      .map(tx => [
        tx.occurred_at.slice(0, 10),
        tx.kind === 'income' ? 'in' : tx.kind === 'expense' ? 'out' : '',
        Number(tx.amount).toFixed(2),
        (tx.counterparty ?? '').trim().toLowerCase(),
      ].join('|')),
  ), [data.transactions])

  const importableRows = rows.filter(row => !rowMeta[row.id]?.duplicate)
  const totals = useMemo(() => ({
    moneyIn: importableRows.filter(r => r.direction === 'in').reduce((sum, r) => sum + r.amount, 0),
    moneyOut: importableRows.filter(r => r.direction === 'out').reduce((sum, r) => sum + r.amount, 0),
    duplicates: rows.filter(row => rowMeta[row.id]?.duplicate).length,
    suggested: rows.filter(row => rowMeta[row.id]?.suggested && !rowMeta[row.id]?.duplicate).length,
  }), [rows, rowMeta, importableRows])

  const readFile = async (file: File | null) => {
    if (!file) return
    try {
      const parsed = parseBankStatementCsv(await file.text()).slice(0, 500)
      const nextMeta: Record<string, RowMeta> = {}
      for (const row of parsed) {
        const suggestion = suggestStatementCategory(
          businessId,
          row.description,
          row.direction,
          data.transactions.map(tx => ({ counterparty: tx.counterparty, kind: tx.kind, category_id: tx.category_id })),
        )
        const key = [row.date, row.direction, row.amount.toFixed(2), row.description.trim().toLowerCase()].join('|')
        nextMeta[row.id] = {
          categoryId: suggestion.categoryId ?? (row.direction === 'out' ? expenseCategoryId : ''),
          suggested: !!suggestion.categoryId,
          duplicate: existingKeys.has(key),
        }
      }
      setRows(parsed)
      setRowMeta(nextMeta)
      setFileName(file.name)
      if (!parsed.length) toast.error('No debit/credit rows could be detected in this CSV.')
      else toast.success(String(parsed.length) + ' bank rows detected')
    } catch {
      toast.error('Could not read this CSV file.')
    }
  }

  const setCategory = (row: ParsedStatementRow, categoryId: string) => {
    setRowMeta(current => ({
      ...current,
      [row.id]: { ...(current[row.id] ?? { suggested: false, duplicate: false }), categoryId, suggested: false },
    }))
    if (businessId && categoryId) rememberStatementCategoryRule(businessId, row.description, row.direction, categoryId)
  }

  const importNow = async () => {
    if (!canWrite || !accountId || importableRows.length === 0) return
    setBusy(true)
    try {
      const count = await importTransactions(importableRows.map(row => ({
        kind: row.direction === 'in' ? 'income' as const : 'expense' as const,
        amount: row.amount,
        accountId,
        categoryId: rowMeta[row.id]?.categoryId || null,
        counterparty: row.description,
        note: 'Imported from bank statement: ' + fileName,
        occurredAt: row.date + 'T12:00:00',
        paymentStatus: 'paid' as const,
        paidBy: row.direction === 'out' ? 'business' as const : undefined,
      })))
      toast.success(String(count) + ' statement rows imported')
      setRows([])
      setRowMeta({})
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
        <h1 className="text-[17px] font-bold text-navy-900">Bank statement</h1>
        <p className="text-[11.5px] text-navy-400">Upload a CSV, check the rows, then save them as money entries.</p>
      </div>

      <div className="rounded-xl bg-navy-50 border border-navy-100 px-3 py-2.5 text-[11px] text-navy-600">
        Prangan understands common bank CSV layouts. It can suggest categories and flag likely duplicates, but you can check everything before saving.
      </div>

      <Field label="Which bank account is this statement for?">
        <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
          {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.kind}</option>)}
        </Select>
      </Field>

      <Field label="Category when Prangan is unsure" hint="Used only when Prangan cannot suggest a category.">
        <Select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)}>
          <option value="">No category</option>
          {data.categories.filter(c => c.active && c.kind !== 'income').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <label className="min-h-[64px] rounded-xl border border-dashed border-saffron-300 bg-saffron-50 px-4 flex items-center justify-center gap-2 cursor-pointer text-[12.5px] font-bold text-saffron-800">
        <FileUp size={18} /> {fileName || 'Choose bank CSV'}
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={e => void readFile(e.target.files?.[0] ?? null)} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Summary label="Money in" value={totals.moneyIn} />
            <Summary label="Money out" value={totals.moneyOut} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {totals.suggested > 0 && <Badge tone="blue">{totals.suggested} SUGGESTED</Badge>}
            {totals.duplicates > 0 && <Badge tone="amber">{totals.duplicates} POSSIBLE DUPLICATES SKIPPED</Badge>}
          </div>

          <div className="rounded-xl border border-cream-200 bg-white overflow-hidden">
            {rows.slice(0, 50).map(row => {
              const meta = rowMeta[row.id]
              return (
                <div key={row.id} className={'px-3 py-2.5 border-b border-cream-100 last:border-0 ' + (meta?.duplicate ? 'opacity-55 bg-cream-50' : '')}>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center shrink-0"><Landmark size={14} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-semibold text-navy-800 truncate">{row.description || 'Bank transaction'}</div>
                      <div className="text-[10px] text-navy-400">{new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN')}</div>
                    </div>
                    {meta?.duplicate ? <Badge tone="amber">SKIP</Badge> : meta?.suggested ? <Badge tone="blue"><Sparkles size={10} /> MATCH</Badge> : <Badge tone={row.direction === 'in' ? 'green' : 'red'}>{row.direction === 'in' ? 'IN' : 'OUT'}</Badge>}
                    <div className="num text-[12px] font-bold">{businessMoney(row.amount)}</div>
                  </div>
                  {!meta?.duplicate && (
                    <div className="mt-2 pl-10">
                      <Select value={meta?.categoryId ?? ''} onChange={e => setCategory(row, e.target.value)} className="!min-h-[36px] !text-[11px]">
                        <option value="">No category</option>
                        {data.categories.filter(c => c.active && (row.direction === 'in' ? c.kind !== 'expense' : c.kind !== 'income')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </div>
                  )}
                </div>
              )
            })}
            {rows.length > 50 && <div className="px-3 py-2 text-center text-[10.5px] text-navy-400">+ {rows.length - 50} more rows</div>}
          </div>

          <Button full loading={busy} disabled={!canWrite || !accountId || importableRows.length === 0} onClick={importNow}>
            <Upload size={15} /> Import {importableRows.length} reviewed rows
          </Button>
        </>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-cream-200 bg-white px-3 py-2"><div className="text-[9.5px] text-navy-400">{label}</div><div className="num text-[14px] font-bold text-navy-900">{businessMoney(value)}</div></div>
}
