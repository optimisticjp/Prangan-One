import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitLeadToFormspree } from '../formspree'

afterEach(() => {
  vi.unstubAllGlobals()
})

const samplePayload = {
  name: 'Kiran Patel', phone: '90000 00000', email: 'kiran@example.com',
  societyName: 'Alpha Repairs', city: 'Surat', flatCount: 0,
  role: 'Owner', mainNeed: 'Quotations', message: 'We need help preparing quotes.',
}

describe('submitLeadToFormspree', () => {
  it('posts JSON to the real Formspree endpoint with the expected fields', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)

    await submitLeadToFormspree(samplePayload)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://formspree.io/f/mnjklkwp')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers.Accept).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body.name).toBe('Kiran Patel')
    expect(body.business_name).toBe('Alpha Repairs')
    expect(body).not.toHaveProperty('society_name')
    expect(body).not.toHaveProperty('flat_count')
    expect(body._subject).toContain('Alpha Repairs')
  })

  it('throws when Formspree responds with a non-ok status, so the caller can show a real error instead of a fake success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    await expect(submitLeadToFormspree(samplePayload)).rejects.toThrow()
  })

  it('propagates a network failure (e.g. offline) as a rejected promise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    await expect(submitLeadToFormspree(samplePayload)).rejects.toThrow('network error')
  })
})
