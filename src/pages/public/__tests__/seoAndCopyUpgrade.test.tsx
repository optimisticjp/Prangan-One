import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import Faq from '../Faq'
import Pricing from '../Pricing'
import Features from '../Features'

afterEach(() => { cleanup(); localStorage.clear() })

function renderPublic(page: React.ReactElement, lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

function metaDescription() {
  return document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
}

describe('Prangan early-access positioning and public metadata', () => {
  it('describes the new direction accurately without claiming a live product', () => {
    renderPublic(<Home />, 'en')
    expect(screen.getByRole('heading', { level: 1, name: 'Less busywork. More business.' })).toBeInTheDocument()
    expect(screen.getByText(/NOT A LIVE PRODUCT/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Join early access/ })).toHaveAttribute('href', '/contact')
    expect(metaDescription()).toMatch(/multilingual AI business tools/)
    expect(metaDescription()).toMatch(/quotation drafts/)
  })

  it('keeps Gujarati messaging and early-access copy available', () => {
    renderPublic(<Home />, 'gu')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ઓછું કાગળકામ')
    expect(metaDescription()).toContain('પ્રાંગણવન')
    expect(metaDescription()).toContain('વ્યવસાય')
    expect(screen.getByRole('link', { name: /અર્લી એક્સેસ માટે સંપર્ક કરો/ })).toHaveAttribute('href', '/contact')
  })

  it('does not advertise nonexistent subscription prices', () => {
    renderPublic(<Pricing />, 'en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Pricing is not announced yet.')
    expect(screen.getByText(/no paid subscription/i)).toBeInTheDocument()
    expect(screen.queryByText(/₹10 per flat/i)).not.toBeInTheDocument()
    expect(metaDescription()).toContain('Pricing is not yet available')
  })

  it('marks roadmap tools as planned, not already available', () => {
    renderPublic(<Features />, 'en')
    expect(screen.getByText(/Multilingual AI assistance and connected customer workflows are still in development/)).toBeInTheDocument()
    expect(screen.getByText(/You will review details and choose what to send/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Join early access/ })).toHaveAttribute('href', '/contact')
  })
})

describe('FAQ structured metadata', () => {
  it('uses the exact visible questions/answers in FAQPage JSON-LD', () => {
    renderPublic(<Faq />)
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => JSON.parse(s.textContent ?? '{}'))
    const faq = scripts.find(s => s['@type'] === 'FAQPage')
    expect(faq).toBeDefined()
    expect(faq.mainEntity.length).toBe(8)
    expect(faq.mainEntity[0].name).toContain('પ્રાંગણવન શું બનાવી રહ્યું છે?')
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain('ક્વોટેશન')
  })
})
