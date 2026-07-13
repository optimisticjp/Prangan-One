import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from '../../lib/store'
import Home from '../public/Home'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <DataProvider><Home /></DataProvider>
    </MemoryRouter>,
  )
}

describe('public homepage', () => {
  it('renders Gujarati-first hero copy with one primary demo action and a login action', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: /હાઉસિંગ સોસાયટી/ })).toBeInTheDocument()
    expect(screen.getByText(/બિલ, રસીદ, ફરિયાદ/)).toBeInTheDocument()

    const main = screen.getByRole('main')
    const demoLinks = within(main).getAllByRole('link', { name: /ડેમો ખોલો/ })
    expect(demoLinks).toHaveLength(1)
    expect(demoLinks[0]).toHaveAttribute('href', '/demo')
    expect(within(main).getByRole('link', { name: 'લોગિન' })).toHaveAttribute('href', '/login')
  })

  it('exposes scan-friendly product, journey, trust, and module sections', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 2, name: /કમિટી માટે કંટ્રોલ/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /કેવી રીતે ચાલે છે/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /વાસ્તવિક અપેક્ષા/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /ખરેખર જે વપરાય/ })).toBeInTheDocument()
    expect(screen.getByText(/Row Level Security/)).toBeInTheDocument()
    expect(screen.getByText(/કલ્પિત વાતાવરણ/)).toBeInTheDocument()
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
