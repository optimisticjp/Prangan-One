/**
 * The actual escaping and formula-injection guard, pulled out from
 * exportCsv below so it's directly testable - exportCsv itself is DOM
 * side effects (document.createElement, Blob, URL.createObjectURL),
 * not logic worth re-testing, and used to be the only place this logic
 * lived at all, meaning it was never actually tested.
 */
export function buildCsvBody(headers: string[], rows: (string | number | undefined)[][]): string {
  const esc = (v: string | number | undefined) => {
    let s = v === undefined || v === null ? '' : String(v)
    // Formula-injection guard: a cell whose text starts with one of these
    // could execute as a formula the moment a committee member opens
    // this file in Excel - and they will, that's what the BOM in
    // exportCsv below is for. Resident-entered text (a complaint title,
    // a name) is exactly the kind of thing that could start with one of
    // these by accident or on purpose. A leading apostrophe is the
    // standard fix: both Excel and Google Sheets treat it as "this is
    // text," not part of the value itself.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return /["\,\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  return [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
}

// CSV export with UTF-8 BOM so Gujarati opens correctly in Excel.
export function exportCsv(filename: string, headers: string[], rows: (string | number | undefined)[][]) {
  const body = buildCsvBody(headers, rows)
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
export function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * Minimal CSV parser: handles quoted fields, embedded commas, embedded
 * newlines inside quotes, and "" as an escaped quote. Pure function, no
 * DOM/File API - see src/lib/__tests__/csv.test.ts for real unit tests.
 * Not a full RFC 4180 implementation, but covers what a member-list
 * export from Excel/Google Sheets actually produces.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }

  // Normalize line endings so \r\n and \r both behave like \n.
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      pushField()
    } else if (c === '\n') {
      pushRow()
    } else {
      field += c
    }
  }
  // Final field/row, if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) pushRow()
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
}

export interface FlatImportRow {
  number: string; floor: number; ownerName: string; phone: string; email?: string
  occupancy: 'owner' | 'tenant'; tenantName?: string; tenantEmail?: string; sqft: number
}
export interface FlatImportResult {
  valid: FlatImportRow[]
  errors: { rowIndex: number; raw: string[]; reason: string }[]
}

/**
 * Expected header order: number, floor, ownerName, phone, email, occupancy,
 * tenantName, tenantEmail, sqft. Header row is required and checked
 * loosely (case/whitespace-insensitive on the first column only, just
 * enough to detect "this doesn't look like our template").
 */
export function validateFlatImport(rows: string[][]): FlatImportResult {
  const valid: FlatImportRow[] = []
  const errors: FlatImportResult['errors'] = []
  if (rows.length === 0) return { valid, errors: [{ rowIndex: 0, raw: [], reason: 'ફાઈલ ખાલી છે' }] }

  const body = rows[0][0]?.trim().toLowerCase() === 'number' ? rows.slice(1) : rows
  body.forEach((r, idx) => {
    const [number, floorStr, ownerName, phone, email, occupancyRaw, tenantName, tenantEmail, sqftStr] = r
    const rowIndex = idx + 1
    if (!number?.trim()) { errors.push({ rowIndex, raw: r, reason: 'ફ્લેટ નંબર ખાલી છે' }); return }
    if (!ownerName?.trim()) { errors.push({ rowIndex, raw: r, reason: 'માલિકનું નામ ખાલી છે' }); return }
    const floor = Number(floorStr)
    if (!Number.isFinite(floor)) { errors.push({ rowIndex, raw: r, reason: 'માળ સંખ્યા નથી' }); return }
    const occupancy = (occupancyRaw ?? 'owner').trim().toLowerCase()
    if (occupancy !== 'owner' && occupancy !== 'tenant') { errors.push({ rowIndex, raw: r, reason: 'occupancy "owner" કે "tenant" જ હોવું જોઈએ' }); return }
    valid.push({
      number: number.trim(), floor, ownerName: ownerName.trim(), phone: (phone ?? '').trim(),
      email: email?.trim() || undefined, occupancy: occupancy as 'owner' | 'tenant',
      tenantName: tenantName?.trim() || undefined, tenantEmail: tenantEmail?.trim() || undefined,
      sqft: Number(sqftStr) || 0,
    })
  })
  return { valid, errors }
}
