import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from '../public/Home'

afterEach(() => { cleanup(); localStorage.clear() })

function renderHome(lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  render(<MemoryRouter initialEntries={['/']}><Home /></MemoryRouter>)
}

describe('public homepage', () => {
  it('shows honest Gujarati-first prelaunch copy and one main early-access action', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: /ઓછું કાગળકામ/ })).toBeInTheDocument()
    expect(screen.getByText(/વિકાસ ચાલુ છે · અર્લી એક્સેસ/)).toBeInTheDocument()
    const main = screen.getByRole('main')
    const early = within(main).getAllByRole('link', { name: /અર્લી એક્સેસ માટે સંપર્ક કરો/ })
    expect(early).toHaveLength(1)
    expect(early[0]).toHaveAttribute('href', '/contact')
    expect(screen.getByText(/લાઇવ પ્રોડક્ટ નથી/)).toBeInTheDocument()
  })

  it('keeps the society entry available but separate from business AI positioning', () => {
    renderHome()
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: /સોસાયટી લોગિન/ })).toHaveAttribute('href', '/login')
    expect(within(footer).getByRole('link', { name: /સોસાયટી ડેમો/ })).toHaveAttribute('href', '/demo')
    expect(within(screen.getByRole('main')).queryByRole('link', { name: /ડેમો ખોલો/ })).not.toBeInTheDocument()
  })

  it('describes planned rather than shipped AI capabilities in English', () => {
    renderHome('en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Less busywork. More business.')
    expect(screen.getByText(/A preview of the workflow we are building/)).toBeInTheDocument()
    expect(screen.getByText(/We are interviewing business owners/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Join early access/ })).toHaveAttribute('href', '/contact')
  })

  it('makes product stages and principles discoverable', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: /ગ્રાહકના મેસેજથી તૈયાર ક્વોટેશન સુધી/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /સૌપ્રથમ બનાવવાના ટૂલ્સ/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /નાના વ્યવસાયની રોજની જરૂરિયાત/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /એક ઉપયોગી કામથી શરૂઆત/ })).toBeInTheDocument()
  })
})

describe('/home redirect', () => {
  it('redirects to / using React Router', () => {
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
