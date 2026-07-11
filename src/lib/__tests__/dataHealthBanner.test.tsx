import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FetchErrorBanner } from '../../components/FetchErrorBanner'
import type { DataHealth } from '../storeContext'

/**
 * Proves each distinguishable connection-health state actually renders
 * differently, with injected timestamps and a pinned clock (fake timers), not
 * wall-clock time. useData is mocked so each state's exact dataHealth can be
 * fed in directly and the rendered result asserted, including the specific
 * "data is three hours old" case the model exists to make visible.
 *
 * The healthy states are a quiet role="status" corner chip; the wrong ones
 * (offline, failed) are the prominent role="alert" red banner - that
 * status-vs-alert split is itself part of what makes them tell-apart-able.
 */
const h = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('../store', () => ({ useData: () => h.value }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const NOW = Date.UTC(2026, 6, 11, 12, 0, 0)
const MIN = 60 * 1000
const HOUR = 60 * MIN

function realSession(dataHealth: DataHealth) {
  h.value = { session: { isRealSession: true }, dataHealth, retryFetch: () => {} }
}
const base: DataHealth = { refreshState: 'idle', lastRefreshSuccessAt: NOW - 30 * 1000, lastRefreshFailureAt: null, offline: false, pendingWriteCount: 0 }

describe('the data-health banner renders each state distinguishably', () => {
  it('synced and current: a quiet corner status showing the real age, not a red alert', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    realSession({ ...base, lastRefreshSuccessAt: NOW - 30 * 1000 })
    render(<FetchErrorBanner />)

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('અપડેટ થયું: હમણાં જ')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('actively refreshing: a quiet status that says so, distinct from synced', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    realSession({ ...base, refreshState: 'refreshing' })
    render(<FetchErrorBanner />)

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('અપડેટ થાય છે')
    expect(status.textContent).not.toContain('અપડેટ થયું:')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offline: the prominent red alert, wording about being offline, no quiet chip', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    realSession({ ...base, offline: true })
    render(<FetchErrorBanner />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('ઓફલાઇન')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('refresh failed after data had loaded: red alert showing the real cached-data age (3 hours), not a bare failure', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    // Succeeded 3 hours ago, then a refresh failed just now.
    realSession({ ...base, lastRefreshSuccessAt: NOW - 3 * HOUR, lastRefreshFailureAt: NOW })
    render(<FetchErrorBanner />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('છેલ્લે અપડેટ: 3 કલાક પહેલાં')
    // and a retry is offered
    expect(screen.getByText('ફરી પ્રયત્ન')).toBeInTheDocument()
  })

  it('the same failure shows a different age when the cached data is only minutes old, proving the timestamp is real', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    realSession({ ...base, lastRefreshSuccessAt: NOW - 5 * MIN, lastRefreshFailureAt: NOW })
    render(<FetchErrorBanner />)

    expect(screen.getByRole('alert').textContent).toContain('છેલ્લે અપડેટ: 5 મિનિટ પહેલાં')
  })

  it('local changes waiting to sync: the quiet status shows the pending count, distinct from a clean synced state', () => {
    vi.useFakeTimers(); vi.setSystemTime(NOW)
    realSession({ ...base, lastRefreshSuccessAt: NOW - 10 * 1000, pendingWriteCount: 2 })
    render(<FetchErrorBanner />)

    expect(screen.getByRole('status').textContent).toContain('2 સેવ બાકી')
  })

  it('a non-real session (demo or local-fallback, no dataHealth) renders nothing at all', () => {
    h.value = { session: { isRealSession: false }, dataHealth: undefined, retryFetch: () => {} }
    render(<FetchErrorBanner />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
