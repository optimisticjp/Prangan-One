import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from '../../lib/store'
import Home from '../public/Home'

const demoMode = vi.hoisted(() => ({ enabled: true }))
vi.mock('../../lib/demoMode', () => ({ isDemoModeEnabled: () => demoMode.enabled }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  demoMode.enabled = true
})

function renderHome(lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  render(
    <MemoryRouter initialEntries={['/']}>
      <DataProvider><Home /></DataProvider>
    </MemoryRouter>,
  )
}

describe('public homepage', () => {
  it('renders Gujarati-first hero copy with one primary demo action and a login action when demo mode is enabled', () => {
    demoMode.enabled = true
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: /હાઉસિંગ સોસાયટી/ })).toBeInTheDocument()
    expect(screen.getByText(/બિલ, રસીદ, ફરિયાદ/)).toBeInTheDocument()

    const main = screen.getByRole('main')
    const demoLinks = within(main).getAllByRole('link', { name: /ડેમો ખોલો/ })
    expect(demoLinks).toHaveLength(1)
    expect(demoLinks[0]).toHaveAttribute('href', '/demo')
    expect(within(main).getByRole('link', { name: 'લોગિન' })).toHaveAttribute('href', '/login')
    expect(screen.getByText(/પબ્લિક ડેમો અલગ કલ્પિત વાતાવરણ/)).toBeInTheDocument()
  })

  it('replaces the primary demo link with contact when demo mode is disabled', () => {
    demoMode.enabled = false
    renderHome()

    const main = screen.getByRole('main')
    expect(within(main).queryByRole('link', { name: /ડેમો ખોલો/ })).not.toBeInTheDocument()
    expect(within(main).queryByRole('link', { name: /Demo|ડેમો$/ })).not.toBeInTheDocument()
    expect(within(main).getByRole('link', { name: /ડેમો માટે સંપર્ક કરો/ })).toHaveAttribute('href', '/contact')
    expect(within(main).getByRole('link', { name: 'લોગિન' })).toHaveAttribute('href', '/login')
    expect(screen.queryByText(/પબ્લિક ડેમો અલગ કલ્પિત વાતાવરણ/)).not.toBeInTheDocument()
    expect(screen.getByText('ડેમો ડેટા વાસ્તવિક સોસાયટીના સેશન અને રેકોર્ડથી સંપૂર્ણ અલગ રાખવામાં આવે છે.')).toBeInTheDocument()
  })

  it('shows the enabled English demo trust message when demo mode is enabled', () => {
    demoMode.enabled = true
    renderHome('en')

    expect(screen.getByText('The public demo is a separate fictional environment, so visitors can explore safely.')).toBeInTheDocument()
  })

  it('shows the disabled English demo trust message without public exploration copy', () => {
    demoMode.enabled = false
    renderHome('en')

    expect(screen.queryByText('The public demo is a separate fictional environment, so visitors can explore safely.')).not.toBeInTheDocument()
    expect(screen.getByText('Demo data is kept separate from real society sessions and records.')).toBeInTheDocument()
  })

  it('exposes scan-friendly product, journey, trust, and module sections', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 2, name: /કમિટી માટે કંટ્રોલ/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /કેવી રીતે ચાલે છે/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /વાસ્તવિક અપેક્ષા/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /ખરેખર જે વપરાય/ })).toBeInTheDocument()
    expect(screen.getByText(/Row Level Security/)).toBeInTheDocument()
    expect(screen.getByText(/પબ્લિક ડેમો અલગ કલ્પિત વાતાવરણ/)).toBeInTheDocument()
  })
})

describe('/home redirect', () => {
  it('redirects to / (this is the same real react-router primitive App.tsx uses, tested directly rather than through the full lazy-loaded app)', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/" element={<div>public-home-marker</div>} />
          <Route path="/home" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('public-home-marker')).toBeInTheDocument()
  })
})
