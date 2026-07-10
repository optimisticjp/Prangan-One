import { describe, expect, it } from 'vitest'
import { computePaymentJourneySteps, computeComplaintJourneySteps, GUIDE_COMPLAINT_TITLE } from '../demoGuide'
import type { Payment, Complaint } from '../types'

/**
 * The guide's own "brain" - deliberately pure functions, no React, no
 * storage, so every step's "is this actually done" check can be proven
 * directly against real session and data shapes, the same shapes the
 * real app actually produces, not a simplified stand-in for them.
 */
function payment(overrides: Partial<Payment>): Payment {
  return { id: 'p1', societyId: 's1', flatId: 'flat-a', billId: 'bill-a', date: '2026-07-10', amount: 1200, mode: 'upi', status: 'pending_confirmation', ...overrides }
}

describe('the payment journey guide steps', () => {
  it('nothing is done yet before anyone has done anything', () => {
    const steps = computePaymentJourneySteps({ payments: [] }, { role: 'society_admin', flatId: null }, 'flat-a', 'bill-a')
    expect(steps.every(s => !s.done)).toBe(true)
  })

  it('switching to the target resident marks the first step done, nothing further', () => {
    const steps = computePaymentJourneySteps({ payments: [] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a', 'bill-a')
    expect(steps[0].done).toBe(true)
    expect(steps[1].done).toBe(false)
  })

  it('switching to a DIFFERENT resident does not mark the first step done - it has to be the actual target flat', () => {
    const steps = computePaymentJourneySteps({ payments: [] }, { role: 'resident_owner', flatId: 'some-other-flat' }, 'flat-a', 'bill-a')
    expect(steps[0].done).toBe(false)
  })

  it('a real, reproducible bug this test suite actually caught while building this: an unrelated, already-settled payment for the SAME flat but a DIFFERENT bill must not count as progress', () => {
    const unrelatedPayment = payment({ id: 'old-payment', billId: 'a-completely-different-bill-from-a-previous-month', status: 'success' })
    const steps = computePaymentJourneySteps({ payments: [unrelatedPayment] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a', 'bill-a')
    expect(steps[1].done).toBe(false)
    expect(steps[2].done).toBe(false)
  })

  it('a real pending payment for the actual tracked bill marks steps one and two done, not three or four yet', () => {
    const steps = computePaymentJourneySteps({ payments: [payment({ status: 'pending_confirmation' })] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a', 'bill-a')
    expect(steps[0].done).toBe(true)
    expect(steps[1].done).toBe(true)
    expect(steps[2].done).toBe(false)
    expect(steps[3].done).toBe(false)
  })

  it('a confirmed payment marks step three done too, but step four only once actually viewed as that resident again', () => {
    const confirmed = [payment({ status: 'success', receiptNo: 'DEMO-2026-0099' })]
    const stillCommittee = computePaymentJourneySteps({ payments: confirmed }, { role: 'society_admin', flatId: null }, 'flat-a', 'bill-a')
    expect(stillCommittee[2].done).toBe(true)
    expect(stillCommittee[3].done).toBe(false)

    const backAsResident = computePaymentJourneySteps({ payments: confirmed }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a', 'bill-a')
    expect(backAsResident[3].done).toBe(true)
  })

  it('a cancelled payment does not count as progress at all - matches the real app\u2019s own definition of a genuine, standing payment', () => {
    const steps = computePaymentJourneySteps({ payments: [payment({ status: 'success', cancelled: true })] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a', 'bill-a')
    expect(steps[1].done).toBe(false)
  })
})

function complaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: 'c1', societyId: 's1', flatId: 'flat-a', category: 'General', title: GUIDE_COMPLAINT_TITLE, detail: '',
    priority: 'normal', status: 'new', createdAt: '2026-07-10', hasPhoto: false, internalNotes: [], timeline: [], visibility: 'personal',
    ...overrides,
  }
}

describe('the complaint journey guide steps', () => {
  it('nothing is done before any complaint exists', () => {
    const steps = computeComplaintJourneySteps({ complaints: [] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a')
    expect(steps.every(s => !s.done)).toBe(true)
  })

  it('only the guide\u2019s own recognizable complaint counts, not any complaint filed while exploring freely', () => {
    const steps = computeComplaintJourneySteps({ complaints: [complaint({ title: 'Something else entirely' })] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a')
    expect(steps[0].done).toBe(false)
  })

  it('filing the guide\u2019s complaint marks step one done, not step two until status actually changes', () => {
    const steps = computeComplaintJourneySteps({ complaints: [complaint({ status: 'new' })] }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a')
    expect(steps[0].done).toBe(true)
    expect(steps[1].done).toBe(false)
  })

  it('a real status change marks step two done, and step three once seen again as that resident', () => {
    const assigned = [complaint({ status: 'assigned' })]
    expect(computeComplaintJourneySteps({ complaints: assigned }, { role: 'society_admin', flatId: null }, 'flat-a')[1].done).toBe(true)
    expect(computeComplaintJourneySteps({ complaints: assigned }, { role: 'society_admin', flatId: null }, 'flat-a')[2].done).toBe(false)
    expect(computeComplaintJourneySteps({ complaints: assigned }, { role: 'resident_owner', flatId: 'flat-a' }, 'flat-a')[2].done).toBe(true)
  })

  it('only a genuinely done status completes the final step, not merely assigned or in progress', () => {
    expect(computeComplaintJourneySteps({ complaints: [complaint({ status: 'inprogress' })] }, { role: 'society_admin', flatId: null }, 'flat-a')[3].done).toBe(false)
    expect(computeComplaintJourneySteps({ complaints: [complaint({ status: 'done' })] }, { role: 'society_admin', flatId: null }, 'flat-a')[3].done).toBe(true)
  })
})
