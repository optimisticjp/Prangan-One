import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../Home'
import Faq from '../Faq'
import Pricing from '../Pricing'
import Features from '../Features'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderPublic(page: React.ReactElement, lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  return render(<MemoryRouter>{page}</MemoryRouter>)
}

function metaDescription() {
  return document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
}

describe('FAQ page exposes valid FAQPage JSON-LD from its own question data', () => {
  it('injects one FAQPage schema whose questions/answers reuse the visible items', () => {
    renderPublic(<Faq />)
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => JSON.parse(s.textContent ?? '{}'))
    const faq = scripts.find(s => s['@type'] === 'FAQPage')
    expect(faq).toBeDefined()
    expect(Array.isArray(faq.mainEntity)).toBe(true)
    // Same count as the rendered questions - the schema reuses the page data,
    // it is not a second hand-maintained list.
    expect(faq.mainEntity.length).toBe(12)
    const first = faq.mainEntity[0]
    expect(first['@type']).toBe('Question')
    expect(first.acceptedAnswer['@type']).toBe('Answer')
    // The first Gujarati question and answer both flow into the schema.
    expect(first.name).toContain('રહેવાસીઓને ટેક્નિકલ જ્ઞાન જોઈએ?')
    expect(first.acceptedAnswer.text).toContain('ચાર બટન')
  })
})

describe('Home SEO metadata carries brand, Surat/Gujarat relevance and product terms', () => {
  it('sets a Gujarati meta description with the brand, region and core modules', () => {
    renderPublic(<Home />, 'gu')
    const desc = metaDescription()
    expect(desc).toContain('Prangan One')
    expect(desc).toContain('સુરત')
    expect(desc).toContain('ગુજરાતી-પ્રથમ')
    expect(desc).toMatch(/બિલિંગ|રસીદ|ફરિયાદ|નોટિસ/)
    expect(document.title).toContain('Prangan One')
  })

  it('sets an English meta description with the brand, region and product terms', () => {
    renderPublic(<Home />, 'en')
    const desc = metaDescription()
    expect(desc).toContain('Prangan One')
    expect(desc).toMatch(/Surat/)
    expect(desc).toMatch(/billing|receipts|complaints|notices/i)
  })
})

describe('Home pricing line is informational, shown as a navigational card, not a bare no-op button', () => {
  it('renders the exact pricing figures inside a link that actually navigates to /pricing', () => {
    renderPublic(<Home />, 'gu')
    const line = screen.getByText(/ફ્લેટ દીઠ મહિને ₹10, સોસાયટી દીઠ ઓછામાં ઓછું ₹499\./)
    // The figures are preserved verbatim.
    expect(line.textContent).toContain('₹10')
    expect(line.textContent).toContain('₹499')
    // It performs a real action (navigates to the pricing page) rather than
    // being a tappable <button> that does nothing.
    const anchor = line.closest('a')
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('/pricing')
    expect(line.closest('button')).toBeNull()
  })
})

describe('Pricing metadata and CTA', () => {
  it('meta description includes society-maintenance-software pricing keywords and the exact figures', () => {
    renderPublic(<Pricing />, 'gu')
    const desc = metaDescription()
    expect(desc).toContain('સોસાયટી મેન્ટેનન્સ સોફ્ટવેર')
    expect(desc).toContain('₹499')
    expect(desc).toContain('₹10')
  })

  it('uses the short setup CTA, with the full explanatory note kept as supporting text', () => {
    renderPublic(<Pricing />, 'gu')
    expect(screen.getByText('સેટઅપ વિનંતી કરો')).toBeInTheDocument()
    expect(screen.queryByText('સોસાયટી સેટઅપની વિનંતી કરો')).not.toBeInTheDocument()
    // The longer meaning is preserved nearby as the pricing note.
    expect(screen.getByText(/અમે આપની સોસાયટીને સીધા ઓનબોર્ડ કરીએ છીએ/)).toBeInTheDocument()
  })
})

describe('Features CTA is shortened with supporting context', () => {
  it('shows the short button and keeps the full invitation as supporting text', () => {
    renderPublic(<Features />, 'gu')
    expect(screen.getByText('સેટઅપ વિનંતી કરો')).toBeInTheDocument()
    expect(screen.queryByText('સોસાયટી સેટઅપની વિનંતી કરો')).not.toBeInTheDocument()
    expect(screen.getByText(/આપની સોસાયટી વિશે જણાવો/)).toBeInTheDocument()
  })
})
