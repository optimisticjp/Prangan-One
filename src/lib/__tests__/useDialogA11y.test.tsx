import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useRef, useState } from 'react'
import { useDialogA11y } from '../useDialogA11y'

afterEach(cleanup)

/**
 * A minimal stand-in for how both Modal and the mobile drawer actually
 * use this hook - a real dialog with real focusable elements inside it,
 * not a synthetic test double. Testing the hook this way rather than
 * only unit-testing its internals means these tests would have caught
 * the actual, real gap the audit found: a drawer that was visually
 * modal but not behaviorally modal.
 */
function TestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogA11y(open, onClose, ref)
  if (!open) return null
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button>First</button>
      <button>Middle</button>
      <button>Last</button>
    </div>
  )
}

describe('useDialogA11y', () => {
  it('Escape calls onClose - the exact behavior the drawer was missing before this was extracted and shared', () => {
    const onClose = vi.fn()
    render(<TestDialog open={true} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the dialog on open, onto the first focusable element', () => {
    render(<TestDialog open={true} onClose={vi.fn()} />)
    expect(screen.getByText('First')).toHaveFocus()
  })

  it('Tab from the last focusable element wraps back to the first, staying trapped inside the dialog', () => {
    render(<TestDialog open={true} onClose={vi.fn()} />)
    screen.getByText('Last').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByText('First')).toHaveFocus()
  })

  it('Shift+Tab from the first focusable element wraps back to the last', () => {
    render(<TestDialog open={true} onClose={vi.fn()} />)
    screen.getByText('First').focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByText('Last')).toHaveFocus()
  })

  it('restores focus to whatever opened the dialog once it closes', () => {
    function Wrapper() {
      const [open, setOpenState] = useState(false)
      return (
        <div>
          <button onClick={() => setOpenState(true)}>Open</button>
          <TestDialog open={open} onClose={() => setOpenState(false)} />
        </div>
      )
    }
    render(<Wrapper />)
    const openButton = screen.getByText('Open')
    openButton.focus()
    fireEvent.click(openButton)
    expect(screen.getByText('First')).toHaveFocus() // moved into the dialog
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(openButton).toHaveFocus() // and back to where it started
  })

  it('does nothing at all while closed - no listener left attached, no focus stolen', () => {
    const onClose = vi.fn()
    render(<TestDialog open={false} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('a real, previously-shipped bug: typing into a field inside the dialog must not steal focus back to the first focusable element, even though every real caller of Modal passes onClose as a fresh inline function on every single render', () => {
    function RealisticForm() {
      const [open, setOpen] = useState(true)
      const [value, setValue] = useState('')
      const ref = useRef<HTMLDivElement>(null)
      useDialogA11y(open, () => setOpen(false), ref)
      if (!open) return null
      return (
        <div ref={ref} role="dialog" aria-modal="true">
          <button aria-label="close">X</button>
          <input aria-label="flat number" value={value} onChange={e => setValue(e.target.value)} />
        </div>
      )
    }
    render(<RealisticForm />)
    const input = screen.getByLabelText('flat number')
    input.focus()
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: 'a' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: 'a6' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: 'a602' } })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('a602')
  })
})
