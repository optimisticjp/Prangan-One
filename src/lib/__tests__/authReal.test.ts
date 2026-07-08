import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('../supabase')
  vi.resetModules()
})

describe('signInWithGoogle', () => {
  it('requests the google provider with the auth callback redirect', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { auth: { signInWithOAuth } } }))
    const { signInWithGoogle } = await import('../auth')

    await signInWithGoogle()
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    })
  })

  it('throws if Supabase itself reports an error', async () => {
    vi.doMock('../supabase', () => ({ supabase: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) } } }))
    const { signInWithGoogle } = await import('../auth')
    await expect(signInWithGoogle()).rejects.toBeTruthy()
  })

  it('throws clearly when Supabase is not configured, rather than doing nothing silently', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { signInWithGoogle } = await import('../auth')
    await expect(signInWithGoogle()).rejects.toBeTruthy()
  })
})

describe('findSocietyPublicProfile', () => {
  it('maps the RPC result into the expected shape', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { society_id: 'soc_1', name: 'A', name_en: 'Society A', address: 'x', city: 'Surat', area: 'Varachha', theme_key: 'navy-saffron', logo_url: null },
      error: null,
    })
    vi.doMock('../supabase', () => ({ supabase: { rpc: vi.fn(() => ({ maybeSingle })) } }))
    const { findSocietyPublicProfile } = await import('../auth')

    const result = await findSocietyPublicProfile('society-a')
    expect(result).toEqual({
      societyId: 'soc_1', name: 'A', nameEn: 'Society A', address: 'x', city: 'Surat', area: 'Varachha', themeKey: 'navy-saffron', logoUrl: null,
    })
  })

  it('returns null for an unknown slug rather than throwing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.doMock('../supabase', () => ({ supabase: { rpc: vi.fn(() => ({ maybeSingle })) } }))
    const { findSocietyPublicProfile } = await import('../auth')

    expect(await findSocietyPublicProfile('does-not-exist')).toBeNull()
  })
})

describe('submitJoinRequest', () => {
  it('translates a successful RPC call into an active result', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'active', error: null })
    vi.doMock('../supabase', () => ({ supabase: { rpc } }))
    const { submitJoinRequest } = await import('../auth')

    const result = await submitJoinRequest({ joinCode: 'RAJHANS24', flatNumber: '101', name: 'X', phone: '9000000010', email: 'x@example.com' })
    expect(result).toEqual({ ok: true, status: 'active' })
    expect(rpc).toHaveBeenCalledWith('submit_join_request', {
      target_join_code: 'RAJHANS24', target_flat_number: '101', given_name: 'X', given_phone: '9000000010', given_email: 'x@example.com',
    })
  })

  it('translates the society_not_found database error into the matching error code', async () => {
    vi.doMock('../supabase', () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'society_not_found' } }) } }))
    const { submitJoinRequest } = await import('../auth')

    const result = await submitJoinRequest({ joinCode: 'BOGUS', flatNumber: '101', name: 'X', phone: '1', email: 'x@example.com' })
    expect(result).toEqual({ ok: false, error: 'society_not_found' })
  })

  it('translates a unique-constraint violation (23505) into already_enrolled', async () => {
    vi.doMock('../supabase', () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } }) } }))
    const { submitJoinRequest } = await import('../auth')

    const result = await submitJoinRequest({ joinCode: 'RAJHANS24', flatNumber: '101', name: 'X', phone: '1', email: 'dup@example.com' })
    expect(result).toEqual({ ok: false, error: 'already_enrolled' })
  })

  it('falls back to an unknown error for anything else, e.g. the trigger rejecting a disabled tenant flow', async () => {
    vi.doMock('../supabase', () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'tenant access is disabled for this society' } }) } }))
    const { submitJoinRequest } = await import('../auth')

    const result = await submitJoinRequest({ joinCode: 'RAJHANS24', flatNumber: '201', name: 'X', phone: '1', email: 'tenant@example.com' })
    expect(result).toEqual({ ok: false, error: 'unknown' })
  })
})
