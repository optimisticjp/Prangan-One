/**
 * The demo's canonical seed: Sahaj Residency, a fictional 64-flat society in
 * Vesu, Surat. Everything here is invented - names, phone numbers, balances,
 * every rupee. Synthetic ids throughout (demo-society-001, demo-flat-101,
 * ...), never the uid()/realUid() shapes real or local-fallback records use,
 * so a demo record can never collide with, or be mistaken for, a real one.
 *
 * This replaces the earlier deliberately-minimal three-flat seed with the
 * final content the plan always intended. It is built to be internally
 * consistent, not approximate: the flats are generated in a loop, and the
 * financial disorder (overdue flats, a pending verification, partial
 * payments, arrears) is described in one small table below so the totals are
 * easy to read and verify. The outstanding across the whole society sums to
 * exactly Rs 18,400 - proven, not eyeballed, in demoSeed.test.ts.
 *
 * The guided payment and complaint journeys still work against this unchanged:
 * they pick their target flat and bill dynamically (the payment journey takes
 * the first flat with a genuinely unpaid bill, which flat 101 below is on
 * purpose; the complaint journey targets flats[0], also 101). None of the
 * seeded complaints use the guide's own complaint title, so the guide's "file
 * a complaint" step starts genuinely not-done.
 */
import type {
  Bill, Complaint, Contact, DB, Doc, Expense, Flat, Notice,
  PayMode, Payment, Poll, Society, SocietyEvent, Vehicle, Vendor,
} from './types'

// Bumped from 1: the seed's shape and content changed substantially, so any
// browser still holding the old three-flat demo state resets to this one
// automatically rather than lingering in a shape this seed no longer matches.
export const DEMO_SCHEMA_VERSION = 2

const SOCIETY_ID = 'demo-society-001'
const MAINT = 1200
const CURRENT_MONTH = '2026-07'
const dueOf = (month: string) => `${month}-10`

const society: Society = {
  id: SOCIETY_ID, name: 'સહજ રેસિડન્સી', nameEn: 'Sahaj Residency',
  address: 'સહજ રેસિડન્સી, વેસુ, સુરત', city: 'સુરત', area: 'વેસુ',
  slug: 'sahaj-residency', joinCode: 'SAHAJ01',
  maintenanceAmount: MAINT, dueDay: 10, upiId: 'sahajresidency@upi',
  plan: 'pro', flatsLimit: 80, receiptPrefix: 'SR', themeKey: 'navy-saffron',
  supportPhone: '99999 00000', createdAt: '2020-04-01', receiptSeq: 61,
  tenantAccess: 'full', subscriptionStatus: 'active',
  modules: {
    ownerEnabled: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
    adminVisible: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
  },
}

// Deterministic name pools, picked by index so the 64 flats read as varied,
// real people rather than 64 near-identical rows - and with no randomness, so
// the seed is byte-for-byte identical every run and the tests stay stable.
const FIRST_NAMES = [
  'રમેશ', 'સુરેશ', 'મહેશ', 'દિનેશ', 'જયેશ', 'હિતેશ', 'નિલેશ', 'પ્રકાશ',
  'કિરણ', 'અલ્પેશ', 'ભાવેશ', 'ચેતન', 'ધર્મેશ', 'ગૌરવ', 'હાર્દિક', 'જિગ્નેશ',
  'મનીષ', 'નયન', 'પરેશ', 'રાજેશ', 'સંજય', 'તુષાર', 'વિપુલ', 'યોગેશ',
]
const SURNAMES = [
  'પટેલ', 'શાહ', 'દેસાઈ', 'મહેતા', 'જોષી', 'ત્રિવેદી', 'પરમાર', 'ચૌહાણ',
  'રાણા', 'ગાંધી', 'વ્યાસ', 'ઠક્કર',
]
const TENANT_FIRST = ['વિશાલ', 'અમિત', 'રોહિત', 'સુમિત', 'નિકુંજ', 'પ્રીતિ', 'સ્નેહા', 'કાજલ']

// The six flats carrying genuine disorder, by flat number. Every other flat is
// paid up on the current month. july = how much of this month's 1200 bill is
// already paid (0 = fully unpaid; a value strictly between 0 and 1200 = partly
// paid). arrears = earlier months left fully unpaid. pendingUpi = a resident
// "I have paid" UPI claim still waiting on the committee, which does not touch
// the bill's paid amount until it's confirmed.
//
// Outstanding each of these carries (max(0, amount - paid), summed over the
// flat's bills), which is what the whole-society total below adds up from:
//   101: 1200                    (this month only, fully unpaid)   <- journeys' target
//   305: 1200 + 1200      = 2400 (this month + June, plus a pending claim)
//   402: 700  + 1200      = 1900 (this month part-paid + June)
//   508: 900  + 1200      = 2100 (this month part-paid + June)
//   607: 1200 x 4         = 4800 (this month + three months back)
//   803: 1200 x 5         = 6000 (this month + four months back)
//   ----------------------------
//   total                = 18400
interface Disorder { july: number; arrears: string[]; pendingUpi?: boolean }
const DISORDER: Record<string, Disorder> = {
  '101': { july: 0, arrears: [] },
  '305': { july: 0, arrears: ['2026-06'], pendingUpi: true },
  '402': { july: 500, arrears: ['2026-06'] },
  '508': { july: 300, arrears: ['2026-06'] },
  '607': { july: 0, arrears: ['2026-06', '2026-05', '2026-04'] },
  '803': { july: 0, arrears: ['2026-06', '2026-05', '2026-04', '2026-03'] },
}

const payModeCycle: PayMode[] = ['upi', 'cash', 'upi', 'bank']

function buildFlatsBillsPayments() {
  const flats: Flat[] = []
  const currentBills: Bill[] = []
  const arrearsBills: Bill[] = []
  const payments: Payment[] = []
  let receiptSeq = 1
  let idx = 0

  for (let floor = 1; floor <= 8; floor++) {
    for (let unit = 1; unit <= 8; unit++) {
      const number = `${floor}${String(unit).padStart(2, '0')}` // 101..808
      // A scattering of tenant-occupied flats, but never flat 101 - the
      // journeys enter 101 as a resident owner, so keep it owner-occupied.
      const isTenant = idx % 6 === 3 && number !== '101'
      const ownerName = `${FIRST_NAMES[idx % FIRST_NAMES.length]} ${SURNAMES[(idx * 3) % SURNAMES.length]}`
      const phoneBase = String(9876500000 + idx * 111)
      const phone = `${phoneBase.slice(0, 5)} ${phoneBase.slice(5, 10)}`

      flats.push({
        id: `demo-flat-${number}`, societyId: SOCIETY_ID, number, floor,
        ownerName, phone, email: `owner.${number}@example.com`,
        occupancy: isTenant ? 'tenant' : 'owner',
        sqft: 900 + (unit <= 2 ? 350 : unit <= 4 ? 150 : 0) + (floor >= 6 ? 100 : 0),
        memberSince: 2015 + (idx % 10),
        ...(isTenant
          ? { tenantName: `${TENANT_FIRST[idx % TENANT_FIRST.length]} ${SURNAMES[(idx * 5) % SURNAMES.length]}`, tenantEmail: `tenant.${number}@example.com` }
          : {}),
      })

      const flatId = `demo-flat-${number}`
      const d = DISORDER[number]
      const julyPaid = d ? d.july : MAINT
      const julyBillId = `demo-bill-${CURRENT_MONTH}-${number}`
      currentBills.push({ id: julyBillId, societyId: SOCIETY_ID, flatId, month: CURRENT_MONTH, amount: MAINT, paidAmount: julyPaid, dueDate: dueOf(CURRENT_MONTH) })

      // A real receipt for whatever's genuinely been paid this month (full for
      // a settled flat, the part-payment for a partially paid one). The fully
      // unpaid flats get no payment record at all, which is exactly why flat
      // 101 is a clean journey target: nothing already sitting against its bill.
      if (julyPaid > 0) {
        payments.push({
          id: `demo-payment-${CURRENT_MONTH}-${number}`, societyId: SOCIETY_ID, flatId, billId: julyBillId,
          date: `${CURRENT_MONTH}-0${(idx % 8) + 1}`, amount: julyPaid, mode: payModeCycle[idx % payModeCycle.length],
          receiptNo: `SR-2026-${String(receiptSeq).padStart(4, '0')}`, status: 'success',
        })
        receiptSeq++
      }
      // The one pending "I have paid" UPI claim - bill stays unpaid until the
      // committee confirms it, so it still counts as outstanding above.
      if (d?.pendingUpi) {
        payments.push({
          id: `demo-payment-pending-${number}`, societyId: SOCIETY_ID, flatId, billId: julyBillId,
          date: '2026-07-09', amount: MAINT, mode: 'upi', refNo: 'UPI2026070900912', status: 'pending_confirmation',
          note: 'ગૂગલ પે થી ભર્યું છે, સ્ક્રીનશોટ મોકલ્યો છે',
        })
      }
      for (const month of d?.arrears ?? []) {
        arrearsBills.push({ id: `demo-bill-${month}-${number}`, societyId: SOCIETY_ID, flatId, month, amount: MAINT, paidAmount: 0, dueDate: dueOf(month) })
      }
      idx++
    }
  }

  return { flats, bills: [...currentBills, ...arrearsBills], payments }
}

const { flats, bills, payments } = buildFlatsBillsPayments()
const nameOf = (number: string) => flats.find(f => f.number === number)?.ownerName ?? 'રહેવાસી'

// Three complaints, each in a different status, so the list shows real
// variety. None uses the guide's own complaint title, so the guided complaint
// journey still starts from a genuinely empty state.
const complaints: Complaint[] = [
  {
    id: 'demo-complaint-001', societyId: SOCIETY_ID, flatId: 'demo-flat-204', category: 'પ્લમ્બિંગ',
    title: 'બાથરૂમનો નળ લીક થાય છે', detail: 'છેલ્લા અઠવાડિયાથી ટપકે છે, પાણી બગડે છે.', priority: 'normal',
    status: 'new', createdAt: '2026-07-09', hasPhoto: false, internalNotes: [],
    timeline: [{ date: '2026-07-09', status: 'new', by: nameOf('204') }], visibility: 'personal',
  },
  {
    id: 'demo-complaint-002', societyId: SOCIETY_ID, flatId: 'demo-flat-506', category: 'લિફ્ટ',
    title: 'લિફ્ટ વારંવાર બંધ પડી જાય છે', detail: 'દિવસમાં બે-ત્રણ વાર અટકી જાય છે, જોખમી છે.', priority: 'urgent',
    status: 'assigned', assignedTo: 'સ્કાય લિફ્ટ સર્વિસ', createdAt: '2026-07-05', hasPhoto: false,
    internalNotes: ['સ્કાય લિફ્ટ સર્વિસને ફોન કરી જાણ કરી છે.'],
    timeline: [
      { date: '2026-07-05', status: 'new', by: nameOf('506') },
      { date: '2026-07-06', status: 'assigned', note: 'ટેકનિશિયનને સોંપ્યું', by: 'કમિટી' },
    ], visibility: 'community',
  },
  {
    id: 'demo-complaint-003', societyId: SOCIETY_ID, flatId: 'demo-flat-702', category: 'સફાઈ',
    title: 'સીડી પર કચરો પડ્યો રહે છે', detail: 'ત્રીજા માળની સીડી પર રોજ કચરો રહે છે.', priority: 'normal',
    status: 'done', createdAt: '2026-06-27', hasPhoto: false, internalNotes: [],
    timeline: [
      { date: '2026-06-27', status: 'new', by: nameOf('702') },
      { date: '2026-06-28', status: 'assigned', note: 'હાઉસકીપિંગને જાણ કરી', by: 'કમિટી' },
      { date: '2026-06-29', status: 'inprogress', by: 'કમિટી' },
      { date: '2026-06-30', status: 'done', note: 'સફાઈ કરાવી, રોજ ધ્યાન રખાશે', by: 'કમિટી' },
    ], feedback: { rating: 5, comment: 'ઝડપથી ઉકેલાયું, આભાર' }, visibility: 'community',
  },
]

// One lift AMC whose renewal is coming up (amcEnd about a month out), plus a
// couple of standing contracts, so the vendors page shows a real renewal to
// act on rather than an empty list.
const vendors: Vendor[] = [
  { id: 'demo-vendor-001', societyId: SOCIETY_ID, name: 'સ્કાય લિફ્ટ સર્વિસ', service: 'લિફ્ટ AMC', contactPerson: 'મનોજ પટેલ', phone: '98250 11111', amcStart: '2025-08-15', amcEnd: '2026-08-14', notes: 'વાર્ષિક લિફ્ટ મેન્ટેનન્સ કરાર, રિન્યુઅલ નજીક છે' },
  { id: 'demo-vendor-002', societyId: SOCIETY_ID, name: 'શ્રી સિક્યુરિટી સર્વિસીસ', service: 'સિક્યુરિટી ગાર્ડ', contactPerson: 'રાજુભાઈ સોલંકી', phone: '98250 22222', amcStart: '2026-01-01', amcEnd: '2026-12-31' },
  { id: 'demo-vendor-003', societyId: SOCIETY_ID, name: 'ગ્રીન ગાર્ડન કેર', service: 'બાગકામ', contactPerson: 'સુનિલ મકવાણા', phone: '98250 33333', notes: 'મહિને બે વાર' },
]

// A handful of genuine recent running costs, not a single token row.
const expenses: Expense[] = [
  { id: 'demo-expense-001', societyId: SOCIETY_ID, date: '2026-07-05', category: 'હાઉસકીપિંગ', amount: 8000, mode: 'bank', note: 'જુલાઈ સફાઈ સ્ટાફ પગાર' },
  { id: 'demo-expense-002', societyId: SOCIETY_ID, date: '2026-07-04', category: 'વીજળી બિલ', amount: 6200, mode: 'upi', note: 'કોમન એરિયા લાઈટ અને લિફ્ટ' },
  { id: 'demo-expense-003', societyId: SOCIETY_ID, date: '2026-07-02', category: 'લિફ્ટ મેન્ટેનન્સ', vendorId: 'demo-vendor-001', amount: 3500, mode: 'upi' },
  { id: 'demo-expense-004', societyId: SOCIETY_ID, date: '2026-06-30', category: 'સિક્યુરિટી', vendorId: 'demo-vendor-002', amount: 22000, mode: 'bank', note: 'જૂન સિક્યુરિટી ગાર્ડ પગાર' },
  { id: 'demo-expense-005', societyId: SOCIETY_ID, date: '2026-06-22', category: 'બાગકામ', vendorId: 'demo-vendor-003', amount: 2500, mode: 'cash' },
  { id: 'demo-expense-006', societyId: SOCIETY_ID, date: '2026-06-18', category: 'પાણીની ટાંકી સફાઈ', amount: 4000, mode: 'cash', note: 'છ મહિને એક વાર' },
]

const notices: Notice[] = [
  { id: 'demo-notice-001', societyId: SOCIETY_ID, title: 'જુલાઈ મેન્ટેનન્સ બિલ જનરેટ થયું', body: 'જુલાઈ મહિનાનું બિલ બની ગયું છે. કૃપા કરી તા. ૧૦ સુધીમાં ચૂકવો.', date: '2026-07-01', category: 'બિલિંગ', pinned: true },
  { id: 'demo-notice-002', societyId: SOCIETY_ID, title: 'લિફ્ટ મેન્ટેનન્સ - શનિવારે', body: 'આ શનિવારે સવારે ૧૦ થી ૧૨ લિફ્ટ મેન્ટેનન્સ ચાલશે, થોડી અગવડ બદલ ક્ષમા.', date: '2026-07-06', category: 'સામાન્ય', pinned: false },
  { id: 'demo-notice-003', societyId: SOCIETY_ID, title: 'સ્વતંત્રતા દિવસ ઉજવણી', body: '૧૫ ઓગસ્ટે સવારે ધ્વજવંદન, બધા સભ્યો પધારે.', date: '2026-06-30', category: 'ઇવેન્ટ', pinned: false },
]

const polls: Poll[] = [
  {
    id: 'demo-poll-001', societyId: SOCIETY_ID, question: 'સોસાયટીમાં વધારાના CCTV કેમેરા લગાવવા?', type: 'yesno',
    options: ['હા', 'ના'], votes: { 'demo-flat-102': 0, 'demo-flat-203': 0, 'demo-flat-305': 1, 'demo-flat-410': 0, 'demo-flat-604': 1 },
    status: 'open', resultVisible: true, endDate: '2026-07-25',
  },
]

const events: SocietyEvent[] = [
  {
    id: 'demo-event-001', societyId: SOCIETY_ID, name: 'સ્વતંત્રતા દિવસ ઉજવણી', type: 'તહેવાર', date: '2026-08-15',
    note: 'ધ્વજવંદન, નાસ્તો અને બાળકો માટે રમતો',
    contributions: [
      { flatId: 'demo-flat-101', amount: 500, date: '2026-07-08' },
      { flatId: 'demo-flat-203', amount: 500, date: '2026-07-09' },
      { flatId: 'demo-flat-408', amount: 1000, date: '2026-07-09' },
    ],
    volunteers: [nameOf('102'), nameOf('305'), nameOf('604')],
    expenses: [{ label: 'ધ્વજ અને સજાવટ', amount: 1500 }, { label: 'નાસ્તો', amount: 3000 }],
  },
]

const contacts: Contact[] = [
  { id: 'demo-contact-001', societyId: SOCIETY_ID, name: nameOf('101'), role: 'પ્રમુખ', phone: '98765 40001', category: 'committee' },
  { id: 'demo-contact-002', societyId: SOCIETY_ID, name: nameOf('402'), role: 'મંત્રી', phone: '98765 40002', category: 'committee' },
  { id: 'demo-contact-003', societyId: SOCIETY_ID, name: nameOf('205'), role: 'ખજાનચી', phone: '98765 40003', category: 'committee' },
  { id: 'demo-contact-004', societyId: SOCIETY_ID, name: 'ફાયર બ્રિગેડ', role: 'ઇમરજન્સી', phone: '101', category: 'emergency' },
  { id: 'demo-contact-005', societyId: SOCIETY_ID, name: 'એમ્બ્યુલન્સ', role: 'ઇમરજન્સી', phone: '108', category: 'emergency' },
  { id: 'demo-contact-006', societyId: SOCIETY_ID, name: 'સોસાયટી ઇલેક્ટ્રિશિયન', role: 'સેવા', phone: '98765 40006', category: 'service' },
]

const vehicles: Vehicle[] = [
  { id: 'demo-vehicle-001', societyId: SOCIETY_ID, flatId: 'demo-flat-101', kind: '4W', number: 'GJ05 AB 1234', slot: 'P-12', ownerType: 'owner' },
  { id: 'demo-vehicle-002', societyId: SOCIETY_ID, flatId: 'demo-flat-204', kind: '2W', number: 'GJ05 CD 5678', slot: 'P-13', ownerType: 'owner' },
  { id: 'demo-vehicle-003', societyId: SOCIETY_ID, flatId: 'demo-flat-305', kind: '4W', number: 'GJ05 EF 9012', slot: 'P-30', ownerType: 'tenant' },
  { id: 'demo-vehicle-004', societyId: SOCIETY_ID, flatId: 'demo-flat-607', kind: '2W', number: 'GJ05 GH 3456', slot: 'P-41', ownerType: 'owner' },
]

const documents: Doc[] = [
  { id: 'demo-document-001', societyId: SOCIETY_ID, name: 'સોસાયટી બાયલોઝ', folder: 'કાનૂની', permission: 'public', date: '2020-05-01', size: '1.2 MB' },
  { id: 'demo-document-002', societyId: SOCIETY_ID, name: 'AGM મિનિટ્સ 2026', folder: 'મીટિંગ', permission: 'committee', date: '2026-04-15', size: '480 KB' },
  { id: 'demo-document-003', societyId: SOCIETY_ID, name: 'વાર્ષિક હિસાબ 2025-26', folder: 'નાણાકીય', permission: 'committee', date: '2026-04-10', size: '760 KB' },
]

export function buildDemoSeed(): DB {
  return {
    version: DEMO_SCHEMA_VERSION,
    societies: [society], flats, bills, payments,
    expenses, vendors, complaints, notices, documents, polls, events, vehicles, contacts,
    adjustments: [], memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: [],
    auditLogs: [], impersonationLogs: [], pendingSync: [],
  }
}

export const DEMO_SOCIETY_ID = society.id

// For anything created during a demo session, not just the seed data above -
// always obviously, unmistakably demo-prefixed, the same requirement the seed
// ids themselves follow. Includes a timestamp component specifically so a
// runtime-generated id can never collide with one of the seed's own hardcoded
// ids - a purely sequential counter could otherwise eventually reproduce an
// exact seed id string. Found as a real, reproducible React key collision
// while testing the payment journey, not a hypothetical concern.
let demoIdCounter = 0
export function demoId(kind: string): string {
  demoIdCounter += 1
  return `demo-${kind}-${Date.now().toString(36)}${demoIdCounter}`
}
