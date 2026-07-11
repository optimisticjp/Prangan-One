import { describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { initMonitoring } from '../monitoring'

// Prove the null-until-configured contract: with no DSN (the case in dev and
// in the whole test suite), initMonitoring never creates a Sentry client, so
// nothing is ever sent anywhere.
vi.mock('@sentry/react', () => ({ init: vi.fn(), captureException: vi.fn() }))

describe('monitoring is a no-op without a DSN', () => {
  it('initMonitoring does not initialize Sentry when VITE_SENTRY_DSN is unset', () => {
    initMonitoring()
    expect(Sentry.init).not.toHaveBeenCalled()
  })
})
