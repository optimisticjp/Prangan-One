/**
 * Opt-in local-only beta store. Never synchronizes to Supabase or sends
 * customer information to the Prangan servers. Do not use on shared devices.
 */
export const ENQUIRY_KEY = 'prangan_enquiries_beta_v1'
export type EnquiryStatus = 'new' | 'quoted' | 'follow_up' | 'closed'
export type EnquiryInput = {
  customer: string
  contact: string
  service: string
  details: string
  followUp: string
}
export type Enquiry = EnquiryInput & {
  id: string
  status: EnquiryStatus
  createdAt: string
  updatedAt: string
}
const statuses: EnquiryStatus[] = ['new', 'quoted', 'follow_up', 'closed']
const maximum = 100
const datePattern = /^\d{4}-\d{2}-\d{2}$/

export function validEnquiryInput(value: EnquiryInput): string | null {
  if (!value.customer.trim() || !value.service.trim()) return 'Customer and service are required.'
  if (value.customer.length > 120 || value.contact.length > 160 || value.service.length > 120 || value.details.length > 1500)
    return 'Some fields are too long.'
  if (value.followUp && (!datePattern.test(value.followUp) || Number.isNaN(Date.parse(value.followUp + 'T00:00:00Z'))))
    return 'Choose a valid follow-up date.'
  return null
}
export function makeEnquiry(input: EnquiryInput, id: string, now: string): Enquiry {
  const issue = validEnquiryInput(input)
  if (issue) throw new Error(issue)
  if (!id || id.length > 100 || Number.isNaN(Date.parse(now))) throw new Error('Invalid enquiry identifier or date.')
  return { ...input, customer: input.customer.trim(), contact: input.contact.trim(),
    service: input.service.trim(), details: input.details.trim(), id, status: 'new',
    createdAt: now, updatedAt: now }
}
function isEnquiry(x: unknown): x is Enquiry {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false
  const v = x as Partial<Enquiry>
  return typeof v.id === 'string' && v.id.length > 0 && v.id.length <= 100 &&
    typeof v.customer === 'string' && typeof v.contact === 'string' &&
    typeof v.service === 'string' && typeof v.details === 'string' &&
    typeof v.followUp === 'string' && !validEnquiryInput(v as EnquiryInput) &&
    statuses.includes(v.status as EnquiryStatus) &&
    typeof v.createdAt === 'string' && !Number.isNaN(Date.parse(v.createdAt)) &&
    typeof v.updatedAt === 'string' && !Number.isNaN(Date.parse(v.updatedAt))
}

export function parseEnquiries(raw: string): Enquiry[] {
  if (raw.length > 300_000) throw new Error('Backup is too large.')
  let input: unknown
  try { input = JSON.parse(raw) } catch { throw new Error('Not a valid enquiry backup.') }
  if (!Array.isArray(input) || input.length > maximum || input.some(x => !isEnquiry(x)))
    throw new Error('Invalid enquiry data or more than 100 records.')
  if (new Set(input.map(e => e.id)).size !== input.length) throw new Error('Duplicate enquiry identifiers.')
  return input.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
export function readEnquiries(storage: Pick<Storage, 'getItem'> = localStorage): Enquiry[] {
  const raw = storage.getItem(ENQUIRY_KEY)
  if (!raw) return []
  try { return parseEnquiries(raw) } catch { return [] }
}
export function writeEnquiries(items: Enquiry[], storage: Pick<Storage, 'setItem'> = localStorage): void {
  if (items.length > maximum) throw new Error('The beta supports up to 100 enquiries. Export or archive your list first.')
  storage.setItem(ENQUIRY_KEY, JSON.stringify(parseEnquiries(JSON.stringify(items))))
}
export function dueEnquiry(item: Enquiry, day: string): boolean {
  return item.status !== 'closed' && Boolean(item.followUp) && item.followUp <= day
}
export function exportEnquiryBackup(items: Enquiry[]): string {
  return JSON.stringify(parseEnquiries(JSON.stringify(items)), null, 2)
}
