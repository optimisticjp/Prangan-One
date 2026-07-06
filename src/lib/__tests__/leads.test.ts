import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('../supabase')
  vi.resetModules()
})

describe('submitPublicLeadToSupabase', () => {
  it('inserts the lead with the expected field mapping', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { submitPublicLeadToSupabase } = await import('../leads')

    await submitPublicLeadToSupabase({
      name: 'Kiran Patel', phone: '9000000000', email: 'kiran@example.com',
      societyName: 'Swastik Apartment', city: 'Surat', flatCount: 32,
      role: 'Chairman', mainNeed: 'Billing', message: 'Need help with billing',
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Kiran Patel', society_name: 'Swastik Apartment', flat_count: 32, main_need: 'Billing',
    }))
  })

  it('is a silent no-op when Supabase is not configured, since Formspree and the local store already cover this case', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { submitPublicLeadToSupabase } = await import('../leads')
    await expect(submitPublicLeadToSupabase({
      name: 'X', phone: '1', email: 'x@example.com', societyName: 'Y', city: 'Z', flatCount: 1, role: 'R', mainNeed: 'M',
    })).resolves.toBeUndefined()
  })

  it('throws when the insert genuinely fails, so the caller can decide what to do', async () => {
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }) } }))
    const { submitPublicLeadToSupabase } = await import('../leads')
    await expect(submitPublicLeadToSupabase({
      name: 'X', phone: '1', email: 'x@example.com', societyName: 'Y', city: 'Z', flatCount: 1, role: 'R', mainNeed: 'M',
    })).rejects.toBeTruthy()
  })
})

describe('fetchPublicLeads', () => {
  it('maps the real rows into the PublicLead shape the owner console expects', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        id: '1', name: 'Kiran', phone: '900', email: 'k@example.com', society_name: 'Swastik',
        city: 'Surat', flat_count: 32, role: 'Chairman', main_need: 'Billing', message: null,
        status: 'new', internal_note: null, created_at: '2026-01-01T00:00:00Z',
      }],
      error: null,
    })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ order }) }) } }))
    const { fetchPublicLeads } = await import('../leads')

    const leads = await fetchPublicLeads()
    expect(leads).toEqual([{
      id: '1', name: 'Kiran', phone: '900', email: 'k@example.com', societyName: 'Swastik',
      city: 'Surat', flatCount: 32, role: 'Chairman', mainNeed: 'Billing', message: undefined,
      status: 'new', internalNote: undefined, createdAt: '2026-01-01T00:00:00Z',
    }])
  })

  it('returns an empty array when Supabase is not configured', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { fetchPublicLeads } = await import('../leads')
    expect(await fetchPublicLeads()).toEqual([])
  })
})
