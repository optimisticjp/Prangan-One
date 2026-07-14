import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { isChunkLoadError, lazyWithRetry } from '../lazyWithRetry'

const GUARD = 'prangan_chunk_reload'

// A stand-in error boundary so we can observe when a failed lazy import
// actually surfaces to the tree (i.e. recovery was NOT attempted / gave up),
// versus staying suspended while a reload is pending.
class Catch extends Component<{ children: ReactNode; onError?: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: Error) { this.props.onError?.(e) }
  render() { return this.state.failed ? <div>boundary-caught</div> : this.props.children }
}

function Ok() { return <div>loaded-ok</div> }

// Mirrors the real cross-browser wording for a stale/missing hashed chunk.
const chunkError = () =>
  new Error('Failed to fetch dynamically imported module: https://x/assets/Pricing-abc123.js')

let reloadMock: ReturnType<typeof vi.fn>
const originalLocation = window.location
// Fixed "now" so the timestamp guard is deterministic. The guard window is
// 10_000ms in the source, so NOW-1000 counts as "just reloaded" and NOW-20000
// counts as an expired (stale) guard.
const NOW = 1_700_000_000_000

beforeEach(() => {
  reloadMock = vi.fn()
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  // jsdom's real reload() throws "Not implemented" and its reload property is
  // non-configurable, so we swap the whole location object (which jsdom does
  // let us redefine on window) for one whose reload we can assert.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: originalLocation.href, origin: originalLocation.origin, pathname: originalLocation.pathname, assign: vi.fn(), replace: vi.fn(), reload: reloadMock },
  })
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation })
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

function renderLazy(importer: () => Promise<{ default: () => JSX.Element }>, onError?: (e: Error) => void) {
  const Lazy = lazyWithRetry(importer)
  return render(
    <Suspense fallback={<div>loading</div>}>
      <Catch onError={onError}><Lazy /></Catch>
    </Suspense>,
  )
}

describe('isChunkLoadError recognises dynamic-import / chunk failures across engines', () => {
  it('matches the known cross-browser wordings', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 12 failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading CSS chunk 3 failed.'))).toBe(true)
    const named = new Error('boom'); named.name = 'ChunkLoadError'
    expect(isChunkLoadError(named)).toBe(true)
  })
  it('does not match ordinary render errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined (reading \'title\')'))).toBe(false)
    expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
  it('does not misclassify a bare "Failed to fetch" (a broken API call, not a chunk)', () => {
    // A failed data fetch throws this exact TypeError; treating it as a chunk
    // error would wrongly retry+reload instead of surfacing the real bug.
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false)
  })
})

describe('lazyWithRetry recovers stale-chunk failures at most once, with no reload loop', () => {
  it('renders the component on a clean import without reloading, even if a stale guard exists', async () => {
    // An expired guard from an earlier event must not affect a healthy import.
    window.sessionStorage.setItem(GUARD, String(NOW - 20_000))
    const importer = vi.fn(async () => ({ default: Ok }))

    renderLazy(importer)

    await screen.findByText('loaded-ok')
    expect(importer).toHaveBeenCalledTimes(1)
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('retries the import once in place and recovers without reloading', async () => {
    const importer = vi.fn()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce({ default: Ok })

    renderLazy(importer)

    await screen.findByText('loaded-ok')
    expect(importer).toHaveBeenCalledTimes(2)
    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('reloads exactly once when both attempts fail and no reload is recorded yet', async () => {
    const importer = vi.fn().mockRejectedValue(chunkError())
    const onError = vi.fn()

    renderLazy(importer, onError)

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))
    expect(importer).toHaveBeenCalledTimes(2)
    // The guard now records WHEN the reload happened (a timestamp), not a bool.
    expect(Number(window.sessionStorage.getItem(GUARD))).toBe(NOW)
    // It stays suspended (never-resolving) awaiting the reload, so it must NOT
    // have surfaced the error to the boundary.
    expect(onError).not.toHaveBeenCalled()
    expect(screen.queryByText('boundary-caught')).not.toBeInTheDocument()
  })

  it('does NOT reload again when a reload was recorded within the window; surfaces to the boundary', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    window.sessionStorage.setItem(GUARD, String(NOW - 1_000)) // 1s ago: still inside the 10s window
    const importer = vi.fn().mockRejectedValue(chunkError())
    const onError = vi.fn()

    renderLazy(importer, onError)

    await screen.findByText('boundary-caught')
    expect(reloadMock).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })

  it('reloads again once the recorded reload has expired (a genuinely later deploy recovers)', async () => {
    window.sessionStorage.setItem(GUARD, String(NOW - 20_000)) // 20s ago: outside the window
    const importer = vi.fn().mockRejectedValue(chunkError())

    renderLazy(importer)

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))
    expect(Number(window.sessionStorage.getItem(GUARD))).toBe(NOW)
  })

  it('does NOT reload when sessionStorage is unavailable; it fails safe to the boundary (no loop)', async () => {
    // Safari private mode / blocked storage: every getItem/setItem throws. If we
    // still reloaded, a permanent failure would reload forever. The guard must
    // refuse to reload when it cannot persist, and surface to the boundary.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const throwing = () => { throw new Error('storage blocked') }
    vi.spyOn(window.sessionStorage.__proto__, 'getItem').mockImplementation(throwing)
    vi.spyOn(window.sessionStorage.__proto__, 'setItem').mockImplementation(throwing)
    const importer = vi.fn().mockRejectedValue(chunkError())
    const onError = vi.fn()

    renderLazy(importer, onError)

    await screen.findByText('boundary-caught')
    expect(reloadMock).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })

  it('re-throws a genuine (non-chunk) render error immediately, without retry or reload', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const importer = vi.fn().mockRejectedValue(new Error('undefined is not a function'))
    const onError = vi.fn()

    renderLazy(importer, onError)

    await screen.findByText('boundary-caught')
    expect(importer).toHaveBeenCalledTimes(1) // no second attempt for a real bug
    expect(reloadMock).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    consoleSpy.mockRestore()
  })
})
