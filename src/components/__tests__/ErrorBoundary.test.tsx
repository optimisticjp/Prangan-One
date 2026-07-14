import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

describe('ErrorBoundary recovery is public-safe, not login-only', () => {
  it('offers Retry and Home and a support email, and no longer forces a login redirect', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ErrorBoundary><Boom /></ErrorBoundary>)

    // Retry action is present as a real button.
    expect(screen.getByRole('button', { name: /ફરી પ્રયાસ કરો/ })).toBeInTheDocument()

    // Home goes to the public root (always in the main bundle, so it loads even
    // if the failure was a lazy chunk).
    expect(screen.getByRole('link', { name: /હોમ પર જાઓ/ })).toHaveAttribute('href', '/')

    // Support email is a mailto, and the raw error message is never surfaced.
    expect(screen.getByRole('link', { name: /care@pranganone\.com/ })).toHaveAttribute('href', 'mailto:care@pranganone.com')
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument()

    // The old login-only exit is gone.
    expect(screen.queryByText(/લોગિન પર જાઓ/)).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('clicking Retry re-renders the subtree and recovers once the underlying error is gone', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('transient')
      return <div>recovered-content</div>
    }

    render(<ErrorBoundary><Flaky /></ErrorBoundary>)
    expect(screen.getByText('કંઈક ખોટું થયું')).toBeInTheDocument()

    // The condition that caused the crash has cleared; retry should recover.
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /ફરી પ્રયાસ કરો/ }))

    expect(screen.getByText('recovered-content')).toBeInTheDocument()
    expect(screen.queryByText('કંઈક ખોટું થયું')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
