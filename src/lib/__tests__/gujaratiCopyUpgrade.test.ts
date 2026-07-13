import { describe, expect, it } from 'vitest'
import { buildDemoSeed } from '../demoSeed'
import { waTemplates } from '../whatsapp'
import { inr, fmtDate, fmtMonth } from '../format'
import { roleLabel } from '../permissions'

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
