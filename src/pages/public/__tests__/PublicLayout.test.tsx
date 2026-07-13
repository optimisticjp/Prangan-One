import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PublicLayout } from '../PublicLayout'

afterEach(cleanup)

function renderLayout(lang: 'en' | 'gu' = 'en') {
  const setLang = vi.fn()
  render(
    <MemoryRouter>
      <PublicLayout lang={lang} setLang={setLang}>
        <div>Page body</div>
      </PublicLayout>
    </MemoryRouter>,
  )
  return { setLang }
}

describe('PublicLayout mobile menu accessibility', () => {
  it('announces expansion state and closes with Escape', () => {
    renderLayout('en')
    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls')

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(within(menu).getByText('Features')).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Demo' })).toHaveAttribute('href', '/demo')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the mobile menu when a navigation link is selected', () => {
    renderLayout('en')
    const button = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(button)
    const menu = document.getElementById(button.getAttribute('aria-controls')!)!
    fireEvent.click(within(menu).getByRole('link', { name: 'Log in' }))
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks the selected language as pressed', () => {
    renderLayout('gu')
    expect(screen.getAllByRole('button', { name: 'ગુ' })[0]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: 'EN' })[0]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('link', { name: 'ડેમો' })[0]).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: 'લોગિન' })[0]).toHaveAttribute('href', '/login')
  })
})
