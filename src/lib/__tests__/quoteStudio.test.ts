import { describe, expect, it } from 'vitest'
import { buildQuoteText, emptyQuote, validateQuote, type QuoteInput } from '../quoteStudio'

const valid: QuoteInput = {
  ...emptyQuote, business: 'Alpha Repairs', customer: 'Ravi', service: 'AC servicing',
  details: 'Service three AC units', amount: '4500', validity: '7',
}

describe('browser-only quotation drafting', () => {
  it('builds an editable draft from supplied amounts only', () => {
    const result = buildQuoteText(valid)
    expect(result).toContain('Alpha Repairs')
    expect(result).toContain('Ravi')
    expect(result).toContain('₹4,500')
    expect(result).toContain('7 days')
    expect(result).toContain('review the scope')
  })
  it('never lets Claude change quoted amount or validity', () => {
    const result = buildQuoteText(valid, {
      introduction: 'Thanks for your enquiry.', scope: 'Carefully service three units.',
      closing: 'We hope to work together.',
    })
    expect(result).toContain('₹4,500')
    expect(result).toContain('7 days')
    expect(result).toContain('Carefully service three units.')
  })
  it.each(['gu','hi'] as const)('supports %s in document copy', language => {
    const result = buildQuoteText({ ...valid, language })
    expect(result).toContain(language === 'gu' ? 'ક્વોટેશન' : 'कोटेशन')
    expect(result).toContain('₹')
  })
  it('rejects invalid amounts, validity and long fields', () => {
    expect(validateQuote({ ...valid, amount: '-100' })).toMatch(/positive amount/)
    expect(validateQuote({ ...valid, amount: 'NaN' })).toMatch(/positive amount/)
    expect(validateQuote({ ...valid, validity: '200' })).toMatch(/1 and 90/)
    expect(validateQuote({ ...valid, customer: '' })).toMatch(/required/)
    expect(validateQuote({ ...valid, details: 'x'.repeat(1600) })).toMatch(/shorten/)
  })
})
