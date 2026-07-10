/**
 * The optional "try this journey" guide - a small, dismissible hint
 * about what to do next, not a heavy tutorial framework. Deliberately
 * simple: the guide's own persisted state is only ever "which journey is
 * active" and "has it been dismissed" - the actual current step is
 * always computed fresh from the real session and real data (see
 * computeGuideStep below), never stored separately, so it can never
 * drift out of sync with what's actually true and survives a role
 * switch correctly for free, without any extra bookkeeping.
 */
import type { DB } from './types'

export type GuideJourney = 'payment' | 'complaint'

export interface GuideState {
  journey: GuideJourney | null
  targetFlatId: string | null
  targetBillId: string | null
  dismissed: boolean
}

const GUIDE_STORAGE_KEY = 'prangan_demo_v1_guide'

export function loadGuideState(): GuideState {
  try {
    const raw = sessionStorage.getItem(GUIDE_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as GuideState
  } catch { /* ignore */ }
  return { journey: null, targetFlatId: null, targetBillId: null, dismissed: false }
}

export function saveGuideState(state: GuideState): void {
  try { sessionStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

export function clearGuideState(): void {
  try { sessionStorage.removeItem(GUIDE_STORAGE_KEY) } catch { /* ignore */ }
}

export interface GuideStep {
  text: string
  done: boolean
}

/**
 * Every step's own "done" check reads only from real session and real
 * data - a payment that's actually pending, a role that's actually
 * switched, a complaint that's actually resolved. Nothing here is a
 * separate flag that could fall out of sync with what genuinely
 * happened.
 */
export function computePaymentJourneySteps(
  db: Pick<DB, 'payments'>,
  session: { role: string | null; flatId: string | null },
  targetFlatId: string,
  targetBillId: string,
): GuideStep[] {
  const payment = db.payments.find(p => p.billId === targetBillId && !p.cancelled && (p.status === 'pending_confirmation' || p.status === 'success'))
  const isThisResident = (session.role === 'resident_owner' || session.role === 'resident_tenant') && session.flatId === targetFlatId

  return [
    { text: 'એ ફ્લેટના રહેવાસી તરીકે જુઓ (ડેશબોર્ડ પર "આ રહેવાસી તરીકે જુઓ")', done: isThisResident || !!payment },
    { text: 'મેન્ટેનન્સ બિલ ચૂકવેલ તરીકે નોંધો', done: !!payment },
    { text: 'કમિટી તરીકે પાછા જાઓ અને ચુકવણીની પુષ્ટિ કરો', done: payment?.status === 'success' },
    { text: 'ફરી રહેવાસી તરીકે જુઓ - અપડેટ થયેલી સ્થિતિ અને રસીદ જુઓ', done: isThisResident && payment?.status === 'success' },
  ]
}

export function computeComplaintJourneySteps(
  db: Pick<DB, 'complaints'>,
  session: { role: string | null; flatId: string | null },
  targetFlatId: string,
): GuideStep[] {
  const complaint = db.complaints.find(c => c.flatId === targetFlatId && c.title === GUIDE_COMPLAINT_TITLE)
  const isThisResident = (session.role === 'resident_owner' || session.role === 'resident_tenant') && session.flatId === targetFlatId

  return [
    { text: 'રહેવાસી તરીકે એક ફરિયાદ નોંધો', done: !!complaint },
    { text: 'કમિટી તરીકે જુઓ અને સ્થિતિ બદલો', done: !!complaint && complaint.status !== 'new' },
    { text: 'ફરી રહેવાસી તરીકે જુઓ - અપડેટ થયેલી સ્થિતિ જુઓ', done: !!complaint && complaint.status !== 'new' && isThisResident },
    { text: 'કમિટી તરીકે ફરિયાદ ઉકેલાયેલ તરીકે બંધ કરો', done: complaint?.status === 'done' },
  ]
}

// A fixed, recognizable title so the guide can find "the complaint it
// asked someone to create" specifically, distinct from the seed's own
// pre-existing complaint or anything else someone might file while
// exploring freely.
export const GUIDE_COMPLAINT_TITLE = 'લિફ્ટમાં અવાજ આવે છે'
