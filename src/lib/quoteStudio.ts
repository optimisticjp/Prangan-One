/** No customer data is saved or transmitted until the user explicitly invokes AI. */
export type QuoteLanguage = 'en' | 'gu' | 'hi'
export interface QuoteInput {
  business: string
  customer: string
  service: string
  details: string
  amount: string
  validity: string
  language: QuoteLanguage
}
export interface QuotePolish { introduction: string; scope: string; closing: string }

export const emptyQuote: QuoteInput = {
  business: '', customer: '', service: '', details: '', amount: '', validity: '7', language: 'en',
}

export function validateQuote(input: QuoteInput): string | null {
  if (!input.business.trim() || !input.customer.trim() || !input.service.trim()) return 'Business, customer and service are required.'
  if ([input.business, input.customer, input.service].some(v => v.trim().length > 120) || input.details.length > 1500)
    return 'Please shorten the business, customer, service or job details.'
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000 || input.amount.trim() === '')
    return 'Enter a valid positive amount in INR.'
  const days = Number(input.validity)
  if (!Number.isInteger(days) || days < 1 || days > 90) return 'Validity must be between 1 and 90 days.'
  if (!['en', 'gu', 'hi'].includes(input.language)) return 'Choose a supported language.'
  return null
}

function money(value: string, language: QuoteLanguage) {
  return new Intl.NumberFormat(language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(Number(value))
}

const labels = {
  en: {
    title: 'QUOTATION', from: 'From', to: 'Prepared for', service: 'Service',
    scope: 'Scope of work', amount: 'Quoted total', validity: 'Valid for',
    days: 'days', note: 'This is a draft. Please review the scope, pricing and any applicable taxes before sharing.',
    fallback: 'Service details to be confirmed with the customer.',
    close: 'Thank you for considering us. Please contact us to confirm the next steps.',
  },
  gu: {
    title: 'ક્વોટેશન', from: 'તરફથી', to: 'ગ્રાહક', service: 'સેવા',
    scope: 'કામની વિગત', amount: 'કુલ અંદાજ', validity: 'માન્ય સમય',
    days: 'દિવસ', note: 'આ ડ્રાફ્ટ છે. મોકલતાં પહેલાં કામ, કિંમત અને લાગુ પડતા ટેક્સ તપાસો.',
    fallback: 'કામની વિગતો ગ્રાહક સાથે નક્કી કરવાની બાકી છે.',
    close: 'અમને તક આપવા બદલ આભાર. આગળની પ્રક્રિયા માટે સંપર્ક કરો.',
  },
  hi: {
    title: 'कोटेशन', from: 'व्यवसाय', to: 'ग्राहक', service: 'सेवा',
    scope: 'काम का विवरण', amount: 'कुल अनुमानित राशि', validity: 'मान्य अवधि',
    days: 'दिन', note: 'यह एक ड्राफ्ट है। भेजने से पहले काम, कीमत और लागू करों की जांच करें।',
    fallback: 'काम का विवरण ग्राहक के साथ तय होना बाकी है।',
    close: 'हमें अवसर देने के लिए धन्यवाद। अगले चरण की पुष्टि के लिए संपर्क करें।',
  },
} satisfies Record<QuoteLanguage, Record<string, string>>

/** Price and validity always come from the user's inputs, never the model. */
export function buildQuoteText(input: QuoteInput, polish?: QuotePolish): string {
  const error = validateQuote(input)
  if (error) throw new Error(error)
  const l = labels[input.language]
  const lines = [
    l.title, '',
    l.from + ': ' + input.business.trim(),
    l.to + ': ' + input.customer.trim(),
    l.service + ': ' + input.service.trim(), '',
  ]
  if (polish?.introduction?.trim()) lines.push(polish.introduction.trim(), '')
  lines.push(l.scope + ':', polish?.scope?.trim() || input.details.trim() || l.fallback, '')
  lines.push(l.amount + ': ' + money(input.amount, input.language))
  lines.push(l.validity + ': ' + Number(input.validity) + ' ' + l.days, '')
  lines.push(polish?.closing?.trim() || l.close, '', l.note)
  return lines.join('\n')
}
