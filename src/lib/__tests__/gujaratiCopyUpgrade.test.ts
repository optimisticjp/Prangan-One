import { describe, expect, it } from 'vitest'
import { buildDemoSeed } from '../demoSeed'
import { waTemplates } from '../whatsapp'
import { inr, fmtDate, fmtMonth } from '../format'
import { roleLabel } from '../permissions'
import { buildCsvBody, exportCsv, parseCsv } from '../csv'

const GUJARATI_DIGITS = /[૦૧૨૩૪૫૬૭૮૯]/

describe('demo seed notices use Western digits for dates and times', () => {
  const seed = buildDemoSeed()

  it('no seeded notice body contains Gujarati numerals', () => {
    for (const n of seed.notices) {
      expect(n.body, `notice ${n.id} still has Gujarati digits: ${n.body}`).not.toMatch(GUJARATI_DIGITS)
    }
  })

  it('keeps the three specific converted notices, now in Western digits', () => {
    const bodies = seed.notices.map(n => n.body)
    expect(bodies.some(b => b.includes('તા. 10 સુધીમાં ચૂકવો'))).toBe(true)
    expect(bodies.some(b => b.includes('સવારે 10 થી 12'))).toBe(true)
    expect(bodies.some(b => b.includes('15 ઓગસ્ટે'))).toBe(true)
  })

  it('standardises politeness to કૃપા કરીને in the converted bill notice', () => {
    const billNotice = seed.notices.find(n => n.body.includes('તા. 10 સુધીમાં ચૂકવો'))
    expect(billNotice?.body).toContain('કૃપા કરીને')
  })
})

describe('WhatsApp templates interpolate every placeholder cleanly', () => {
  it('the new-notice template renders the real society name, with no broken placeholder', () => {
    const out = waTemplates.newNotice('સહજ રેસિડેન્સી', 'પાણી બંધ રહેશે')
    expect(out).toContain('સહજ રેસિડેન્સી')
    expect(out).toContain('પાણી બંધ રહેશે')
    // The audit showed "$s{ocietyName}"; the real source must resolve fully.
    expect(out).not.toContain('${')
    expect(out).not.toContain('$s{')
    expect(out).not.toContain('societyName')
  })

  it('the reminder and receipt templates keep name, flat, amount and receipt number exact', () => {
    const reminder = waTemplates.maintenanceReminder('સહજ રેસિડેન્સી', 'કિરણભાઈ', 'A-101', 1200, '2026-07')
    expect(reminder).toContain('કિરણભાઈ')
    expect(reminder).toContain('A-101')
    expect(reminder).toContain('₹1,200')
    expect(reminder).not.toContain('${')

    const receipt = waTemplates.paymentReceived('સહજ રેસિડેન્સી', 'કિરણભાઈ', 'A-101', 1200, 'RJH-2026-0042')
    expect(receipt).toContain('RJH-2026-0042')
    expect(receipt).toContain('₹1,200')
    expect(receipt).not.toContain('${')
  })

  it('the complaint-update and meeting-reminder templates interpolate their placeholders too', () => {
    const complaint = waTemplates.complaintUpdate('સહજ રેસિડેન્સી', 'લિફ્ટ બંધ', 'ઉકેલાઈ')
    expect(complaint).toContain('સહજ રેસિડેન્સી')
    expect(complaint).toContain('લિફ્ટ બંધ')
    expect(complaint).toContain('ઉકેલાઈ')
    expect(complaint).not.toContain('${')

    const meeting = waTemplates.meetingReminder('સહજ રેસિડેન્સી', 'કિરણભાઈ', '2026-08-15')
    expect(meeting).toContain('કિરણભાઈ')
    expect(meeting).toContain('15 ઓગસ્ટ 2026')
    expect(meeting).not.toContain('${')
  })
})

describe('CSV export keeps Gujarati readable, uses નિષ્ફળ, and preserves the UTF-8 BOM', () => {
  const headers = ['રસીદ નં', 'સ્થિતિ', 'રકમ']
  const rows: (string | number)[][] = [['RJH-2026-0007', 'નિષ્ફળ', 1200], ['RJH-2026-0008', 'સફળ', 499]]

  it('round-trips Gujarati headers and values, including the failed-status term', () => {
    const body = buildCsvBody(headers, rows)
    const parsed = parseCsv(body)
    expect(parsed[0]).toEqual(headers)
    expect(parsed[1]).toEqual(['RJH-2026-0007', 'નિષ્ફળ', '1200'])
    // The failed-payment status uses the professional term, never "ફેલ".
    expect(body).toContain('નિષ્ફળ')
    expect(body).not.toContain('ફેલ')
  })

  it('exportCsv prepends the UTF-8 BOM so Excel opens Gujarati correctly', async () => {
    const created: Blob[] = []
    const origCreate = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    URL.createObjectURL = ((b: Blob) => { created.push(b); return 'blob:mock' }) as typeof URL.createObjectURL
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL
    try {
      exportCsv('failed-payments.csv', headers, rows)
      expect(created).toHaveLength(1)
      // The blob's raw bytes must start with the UTF-8 BOM (EF BB BF) so Excel
      // detects UTF-8. (Blob.text() decodes and strips the BOM, so assert bytes.)
      const bytes = new Uint8Array(await created[0].arrayBuffer())
      expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
      const text = await created[0].text()
      expect(text).toContain('નિષ્ફળ')
      expect(text).toContain('રસીદ નં')
    } finally {
      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
    }
  })
})

describe('formatters render Western digits for money and dates', () => {
  it('currency uses Western digits with Indian grouping', () => {
    expect(inr(499)).toBe('₹499')
    expect(inr(1200)).toBe('₹1,200')
    expect(inr(499)).not.toMatch(GUJARATI_DIGITS)
  })

  it('dates keep Gujarati month names but Western day/year digits', () => {
    expect(fmtDate('2026-07-05')).toBe('5 જુલાઈ 2026')
    expect(fmtMonth('2026-08')).toBe('ઓગસ્ટ 2026')
    expect(fmtDate('2026-07-05')).not.toMatch(GUJARATI_DIGITS)
  })
})

describe('the auditor role label uses ફક્ત, not માત્ર', () => {
  it('reads "ઓડિટર (ફક્ત જોવા માટે)"', () => {
    expect(roleLabel.auditor).toBe('ઓડિટર (ફક્ત જોવા માટે)')
    expect(roleLabel.auditor).not.toContain('માત્ર')
  })
})
