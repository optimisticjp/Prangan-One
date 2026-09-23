export interface ParsedStatementRow {
  id: string
  date: string
  description: string
  amount: number
  direction: 'in' | 'out'
}

const splitCsvLine = (line: string, delimiter: string) => {
  const out: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (ch === delimiter && !quoted) {
      out.push(value.trim())
      value = ''
    } else {
      value += ch
    }
  }
  out.push(value.trim())
  return out
}

const amountValue = (value: string) => {
  const normalized = value.replace(/[₹,\s]/g, '').replace(/[()]/g, match => match === '(' ? '-' : '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0
}

const normalizeDate = (value: string) => {
  const raw = value.trim()
  const indian = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (indian) {
    const year = indian[3].length === 2 ? '20' + indian[3] : indian[3]
    return `${year}-${indian[2].padStart(2, '0')}-${indian[1].padStart(2, '0')}`
  }
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10)
}

export function parseBankStatementCsv(text: string): ParsedStatementRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const headers = splitCsvLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())

  const find = (...names: string[]) => headers.findIndex(h => names.some(name => h.includes(name)))
  const dateIndex = find('date', 'txn date', 'transaction date', 'value date')
  const descriptionIndex = find('description', 'narration', 'particular', 'remarks', 'details')
  const debitIndex = find('debit', 'withdrawal', 'withdraw')
  const creditIndex = find('credit', 'deposit')
  const amountIndex = find('amount')
  const typeIndex = find('type', 'dr cr', 'transaction type')

  const rows: ParsedStatementRow[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter)
    const debit = debitIndex >= 0 ? amountValue(cells[debitIndex] ?? '') : 0
    const credit = creditIndex >= 0 ? amountValue(cells[creditIndex] ?? '') : 0
    let amount = debit || credit
    let direction: 'in' | 'out' = credit > 0 ? 'in' : 'out'

    if (!amount && amountIndex >= 0) {
      amount = amountValue(cells[amountIndex] ?? '')
      const type = (cells[typeIndex] ?? '').toLowerCase()
      direction = /credit|cr|deposit|received|in/.test(type) ? 'in' : 'out'
      if (!type && Number((cells[amountIndex] ?? '').replace(/[₹,\s]/g, '')) > 0) direction = 'in'
    }

    if (!amount) continue
    rows.push({
      id: crypto.randomUUID(),
      date: normalizeDate(dateIndex >= 0 ? cells[dateIndex] ?? '' : ''),
      description: descriptionIndex >= 0 ? (cells[descriptionIndex] ?? '').trim() : 'Bank statement',
      amount,
      direction,
    })
  }
  return rows
}


export interface StatementCategoryRule {
  key: string
  direction: 'in' | 'out'
  categoryId: string
}

const RULE_PREFIX = 'prangan-business-statement-rules:'

export const normalizeStatementDescription = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function getStatementCategoryRules(businessId: string): StatementCategoryRule[] {
  try {
    const raw = localStorage.getItem(RULE_PREFIX + businessId)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StatementCategoryRule[]
    return Array.isArray(parsed)
      ? parsed.filter(rule => !!rule?.key && !!rule?.categoryId && (rule.direction === 'in' || rule.direction === 'out')).slice(0, 250)
      : []
  } catch {
    return []
  }
}

export function rememberStatementCategoryRule(
  businessId: string,
  description: string,
  direction: 'in' | 'out',
  categoryId: string,
) {
  if (!businessId || !categoryId) return
  const key = normalizeStatementDescription(description)
  if (key.length < 3) return
  const current = getStatementCategoryRules(businessId).filter(rule => !(rule.key === key && rule.direction === direction))
  current.unshift({ key, direction, categoryId })
  localStorage.setItem(RULE_PREFIX + businessId, JSON.stringify(current.slice(0, 250)))
}

export function suggestStatementCategory(
  businessId: string,
  description: string,
  direction: 'in' | 'out',
  history: Array<{ counterparty: string | null; kind: string; category_id: string | null }>,
): { categoryId: string | null; source: 'rule' | 'history' | null } {
  const key = normalizeStatementDescription(description)
  if (!key) return { categoryId: null, source: null }

  const rule = getStatementCategoryRules(businessId).find(item => item.direction === direction && item.key === key)
  if (rule) return { categoryId: rule.categoryId, source: 'rule' }

  const matchingKinds = direction === 'in' ? new Set(['income', 'refund']) : new Set(['expense', 'personal_expense'])
  const historical = history.find(item =>
    !!item.category_id
    && matchingKinds.has(item.kind)
    && normalizeStatementDescription(item.counterparty ?? '') === key
  )
  return historical?.category_id
    ? { categoryId: historical.category_id, source: 'history' }
    : { categoryId: null, source: null }
}
