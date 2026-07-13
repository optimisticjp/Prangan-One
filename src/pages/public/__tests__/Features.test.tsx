import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Features from '../Features'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderFeatures(lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  render(<MemoryRouter><Features /></MemoryRouter>)
}

describe('Features public copy', () => {
  it('states verified one-vote-per-flat wording without overclaiming ballot secrecy', () => {
    renderFeatures('en')
    expect(screen.getByText(/One vote per flat is enforced for resident voting/)).toBeInTheDocument()
    expect(screen.queryByText(/not just trusted/)).not.toBeInTheDocument()
  })

  it('uses neutral wording for claims that are not fully enforced', () => {
    renderFeatures('en')
    expect(screen.getByText(/parking slots, with clear slot details/)).toBeInTheDocument()
    expect(screen.queryByText(/duplicate-assignment warnings/)).not.toBeInTheDocument()
    expect(screen.getByText(/upcoming renewals are easier for the committee to review/)).toBeInTheDocument()
    expect(screen.queryByText(/before an AMC quietly expires/)).not.toBeInTheDocument()
  })

  it('keeps Gujarati feature wording concise and scope-accurate', () => {
    renderFeatures('gu')
    expect(screen.getByText(/રહેવાસી મતદાનમાં એક ફ્લેટ દીઠ એક મત લાગુ થાય છે/)).toBeInTheDocument()
    expect(screen.getByText(/કમિટી સમીક્ષા માટે સ્પષ્ટ સ્લોટ વિગતો/)).toBeInTheDocument()
    expect(screen.getByText(/જ્યાં મોડ્યુલ સપોર્ટ કરે ત્યાં સમીક્ષા\/એક્સપોર્ટ/)).toBeInTheDocument()
  })
})
