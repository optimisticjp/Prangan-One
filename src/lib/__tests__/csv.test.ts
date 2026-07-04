import { describe, it, expect } from 'vitest'
import { parseCsv, validateFlatImport } from '../csv'

describe('parseCsv', () => {
  it('parses a simple comma-separated file', () => {
    const rows = parseCsv('a,b,c\n1,2,3')
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']])
  })

  it('handles quoted fields containing a comma', () => {
    const rows = parseCsv('name,note\n"Shah, Ramesh",hello')
    expect(rows[1]).toEqual(['Shah, Ramesh', 'hello'])
  })

  it('handles an escaped quote inside a quoted field', () => {
    const rows = parseCsv('note\n"she said ""hi"""')
    expect(rows[1]).toEqual(['she said "hi"'])
  })

  it('handles a quoted field with an embedded newline', () => {
    const rows = parseCsv('note\n"line one\nline two"')
    expect(rows[1]).toEqual(['line one\nline two'])
  })

  it('handles CRLF line endings the same as LF', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n3,4')
    expect(rows).toEqual([['a', 'b'], ['1', '2'], ['3', '4']])
  })

  it('does not choke on a trailing newline', () => {
    const rows = parseCsv('a,b\n1,2\n')
    expect(rows).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('validateFlatImport', () => {
  const header = ['number', 'floor', 'ownerName', 'phone', 'email', 'occupancy', 'tenantName', 'tenantEmail', 'sqft']

  it('accepts a well-formed row and skips the header', () => {
    const rows = [header, ['101', '1', 'રમેશભાઈ', '9000000001', 'r@example.com', 'owner', '', '', '980']]
    const result = validateFlatImport(rows)
    expect(result.errors).toHaveLength(0)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0].number).toBe('101')
    expect(result.valid[0].occupancy).toBe('owner')
  })

  it('works even without a header row, treating every row as data', () => {
    const rows = [['205', '2', 'કિરણભાઈ', '9000000002', '', 'tenant', 'ભાડૂત નામ', '', '750']]
    const result = validateFlatImport(rows)
    expect(result.valid).toHaveLength(1)
  })

  it('flags a row with an empty flat number', () => {
    const rows = [header, ['', '1', 'નામ', '900', '', 'owner', '', '', '900']]
    const result = validateFlatImport(rows)
    expect(result.valid).toHaveLength(0)
    expect(result.errors[0].reason).toContain('ફ્લેટ નંબર')
  })

  it('flags a row with a non-numeric floor', () => {
    const rows = [header, ['101', 'ground', 'નામ', '900', '', 'owner', '', '', '900']]
    const result = validateFlatImport(rows)
    expect(result.errors).toHaveLength(1)
  })

  it('flags an invalid occupancy value instead of silently defaulting it', () => {
    const rows = [header, ['101', '1', 'નામ', '900', '', 'landlord', '', '', '900']]
    const result = validateFlatImport(rows)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('occupancy')
  })

  it('processes multiple rows independently, valid and invalid mixed', () => {
    const rows = [
      header,
      ['101', '1', 'નામ એક', '900', '', 'owner', '', '', '900'],
      ['', '2', 'નામ બે', '900', '', 'owner', '', '', '900'],
      ['103', '3', 'નામ ત્રણ', '900', '', 'tenant', 'ભાડૂત', '', '900'],
    ]
    const result = validateFlatImport(rows)
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
  })
})
