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
  it('shows the active-confirmation state when the email matches what is on file for the flat', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'RAJHANS24' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('આપનું નામ'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9999999999' } }) // deliberately not the flat's real phone - shouldn't matter
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'alpeshbhai@example.com' } }) // matches flat_101's seeded email
    fireEvent.click(screen.getByText('જોડાવાની વિનંતી મોકલો'))
    expect(screen.getByText('આપ જોડાઈ ગયા છો!')).toBeInTheDocument()
  })

  it('shows the pending-approval state when the phone does not match', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'RAJHANS24' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '102' } })
    fireEvent.change(screen.getByPlaceholderText('આપનું નામ'), { target: { value: 'Someone' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9999999999' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'pendingperson@example.com' } })
    fireEvent.click(screen.getByText('જોડાવાની વિનંતી મોકલો'))
    expect(screen.getByText('આપની વિનંતી કમિટી પાસે મોકલી છે')).toBeInTheDocument()
  })

  it('shows a clear error for an unknown join code', () => {
    renderJoin()
    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'BOGUSCODE' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('આપનું નામ'), { target: { value: 'X' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9000000010' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'x@example.com' } })
    fireEvent.click(screen.getByText('જોડાવાની વિનંતી મોકલો'))
    expect(screen.getByText(/આ કોડ મળ્યો નથી/)).toBeInTheDocument()
  })

  it('uses respectful Gujarati labels and actionable join errors', () => {
    renderJoin()
    expect(screen.getByRole('heading', { name: /આપની સોસાયટીમાં જોડાવાની વિનંતી મોકલો/ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('આપનું નામ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'જોડાવાની વિનંતી મોકલો' })).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/સોસાયટી કોડ/), { target: { value: 'RAJHANS24' } })
    fireEvent.change(screen.getByPlaceholderText('ફ્લેટ નંબર'), { target: { value: '999' } })
    fireEvent.change(screen.getByPlaceholderText('આપનું નામ'), { target: { value: 'X' } })
    fireEvent.change(screen.getByPlaceholderText('ફોન નંબર'), { target: { value: '9000000010' } })
    fireEvent.change(screen.getByPlaceholderText('ઈમેલ'), { target: { value: 'x@example.com' } })
    fireEvent.click(screen.getByText('જોડાવાની વિનંતી મોકલો'))
    expect(screen.getByText(/કૃપા કરીને નંબર તપાસીને ફરી પ્રયાસ કરો/)).toBeInTheDocument()
  })
})
