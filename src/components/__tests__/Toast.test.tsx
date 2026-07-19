import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from '../Toast'

function Harness() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.success('સેવ થયું')}>ok</button>
      <button onClick={() => toast.error('ભૂલ થઈ')}>err</button>
    </div>
  )
}

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Toast system', () => {
  it('useToast is a safe no-op with no provider (so an isolated page or test never breaks)', () => {
    render(<Harness />)
    expect(() => fireEvent.click(screen.getByText('ok'))).not.toThrow()
    expect(screen.queryByText('સેવ થયું')).not.toBeInTheDocument()
  })

  it('shows a success toast in a polite live region', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('ok'))
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('સેવ થયું')
  })

  it('shows an error toast in an assertive alert region', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('err'))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveTextContent('ભૂલ થઈ')
  })

  it('collapses a duplicate, still-visible message instead of stacking it', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('ok'))
    fireEvent.click(screen.getByText('ok'))
    expect(screen.getAllByText('સેવ થયું')).toHaveLength(1)
  })

  it('auto-dismisses after its duration elapses', () => {
    vi.useFakeTimers()
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('ok'))
    expect(screen.getByText('સેવ થયું')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(3300) })
    expect(screen.queryByText('સેવ થયું')).not.toBeInTheDocument()
  })

  it('can be dismissed immediately via its close button', () => {
    render(<ToastProvider><Harness /></ToastProvider>)
    fireEvent.click(screen.getByText('ok'))
    fireEvent.click(screen.getByRole('button', { name: 'બંધ કરો' }))
    expect(screen.queryByText('સેવ થયું')).not.toBeInTheDocument()
  })
})
