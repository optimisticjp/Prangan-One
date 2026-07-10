// @ts-expect-error - no @types/node in this project; fs is genuinely available at runtime in Vitest's node test environment, this is a type-declaration gap only, not a real problem
import { readFileSync } from 'fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * The single most important proof in this whole build: the demo can
 * never, under any circumstance, reach the real database, and this
 * isn't a runtime flag that could be gotten wrong somewhere, it's
 * structural - the demo provider's own source code, and everything it
 * depends on, genuinely never references realData.ts or lib/supabase.ts
 * at all. Two kinds of proof here, deliberately: a static one, reading
 * the actual source text and confirming the reference is genuinely
 * absent (which would catch a future regression directly, the moment
 * someone adds an import that shouldn't be there), and a runtime one,
 * mocking the real modules and confirming a full, real demo session -
 * role picked, payment recorded, complaint filed, notice posted, poll
 * voted on - never calls any of them, not even once.
 */
vi.mock('../realData', async () => {
  const actual = await vi.importActual<typeof import('../realData')>('../realData')
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(actual)) {
    mocked[key] = vi.fn(async () => { throw new Error(`realData.${key} was called from a demo session - this should be structurally impossible`) })
  }
  return mocked
})

vi.mock('../supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    from: () => { throw new Error('supabase.from() was called from a demo session - this should be structurally impossible') },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    rpc: () => { throw new Error('supabase.rpc() was called from a demo session - this should be structurally impossible') },
  },
}))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('static proof: the demo provider\u2019s own source genuinely never references the real data layer at all', () => {
  it('demoStore.tsx contains no reference to realData or lib/supabase, checked directly against the actual file text', () => {
    const source = readFileSync(`${(globalThis as { process?: { cwd: () => string } }).process?.cwd()}/src/lib/demoStore.tsx`, 'utf-8')
    // excludes comment lines explaining the guarantee, which legitimately
    // mention these module names in prose - only a real import matters
    const importLines = source.split('\n').filter((line: string) => /^\s*import\b/.test(line))
    const importText = importLines.join('\n')
    expect(importText).not.toMatch(/realData/)
    expect(importText).not.toMatch(/['"].*supabase['"]/)
  })

  it('demoSeed.ts, the seed data module, also never references either real module', () => {
    const source = readFileSync(`${(globalThis as { process?: { cwd: () => string } }).process?.cwd()}/src/lib/demoSeed.ts`, 'utf-8')
    const importLines = source.split('\n').filter((line: string) => /^\s*import\b/.test(line))
    expect(importLines.join('\n')).not.toMatch(/realData|supabase/)
  })
})

describe('runtime proof: a full, real demo session never calls any real-data or Supabase function, not even once', () => {
  it('picking a role, recording a payment, filing a complaint, and voting on a poll all stay genuinely local', async () => {
    const realData = await import('../realData')
    const { DemoDataProvider } = await import('../demoStore')
    const { useData } = await import('../store')
    const { renderHook } = await import('@testing-library/react')

    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <MemoryRouter><DemoDataProvider>{children}</DemoDataProvider></MemoryRouter>,
    })

    act(() => { result.current.login('society_admin') })
    act(() => { result.current.recordPayment({ flatId: result.current.db.flats[0].id, amount: 1200, mode: 'upi' }) })
    act(() => { result.current.addComplaint({ flatId: result.current.db.flats[0].id, category: 'General', title: 'Zero-network test complaint', detail: '', priority: 'normal' }) })
    act(() => { result.current.addNotice({ title: 'Zero-network test notice', body: '', category: 'general', pinned: false }) })
    act(() => { result.current.addPoll({ question: 'Test?', type: 'yesno', options: ['Yes', 'No'], resultVisible: true }) })
    const pollId = result.current.db.polls[0].id
    act(() => { result.current.vote(pollId, result.current.db.flats[0].id, 0) })

    for (const fn of Object.values(realData)) {
      if (typeof fn === 'function' && 'mock' in fn) {
        expect(fn).not.toHaveBeenCalled()
      }
    }
  })

  it('a full page, rendered under the demo provider, never triggers a real call either - not just the store actions in isolation', async () => {
    const realData = await import('../realData')
    const { DemoDataProvider } = await import('../demoStore')
    const Notices = (await import('../../pages/admin/Notices')).default

    render(<MemoryRouter><DemoDataProvider><Notices /></DemoDataProvider></MemoryRouter>)
    await screen.findByRole('heading', { name: 'નોટિસ બોર્ડ' })

    for (const fn of Object.values(realData)) {
      if (typeof fn === 'function' && 'mock' in fn) {
        expect(fn).not.toHaveBeenCalled()
      }
    }
  })
})
