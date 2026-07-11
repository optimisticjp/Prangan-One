import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
import { reportError } from '../../lib/monitoring'

vi.mock('../../lib/monitoring', () => ({ reportError: vi.fn() }))

function Boom(): never {
  throw new Error('kaboom')
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ErrorBoundary reports caught render errors to monitoring', () => {
  it('calls reportError with the thrown error and a componentStack, and still shows recovery UI', () => {
    // React logs the caught error via console.error; silence it so the test
    // output stays clean (this is expected noise, not a failure).
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ErrorBoundary><Boom /></ErrorBoundary>)

    // The existing Gujarati recovery screen still renders.
    expect(screen.getByText('કંઈક ખોટું થયું')).toBeInTheDocument()

    // ...and the error was reported with safe, structured context.
    expect(reportError).toHaveBeenCalled()
    const [err, ctx] = vi.mocked(reportError).mock.calls[0]
    expect((err as Error).message).toBe('kaboom')
    expect(ctx).toMatchObject({ boundary: 'root' })
    expect(typeof (ctx as Record<string, unknown>).componentStack).toBe('string')

    consoleSpy.mockRestore()
  })
})
