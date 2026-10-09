import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Features from '../Features'

afterEach(() => { cleanup(); localStorage.clear() })

function renderFeatures(lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  render(<MemoryRouter><Features /></MemoryRouter>)
}

describe('Features page reflects the small-business roadmap', () => {
  it('presents connected workflow stages without claiming they are launched', () => {
    renderFeatures('en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Useful business tools')
    expect(screen.getByText(/Enquiry Tracker and Quotation Studio betas are ready/i)).toBeInTheDocument()
    expect(screen.getByText(/AI will help draft, organize and translate/i)).toBeInTheDocument()
  })
  it('keeps the Gujarati copy scope-accurate', () => {
    renderFeatures('gu')
    expect(screen.getByText(/મફત પૂછપરછ ટ્રેકર અને ક્વોટેશન સ્ટુડિયો બેટા/)).toBeInTheDocument()
    expect(screen.getByText(/વિગતો ચકાસીને શું મોકલવું તે આપ નક્કી કરશો/)).toBeInTheDocument()
  })
})
