import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from '../../lib/store'
import ShareLink from '../ShareLink'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderShareLink(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/s/${slug}`]}>
      <DataProvider>
        <Routes>
          <Route path="/s/:slug" element={<ShareLink />} />
        </Routes>
      </DataProvider>
    </MemoryRouter>,
  )
}

describe('society share link', () => {
  it('resolves the seeded rajhans-tower slug and shows that society, with a way into login', async () => {
    renderShareLink('rajhans-tower')
    expect(await screen.findByText('રાજહંસ ટાવર')).toBeInTheDocument()
    expect(screen.getByText('લોગિન કરો')).toBeInTheDocument()
    expect(screen.getByText('પ્રાંગણવન પર')).toBeInTheDocument()
  })

  it('shows a clean not-found state for a slug that does not exist, without hinting at real slugs', async () => {
    renderShareLink('this-society-does-not-exist')
    expect(await screen.findByText('આ સોસાયટીની લિંક મળી નહીં')).toBeInTheDocument()
    expect(screen.queryByText('રાજહંસ ટાવર')).not.toBeInTheDocument()
  })
})
