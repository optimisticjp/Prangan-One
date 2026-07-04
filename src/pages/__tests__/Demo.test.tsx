import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.doUnmock('../../lib/demoMode')
  vi.resetModules()
})

async function renderDemoWith(demoMode: boolean) {
  vi.doMock('../../lib/demoMode', () => ({ isDemoModeEnabled: () => demoMode }))
  const { default: Demo } = await import('../Demo')
  const { DataProvider } = await import('../../lib/store')
  return render(<MemoryRouter><DataProvider><Demo /></DataProvider></MemoryRouter>)
}

describe('/demo page', () => {
  it('shows the role shortcuts when demo mode is enabled', async () => {
    await renderDemoWith(true)
    expect(await screen.findByText('હું રહેવાસી છું')).toBeInTheDocument()
    expect(screen.getByText('Prangan One ઓનર કન્સોલ')).toBeInTheDocument()
  })

  it('shows an honest not-available message instead when demo mode is disabled', async () => {
    await renderDemoWith(false)
    expect(await screen.findByText('ડેમો હાલમાં ચાલુ નથી')).toBeInTheDocument()
    expect(screen.queryByText('હું રહેવાસી છું')).not.toBeInTheDocument()
  })
})
