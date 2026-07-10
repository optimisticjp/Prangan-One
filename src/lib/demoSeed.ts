/**
 * The demo's own canonical seed data - deliberately synthetic IDs
 * throughout (demo-society-001, demo-flat-a101, and so on), never the
 * uid()/realUid() shapes real or local-fallback records use, so a demo
 * record can never collide with, or be mistaken for, a real one even by
 * coincidence.
 *
 * Deliberately minimal for now, not the full "Sahaj Residency" fictional
 * society with realistic disorder (overdue flats, pending verifications,
 * a vendor renewal coming up) called for later in this project's own
 * plan - this exists to prove the actual provider architecture works
 * end to end with real, working data, not to be the final content. That
 * richer seed replaces this file's contents directly when it's built,
 * without needing to change anything about the provider itself.
 */
import type { Bill, Complaint, DB, Flat, Notice, Payment, Poll, Society } from './types'

export const DEMO_SCHEMA_VERSION = 1

const society: Society = {
  id: 'demo-society-001', name: 'ડેમો સોસાયટી', nameEn: 'Demo Society', address: 'ડેમો શેરી, સુરત',
  city: 'સુરત', area: 'ડેમો વિસ્તાર', slug: 'demo-society', joinCode: 'DEMO001',
  maintenanceAmount: 1200, dueDay: 10, upiId: 'demo@upi',
  plan: 'pro', flatsLimit: 50, receiptPrefix: 'DEMO', themeKey: 'navy-saffron',
  supportPhone: '90000 00000', createdAt: '2026-01-01', receiptSeq: 3,
  tenantAccess: 'full', subscriptionStatus: 'active',
  modules: {
    ownerEnabled: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
    adminVisible: { billing: true, complaints: true, notices: true, documents: true, vendors: true, polls: true, events: true, parking: true, reports: true },
  },
}

const flats: Flat[] = [
  { id: 'demo-flat-a101', societyId: society.id, number: '101', floor: 1, ownerName: 'ડેમો રહેવાસી એક', phone: '90000 00011', occupancy: 'owner', sqft: 950, memberSince: 2020, email: 'demo-resident-001@example.com' },
  { id: 'demo-flat-a102', societyId: society.id, number: '102', floor: 1, ownerName: 'ડેમો રહેવાસી બે', phone: '90000 00012', occupancy: 'owner', sqft: 950, memberSince: 2021 },
  { id: 'demo-flat-a201', societyId: society.id, number: '201', floor: 2, ownerName: 'ડેમો રહેવાસી ત્રણ', phone: '90000 00013', occupancy: 'tenant', sqft: 1100, memberSince: 2019, tenantName: 'ડેમો ભાડૂત', tenantEmail: 'demo-tenant-001@example.com' },
]

const bills: Bill[] = [
  { id: 'demo-bill-2026-06-a101', societyId: society.id, flatId: 'demo-flat-a101', month: '2026-06', amount: 1200, paidAmount: 1200, dueDate: '2026-06-10' },
  { id: 'demo-bill-2026-07-a101', societyId: society.id, flatId: 'demo-flat-a101', month: '2026-07', amount: 1200, paidAmount: 0, dueDate: '2026-07-10' },
  { id: 'demo-bill-2026-07-a102', societyId: society.id, flatId: 'demo-flat-a102', month: '2026-07', amount: 1200, paidAmount: 0, dueDate: '2026-07-10' },
  { id: 'demo-bill-2026-07-a201', societyId: society.id, flatId: 'demo-flat-a201', month: '2026-07', amount: 1200, paidAmount: 1200, dueDate: '2026-07-10' },
]

const payments: Payment[] = [
  { id: 'demo-payment-001', societyId: society.id, flatId: 'demo-flat-a101', billId: 'demo-bill-2026-06-a101', date: '2026-06-03', amount: 1200, mode: 'upi', refNo: 'DEMOUTR001', receiptNo: 'DEMO-2026-0001', status: 'success' },
  { id: 'demo-payment-002', societyId: society.id, flatId: 'demo-flat-a201', billId: 'demo-bill-2026-07-a201', date: '2026-07-04', amount: 1200, mode: 'cash', receiptNo: 'DEMO-2026-0002', status: 'success' },
]

const complaints: Complaint[] = [
  {
    id: 'demo-complaint-001', societyId: society.id, flatId: 'demo-flat-a102', category: 'સામાન્ય', title: 'પાણીની ટાંકી સાફ કરવાની જરૂર છે',
    detail: 'છેલ્લા ઘણા મહિનાથી ટાંકી સાફ નથી થઈ.', priority: 'normal', status: 'new', createdAt: '2026-07-08',
    hasPhoto: false, internalNotes: [], timeline: [{ date: '2026-07-08', status: 'new', by: 'ડેમો રહેવાસી બે' }],
    visibility: 'community',
  },
]

const notices: Notice[] = [
  { id: 'demo-notice-001', societyId: society.id, title: 'આ મહિનાનું મેન્ટેનન્સ બિલ જનરેટ થયું', body: 'જુલાઈ મહિનાનું બિલ બની ગયું છે, કૃપા કરી સમયસર ચૂકવો.', date: '2026-07-01', category: 'બિલિંગ', pinned: true },
]

const polls: Poll[] = [
  { id: 'demo-poll-001', societyId: society.id, question: 'સોસાયટીના ગેટ પર નવો સિક્યુરિટી ગાર્ડ રાખવો?', type: 'yesno', options: ['હા', 'ના'], votes: {}, status: 'open', resultVisible: true, endDate: '2026-07-20' },
]

export function buildDemoSeed(): DB {
  return {
    version: DEMO_SCHEMA_VERSION,
    societies: [society], flats, bills, payments,
    expenses: [], vendors: [], complaints, notices, documents: [], polls, events: [], vehicles: [], contacts: [],
    adjustments: [], memberships: [], platformBilling: [], leads: [], unmatchedLoginAttempts: [],
    auditLogs: [], impersonationLogs: [], pendingSync: [],
  }
}

export const DEMO_SOCIETY_ID = society.id

// For anything created during a demo session, not just the seed data
// above - always obviously, unmistakably demo-prefixed, the same
// requirement the seed IDs themselves follow. Includes a timestamp
// component specifically so a runtime-generated id can never collide
// with one of the seed's own hardcoded ids (demo-payment-002 exists as
// a real, seeded record - a purely sequential counter starting at 1
// could eventually produce that exact same string again) - found this
// as a real, reproducible React key collision while testing the payment
// journey, not a hypothetical concern.
let demoIdCounter = 0
export function demoId(kind: string): string {
  demoIdCounter += 1
  return `demo-${kind}-${Date.now().toString(36)}${demoIdCounter}`
}
