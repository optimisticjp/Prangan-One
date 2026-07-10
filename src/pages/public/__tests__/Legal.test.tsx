import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Privacy from '../Privacy'
import Terms from '../Terms'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Privacy page', () => {
  it('states the actual current state of owner access, not vague boilerplate', () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>)
    expect(screen.getByText(/દરેક સોસાયટીના ડેટાની સ્ટેન્ડિંગ read એક્સેસ/)).toBeInTheDocument()
  })

  it('also states the real, current write-blocking safeguard during an active support session, not just standing read access', () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>)
    expect(screen.getByText(/તમારી સોસાયટીના ડેટામાં કંઈ લખવાની મંજૂરી નથી ધરાવતું/)).toBeInTheDocument()
  })

  it('gives a real contact address for privacy questions', () => {
    render(<MemoryRouter><Privacy /></MemoryRouter>)
    expect(screen.getByText(/privacy@pranganone\.com/)).toBeInTheDocument()
  })
})

describe('Terms page', () => {
  it('states the real trial length and pricing, matching the actual pricing page', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>)
    expect(screen.getByText(/90 દિવસ મફત/)).toBeInTheDocument()
    expect(screen.getByText(/ઓછામાં ઓછું ₹499/)).toBeInTheDocument()
  })

  it('describes the real grace-period behavior, not a vague cutoff', () => {
    render(<MemoryRouter><Terms /></MemoryRouter>)
    expect(screen.getByText(/14 દિવસનો ગ્રેસ પિરિયડ/)).toBeInTheDocument()
  })
})
