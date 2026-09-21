import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('login doorway', () => {
  it('separates resident, admin and business login entrances', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Choose your login' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Resident \/ User Login/ })).toHaveAttribute('href', '/user-login')
    expect(screen.getByRole('link', { name: /Admin & Committee Login/ })).toHaveAttribute('href', '/admin-login')
    expect(screen.getByRole('link', { name: /Business Login/ })).toHaveAttribute('href', '/business/login')
  })

  it('keeps society join available without mixing it into authentication', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Request to join/ })).toHaveAttribute('href', '/join')
  })
})
