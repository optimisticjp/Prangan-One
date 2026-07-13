import type { ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Privacy from '../Privacy'
import Terms from '../Terms'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderPublic(page: ReactElement, lang: 'en' | 'gu' = 'gu') {
  localStorage.setItem('prangan_public_lang', lang)
  render(<MemoryRouter>{page}</MemoryRouter>)
}

describe('Privacy page', () => {
  it('states the actual current state of owner access, not vague boilerplate', () => {
    renderPublic(<Privacy />)
    expect(screen.getByText(/દરેક સોસાયટીના ડેટાની સ્ટેન્ડિંગ રીડ-એક્સેસ \(વાંચવાની એક્સેસ\)/)).toBeInTheDocument()
  })

  it('also states the real, current write-blocking safeguard during an active support session, not just standing read access', () => {
    renderPublic(<Privacy />)
    expect(screen.getByText(/આપની સોસાયટીના ડેટામાં કંઈ લખવાની મંજૂરી નથી ધરાવતું/)).toBeInTheDocument()
  })


  it('describes service-related use without an unapproved marketing-list promise', () => {
    renderPublic(<Privacy />, 'en')
    expect(screen.getByText(/provide, maintain, secure, support, and communicate about Prangan One for the society/)).toBeInTheDocument()
    expect(screen.queryByText(/marketing list/)).not.toBeInTheDocument()
    cleanup()

    renderPublic(<Privacy />)
    expect(screen.getByText(/સેવા આપવા, જાળવવા, સુરક્ષિત રાખવા, સપોર્ટ આપવા અને સેવા સંબંધિત જરૂરી સંપર્ક/)).toBeInTheDocument()
    expect(screen.queryByText(/માર્કેટિંગ યાદી/)).not.toBeInTheDocument()
  })

  it('uses conservative Gujarati deletion/export process wording without promising completion', () => {
    renderPublic(<Privacy />)
    expect(screen.getByText(/ઉપલબ્ધ રેકોર્ડના એક્સપોર્ટ અથવા ડેટા હટાવવાની વિનંતી/)).toBeInTheDocument()
    expect(screen.getByText(/લાગુ કરાર, કાનૂની જવાબદારીઓ/)).toBeInTheDocument()
    expect(screen.queryByText(/ડેટા ડિલીટ કરાવવો હોય, અમને લખો/)).not.toBeInTheDocument()
  })

  it('uses equivalent conservative English deletion/export process wording', () => {
    renderPublic(<Privacy />, 'en')
    expect(screen.getByText(/request deletion or export of available records/)).toBeInTheDocument()
    expect(screen.getByText(/applicable agreement, legal obligations/)).toBeInTheDocument()
    expect(screen.queryByText(/we will do it/)).not.toBeInTheDocument()
  })

  it('keeps security incident communication conservative in both languages', () => {
    renderPublic(<Privacy />)
    expect(screen.getByText(/મૂલ્યાંકન કરી લાગુ કાનૂની અને કરારની જવાબદારીઓ મુજબ/)).toBeInTheDocument()
    expect(screen.queryByText(/તરત જ/)).not.toBeInTheDocument()
    cleanup()

    renderPublic(<Privacy />, 'en')
    expect(screen.getByText(/communicate with the appropriate society contact according to applicable legal and contractual obligations/)).toBeInTheDocument()
    expect(screen.queryByText(/as soon as we reasonably can/)).not.toBeInTheDocument()
  })

  it('does not promise a full data export beyond available export options', () => {
    renderPublic(<Privacy />, 'en')
    expect(screen.getByText(/available export options/)).toBeInTheDocument()
    expect(screen.queryByText(/full data export/)).not.toBeInTheDocument()
  })
})

describe('Terms page', () => {
  it('states the real trial length and pricing, matching the actual pricing page', () => {
    renderPublic(<Terms />)
    expect(screen.getByText(/90 દિવસ મફત/)).toBeInTheDocument()
    expect(screen.getByText(/ઓછામાં ઓછું ₹499/)).toBeInTheDocument()
    expect(screen.getByText(/ઓનલાઈન ચુકવણી ગેટવે નથી/)).toBeInTheDocument()
  })

  it('describes the real grace-period and read-only behavior, not a vague cutoff', () => {
    renderPublic(<Terms />)
    expect(screen.getByText(/14 દિવસનો ગ્રેસ પિરિયડ/)).toBeInTheDocument()
    expect(screen.getByText(/ફક્ત જોવા માટે રહે છે/)).toBeInTheDocument()
    expect(screen.getByText(/ઉપલબ્ધ એક્સપોર્ટ/)).toBeInTheDocument()
  })

  it('keeps Gujarati section coverage equivalent to the English Terms', () => {
    renderPublic(<Terms />)
    for (const heading of [
      'સેવા', 'ટ્રાયલ અને કિંમત', 'ચુકવણી ચૂકી જાય તો શું', 'આપની સોસાયટીનો ડેટા',
      'આપ શું સંમત થાઓ છો', 'અમે હજુ શું બનાવી રહ્યા છીએ', 'અમારી જવાબદારીની મર્યાદા',
      'શરતોમાં ફેરફાર', 'સંપર્ક',
    ]) {
      if (heading === 'સંપર્ક') expect(screen.getAllByText(heading).length).toBeGreaterThan(0)
      else expect(screen.getByText(heading)).toBeInTheDocument()
    }
    expect(screen.getByText(/વૈધાનિક પાલન જવાબદારીઓનો વિકલ્પ નથી/)).toBeInTheDocument()
    expect(screen.getByText(/તબક્કાવાર બને છે/)).toBeInTheDocument()
  })


  it('keeps Terms-change notification conservative and equivalent', () => {
    renderPublic(<Terms />, 'en')
    expect(screen.getByText(/Where appropriate and operationally available/)).toBeInTheDocument()
    expect(screen.getByText(/may also notify the society admin through an available contact channel/)).toBeInTheDocument()
    expect(screen.queryByText(/tell your society’s admin directly/)).not.toBeInTheDocument()
    cleanup()

    renderPublic(<Terms />)
    expect(screen.getByText(/યોગ્ય અને વ્યવહારિક રીતે શક્ય હોય ત્યારે/)).toBeInTheDocument()
    expect(screen.getByText(/ઉપલબ્ધ સંપર્ક માધ્યમથી સોસાયટીના એડમિનને પણ જાણ કરી શકીએ છીએ/)).toBeInTheDocument()
    expect(screen.queryByText(/જાણ કરવાનો પ્રયત્ન કરીશું/)).not.toBeInTheDocument()
  })

  it('keeps English section coverage and softened data-control wording', () => {
    renderPublic(<Terms />, 'en')
    for (const heading of [
      'The service', 'Trial and pricing', 'What happens if payment lapses', 'Your society’s records',
      'What you agree to', 'What we are still building', 'Limits on our liability',
      'Changes to these terms', 'Contact',
    ]) {
      if (heading === 'Contact') expect(screen.getAllByText(heading).length).toBeGreaterThan(0)
      else expect(screen.getByText(heading)).toBeInTheDocument()
    }
    expect(screen.getAllByText(/available exports/).length).toBeGreaterThan(0)
    expect(screen.getByText(/deletion and retention are handled under the Privacy Policy/)).toBeInTheDocument()
    expect(screen.queryByText('Your data is yours')).not.toBeInTheDocument()
    expect(screen.queryByText(/belongs to you/i)).not.toBeInTheDocument()
  })
})
