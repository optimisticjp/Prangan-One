import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from '../NotFound'
import NoAccess from '../NoAccess'
import Login from '../Login'
import { DataProvider } from '../../lib/store'

// The standalone pages (login, no-access, 404) render outside the app/public
// layouts, so each must provide its own single <main> landmark and exactly one
// H1 for screen-reader structure. Regression guard for the Phase 13 axe findings
// (landmark-one-main, region, page-has-heading-one).
afterEach(() => { cleanup(); localStorage.clear() })

function structure(container: HTMLElement) {
  return {
    mains: container.querySelectorAll('main').length,
    h1s: container.querySelectorAll('h1').length,
  }
}

describe('standalone pages expose one main landmark and exactly one H1', () => {
  it('NotFound', () => {
    const { container } = render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(structure(container)).toEqual({ mains: 1, h1s: 1 })
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('આ પાનું મળ્યું નહીં')
  })

  it('NoAccess', () => {
    const { container } = render(<MemoryRouter><NoAccess /></MemoryRouter>)
    expect(structure(container)).toEqual({ mains: 1, h1s: 1 })
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('આ ઈમેલ સાથે હજી કોઈ સોસાયટી જોડાયેલી નથી')
  })

  it('Login (generic session) shows the brand wordmark as the single H1', () => {
    const { container } = render(<MemoryRouter><DataProvider><Login /></DataProvider></MemoryRouter>)
    expect(structure(container)).toEqual({ mains: 1, h1s: 1 })
    expect(screen.getByRole('main')).toBeInTheDocument()
    // The one H1 is the Prangan One wordmark image (accessible name via its alt).
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
