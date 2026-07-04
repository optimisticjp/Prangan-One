import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../../lib/store'
import Join from '../Join'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderJoin() {
  return render(<MemoryRouter><DataProvider><Join /></DataProvider></MemoryRouter>)
}

describe('Join page', () => {
  it('shows the active-confirmation state when the phone matches the flat on file', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'RAJHANS24' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('તમારું નામ'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '+91 90000 00010' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'newperson@example.com' } })
    fireEvent.click(screen.getByText('જોડાઓ'))
    expect(screen.getByText('તમે જોડાઈ ગયા છો!')).toBeInTheDocument()
  })

  it('shows the pending-approval state when the phone does not match', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'RAJHANS24' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '102' } })
    fireEvent.change(screen.getByPlaceholderText('તમારું નામ'), { target: { value: 'Someone' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9999999999' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'pendingperson@example.com' } })
    fireEvent.click(screen.getByText('જોડાઓ'))
    expect(screen.getByText('તમારી વિનંતી કમિટી પાસે મોકલી છે')).toBeInTheDocument()
  })

  it('shows a clear error for an unknown join code', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'BOGUSCODE' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('તમારું નામ'), { target: { value: 'X' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9000000010' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'x@example.com' } })
    fireEvent.click(screen.getByText('જોડાઓ'))
    expect(screen.getByText(/આ કોડ સાચો લાગતો નથી/)).toBeInTheDocument()
  })
})
