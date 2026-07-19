import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { Button } from '../ui'

afterEach(cleanup)

describe('Button loading state', () => {
  it('marks itself busy and disabled while loading, keeping the label mounted for width stability', () => {
    render(<Button loading>સેવ કરો</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn).toBeDisabled()
    // The label is not swapped out - it stays in the DOM so the button keeps
    // its exact width (no layout shift), with the spinner shown over it.
    expect(screen.getByText('સેવ કરો')).toBeInTheDocument()
    expect(btn.querySelector('svg')).toBeInTheDocument()
  })

  it('does not invoke onClick while loading', () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>જાઓ</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is interactive and not busy when idle', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>જાઓ</Button>)
    const btn = screen.getByRole('button')
    expect(btn).not.toHaveAttribute('aria-busy')
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('honors an explicit disabled prop independent of loading', () => {
    render(<Button disabled>જાઓ</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })
})
