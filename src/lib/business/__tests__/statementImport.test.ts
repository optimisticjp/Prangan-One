import { describe, expect, it } from 'vitest'
import { normalizeStatementDescription, parseBankStatementCsv, rememberStatementCategoryRule, suggestStatementCategory } from '../statementImport'

describe('bank statement parser', () => {
  it('parses debit and credit columns from a common Indian bank CSV shape', () => {
    const rows = parseBankStatementCsv([
      'Date,Narration,Debit,Credit',
      '21/09/2026,Google Ads,1200,',
      '21/09/2026,Customer receipt,,5000',
    ].join('\n'))

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: '2026-09-21', description: 'Google Ads', amount: 1200, direction: 'out' })
    expect(rows[1]).toMatchObject({ date: '2026-09-21', description: 'Customer receipt', amount: 5000, direction: 'in' })
  })

  it('parses amount plus transaction type columns', () => {
    const rows = parseBankStatementCsv([
      'Transaction Date,Description,Amount,Type',
      '20/09/2026,Courier,450,Debit',
      '20/09/2026,Marketplace settlement,9000,Credit',
    ].join('\n'))

    expect(rows.map(row => [row.amount, row.direction])).toEqual([[450, 'out'], [9000, 'in']])
  })

  it('normalizes changing numeric references out of recurring narrations', () => {
    expect(normalizeStatementDescription('UPI/987654321/XYZ PACKAGING')).toBe('upi xyz packaging')
    expect(normalizeStatementDescription('UPI/123456789/XYZ PACKAGING')).toBe('upi xyz packaging')
  })

  it('remembers a per-business narration category rule', () => {
    localStorage.clear()
    rememberStatementCategoryRule('b1', 'XYZ Packaging 987654', 'out', 'packaging')
    expect(suggestStatementCategory('b1', 'XYZ Packaging 123456', 'out', [])).toEqual({ categoryId: 'packaging', source: 'rule' })
    expect(suggestStatementCategory('b2', 'XYZ Packaging 123456', 'out', [])).toEqual({ categoryId: null, source: null })
  })

  it('handles quoted descriptions containing commas', () => {
    const rows = parseBankStatementCsv('Date,Description,Debit,Credit\n21/09/2026,"Courier, Ahmedabad",250,')
    expect(rows[0].description).toBe('Courier, Ahmedabad')
  })
})
