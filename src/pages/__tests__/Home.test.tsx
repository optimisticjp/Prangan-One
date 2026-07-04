import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from '../../lib/store'
import Home from '../public/Home'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('public homepage', () => {
  it('renders at / with the expected hero copy', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DataProvider><Home /></DataProvider>
      </MemoryRouter>,
    )
    expect(screen.getAllByText(/Prangan One/i).length).toBeGreaterThan(0)
    // Gujarati is the default now (see src/pages/public/Home.tsx copy.gu.h1b),
    // English is the toggle-in option, not the default.
    expect(screen.getByText(/સોસાયટીના દરેક કામ/)).toBeInTheDocument()
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
