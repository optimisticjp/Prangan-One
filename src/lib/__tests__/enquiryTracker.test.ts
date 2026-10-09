import { describe, expect, it, vi } from 'vitest'
import {
  ENQUIRY_KEY, makeEnquiry, validEnquiryInput, readEnquiries,
  writeEnquiries, parseEnquiries, dueEnquiry, exportEnquiryBackup,
} from '../enquiryTracker'
const input = { customer: 'Ravi', contact: 'ravi@example.com', service: 'AC service', details: 'Three units', followUp: '2026-10-10' }
const first = makeEnquiry(input, 'id-1', '2026-10-09T12:00:00Z')
describe('opt-in local enquiry management', () => {
  it('validates and retains bounded customer data', () => {
    expect(validEnquiryInput({ ...input, customer: '' })).toMatch(/required/)
    expect(validEnquiryInput({ ...input, details: 'x'.repeat(1501) })).toMatch(/too long/)
    expect(validEnquiryInput({ ...input, followUp: '2026-foo' })).toMatch(/valid/)
    expect(makeEnquiry(input, 'id-1', '2026-10-09T12:00:00Z').status).toBe('new')
  })
  it('persists only when write is explicitly requested and restores the data', () => {
    const memory = new Map<string,string>()
    const storage = { getItem: vi.fn(k => memory.get(k) ?? null), setItem: vi.fn((k,v) => memory.set(k,v)) }
    expect(readEnquiries(storage)).toEqual([])
    writeEnquiries([first], storage)
    expect(storage.setItem).toHaveBeenCalledWith(ENQUIRY_KEY, expect.any(String))
    expect(readEnquiries(storage)).toEqual([first])
    expect(exportEnquiryBackup([first])).toContain('ravi@example.com')
  })
  it('rejects invalid or duplicated imported records', () => {
    expect(() => parseEnquiries('garbage')).toThrow()
    expect(() => parseEnquiries(JSON.stringify([first,first]))).toThrow(/Duplicate/)
    expect(() => parseEnquiries(JSON.stringify([{ ...first, details: 'x'.repeat(1600) }]))).toThrow(/Invalid/)
    expect(readEnquiries({getItem:()=>'{broken'})).toEqual([])
  })
  it('tracks due follow-ups and excludes closed enquiries', () => {
    expect(dueEnquiry(first,'2026-10-09')).toBe(false)
    expect(dueEnquiry(first,'2026-10-10')).toBe(true)
    expect(dueEnquiry({...first,status:'closed'},'2026-10-15')).toBe(false)
  })
})
