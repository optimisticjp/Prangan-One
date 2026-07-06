import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from '../store'

function setup() {
  const { result } = renderHook(() => useData(), { wrapper: DataProvider })
  act(() => { result.current.enterSociety('soc_rajhans', 'society_admin') })
  return result
}

afterEach(() => {
  localStorage.clear()
})

describe('flatPending with adjustments (previously a bug: adjustments existed as records but never affected what anyone owed)', () => {
  it('a debit adjustment increases what a flat owes', () => {
    const result = setup()
    const before = result.current.flatPending('flat_101')
    act(() => {
      result.current.addAdjustment({ date: '2026-01-01', flatId: 'flat_101', amount: 300, type: 'debit', reason: 'Special painting assessment' })
    })
    expect(result.current.flatPending('flat_101')).toBe(before + 300)
  })

  it('a credit adjustment reduces what a flat owes, and can take it negative (a real credit balance)', () => {
    const result = setup()
    act(() => {
      result.current.addAdjustment({ date: '2026-01-01', flatId: 'flat_101', amount: 5000, type: 'credit', reason: 'Overpayment credited forward' })
    })
    expect(result.current.flatPending('flat_101')).toBeLessThan(0)
  })

  it('a society-wide adjustment (no flatId) affects totalPending but not any one flat\u2019s own pending', () => {
    const result = setup()
    const flatBefore = result.current.flatPending('flat_101')
    const totalBefore = result.current.totalPending()
    act(() => {
      result.current.addAdjustment({ date: '2026-01-01', amount: 1000, type: 'debit', reason: 'Society-wide correction, not tied to one flat' })
    })
    expect(result.current.flatPending('flat_101')).toBe(flatBefore) // unchanged
    expect(result.current.totalPending()).toBe(totalBefore + 1000) // reflected at the total level
  })

  it('an adjustment for a different flat does not affect this flat\u2019s pending', () => {
    const result = setup()
    const before = result.current.flatPending('flat_101')
    act(() => {
      result.current.addAdjustment({ date: '2026-01-01', flatId: 'flat_102', amount: 500, type: 'debit', reason: 'Someone else\u2019s charge' })
    })
    expect(result.current.flatPending('flat_101')).toBe(before)
  })
})

describe('per-flat maintenance override', () => {
  it('previewBillGeneration shows the society default when a flat has no override', () => {
    const result = setup()
    const preview = result.current.previewBillGeneration('2027-01')
    const flat101 = preview.find(p => p.flatId === 'flat_101')
    expect(flat101?.amount).toBe(1200) // soc_rajhans's default maintenanceAmount
  })

  it('previewBillGeneration and generateBills both use the override once one is set', () => {
    const result = setup()
    act(() => {
      result.current.updateFlat('flat_101', { maintenanceOverride: 1800 })
    })
    const preview = result.current.previewBillGeneration('2027-02')
    expect(preview.find(p => p.flatId === 'flat_101')?.amount).toBe(1800)

    act(() => { result.current.generateBills('2027-02') })
    const bill = result.current.db.bills.find(b => b.flatId === 'flat_101' && b.month === '2027-02')
    expect(bill?.amount).toBe(1800)
  })

  it('clearing the override (setting it back to undefined) reverts to the society default', () => {
    const result = setup()
    act(() => {
      result.current.updateFlat('flat_101', { maintenanceOverride: 1800 })
      result.current.updateFlat('flat_101', { maintenanceOverride: undefined })
    })
    const preview = result.current.previewBillGeneration('2027-03')
    expect(preview.find(p => p.flatId === 'flat_101')?.amount).toBe(1200)
  })

  it('an override on one flat does not affect any other flat\u2019s bill amount', () => {
    const result = setup()
    act(() => { result.current.updateFlat('flat_101', { maintenanceOverride: 1800 }) })
    const preview = result.current.previewBillGeneration('2027-04')
    expect(preview.find(p => p.flatId === 'flat_102')?.amount).toBe(1200)
  })
})

describe('previewBillGeneration flags what already exists', () => {
  it('marks a flat as alreadyExists once its bill for that month has been generated', () => {
    const result = setup()
    act(() => { result.current.generateBills('2027-05') })
    const preview = result.current.previewBillGeneration('2027-05')
    expect(preview.every(p => p.alreadyExists)).toBe(true)
  })

  it('a fresh month shows nothing as already existing', () => {
    const result = setup()
    const preview = result.current.previewBillGeneration('2027-06')
    expect(preview.some(p => p.alreadyExists)).toBe(false)
  })

  it('matches what generateBills itself actually does - preview says N new, generateBills creates exactly N', () => {
    const result = setup()
    const preview = result.current.previewBillGeneration('2027-07')
    const expectedNew = preview.filter(p => !p.alreadyExists).length
    let created = 0
    act(() => { created = result.current.generateBills('2027-07') })
    expect(created).toBe(expectedNew)
  })
})
