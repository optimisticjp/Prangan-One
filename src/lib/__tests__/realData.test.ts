import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('../supabase')
  vi.resetModules()
})

const flatRow = {
  id: 'f1', society_id: 'soc1', number: '101', floor: 1, owner_name: 'Kiran Patel', phone: '9000000000',
  email: null, occupancy: 'owner' as const, tenant_name: null, tenant_email: null, sqft: 900, member_since: 2024, maintenance_override: null,
}
const billRow = { id: 'b1', society_id: 'soc1', flat_id: 'f1', month: '2027-01', amount: 1200, paid_amount: 0, due_date: '2027-01-10', note: null }
const paymentRow = {
  id: 'p1', society_id: 'soc1', flat_id: 'f1', bill_id: 'b1', date: '2027-01-05', amount: 1200, mode: 'upi' as const,
  ref_no: 'UPI123', receipt_no: 'SOC-2027-0001', status: 'success' as const, note: null, cancelled: false, cancel_reason: null,
}
const adjustmentRow = { id: 'a1', society_id: 'soc1', date: '2027-01-01', flat_id: 'f1', amount: 300, type: 'debit' as const, reason: 'Special assessment' }

describe('fetchSocietyFinancials', () => {
  it('maps all four tables into the expected app shapes', async () => {
    const makeQuery = (data: unknown[]) => ({ select: () => ({ eq: () => Promise.resolve({ data, error: null }) }) })
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => {
          if (table === 'flats') return makeQuery([flatRow])
          if (table === 'bills') return makeQuery([billRow])
          if (table === 'payments') return makeQuery([paymentRow])
          if (table === 'adjustments') return makeQuery([adjustmentRow])
          throw new Error('unexpected table ' + table)
        },
      },
    }))
    const { fetchSocietyFinancials } = await import('../realData')
    const result = await fetchSocietyFinancials('soc1')

    expect(result.flats).toEqual([{
      id: 'f1', societyId: 'soc1', number: '101', floor: 1, ownerName: 'Kiran Patel', phone: '9000000000',
      email: undefined, occupancy: 'owner', tenantName: undefined, tenantEmail: undefined, sqft: 900, memberSince: 2024, maintenanceOverride: undefined,
    }])
    expect(result.bills).toEqual([{ id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10', note: undefined }])
    expect(result.payments[0]).toMatchObject({ id: 'p1', receiptNo: 'SOC-2027-0001', status: 'success', cancelled: false })
    expect(result.adjustments[0]).toMatchObject({ id: 'a1', flatId: 'f1', amount: 300, type: 'debit' })
  })

  it('returns all-empty when Supabase is not configured, rather than throwing', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { fetchSocietyFinancials } = await import('../realData')
    expect(await fetchSocietyFinancials('soc1')).toEqual({ flats: [], bills: [], payments: [], adjustments: [] })
  })

  it('throws if any one of the four queries fails, rather than silently returning partial data', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'payments' ? { data: null, error: { message: 'boom' } } : { data: [], error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyFinancials } = await import('../realData')
    await expect(fetchSocietyFinancials('soc1')).rejects.toBeTruthy()
  })
})

describe('insertBillsReal', () => {
  it('maps camelCase bills into the real snake_case columns, including the client-provided id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertBillsReal } = await import('../realData')

    await insertBillsReal([{ id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10' }])
    expect(insert).toHaveBeenCalledWith([{ id: 'b1', society_id: 'soc1', flat_id: 'f1', month: '2027-01', amount: 1200, paid_amount: 0, due_date: '2027-01-10', note: null }])
  })

  it('does nothing for an empty list, no network call at all', async () => {
    const insert = vi.fn()
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertBillsReal } = await import('../realData')
    await insertBillsReal([])
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('recordPaymentReal', () => {
  it('inserts the payment and updates the bill paid_amount together, capped at the bill amount', async () => {
    const calls: { table: string; payload: unknown }[] = []
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          insert: (payload: unknown) => { calls.push({ table, payload }); return Promise.resolve({ error: null }) },
          update: (payload: unknown) => { calls.push({ table, payload }); return { eq: () => Promise.resolve({ error: null }) } },
        }),
      },
    }))
    const { recordPaymentReal } = await import('../realData')

    await recordPaymentReal(
      { id: 'p1', societyId: 'soc1', flatId: 'f1', billId: 'b1', date: '2027-01-05', amount: 500, mode: 'upi', status: 'success' },
      700, // already paid
      1000, // bill total
    )

    const billUpdate = calls.find(c => c.table === 'bills')
    expect(billUpdate?.payload).toEqual({ paid_amount: 1000 }) // capped at the bill's total, not 700+500=1200
  })

  it('does not touch the bill at all for a pending or failed payment', async () => {
    const calls: string[] = []
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          insert: () => Promise.resolve({ error: null }),
          update: () => { calls.push(table); return { eq: () => Promise.resolve({ error: null }) } },
        }),
      },
    }))
    const { recordPaymentReal } = await import('../realData')
    await recordPaymentReal(
      { id: 'p1', societyId: 'soc1', flatId: 'f1', billId: 'b1', date: '2027-01-05', amount: 500, mode: 'upi', status: 'pending_confirmation' },
      0, 1000,
    )
    expect(calls).not.toContain('bills')
  })
})
