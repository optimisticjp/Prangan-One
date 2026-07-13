import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ImpersonationLog } from '../../../lib/types'

// The Activity screen only needs the raw DB; mock useData so we can drive it
// with both a historical write-capable session and a current view-only one.
// The fixture is `satisfies ImpersonationLog[]`, so a future invalid mode
// (e.g. 'read' instead of the real 'readonly' | 'write') fails to compile.
vi.mock('../../../lib/store', () => ({
  useData: () => ({
    rawDb: {
      societies: [{ id: 'soc_1', name: 'સહજ રેસિડેન્સી' }],
      auditLogs: [],
      impersonationLogs: [
        { id: 'imp_write', societyId: 'soc_1', mode: 'write', reason: 'જૂનું સેશન', enteredAt: '2026-01-01T10:00:00.000Z', exitedAt: '2026-01-01T10:05:00.000Z' },
        { id: 'imp_read', societyId: 'soc_1', mode: 'readonly', reason: 'સપોર્ટ', enteredAt: '2026-02-01T10:00:00.000Z' },
      ] satisfies ImpersonationLog[],
    },
  }),
}))

import OwnerActivity from '../Activity'

afterEach(() => { cleanup() })

describe('owner Activity log keeps all displayed text in natural Gujarati', () => {
  it('shows the view-only badge for current support sessions', () => {
    render(<MemoryRouter><OwnerActivity /></MemoryRouter>)
    expect(screen.getByText('ફક્ત જોવા')).toBeInTheDocument()
  })

  it('shows Gujarati write-access wording for historical write sessions', () => {
    render(<MemoryRouter><OwnerActivity /></MemoryRouter>)
    expect(screen.getByText('જૂની લખવાની એક્સેસ')).toBeInTheDocument()
    // The explanatory paragraph describes write entries without the raw word.
    expect(screen.getByText(/લખવાની એક્સેસવાળી એન્ટ્રી/)).toBeInTheDocument()
  })

  it('never exposes raw write / read-only / impersonation / legacy in user-facing text', () => {
    render(<MemoryRouter><OwnerActivity /></MemoryRouter>)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/write/i)
    expect(text).not.toMatch(/read-only/i)
    expect(text).not.toMatch(/impersonation/i)
    expect(text).not.toMatch(/legacy/i)
  })

  it('still keys the badge off the internal mode value (write row renders its distinct wording)', () => {
    render(<MemoryRouter><OwnerActivity /></MemoryRouter>)
    // Two distinct rows: one write (historical), one read (view-only) - the
    // internal l.mode === 'write' comparison is unchanged, only the label moved.
    expect(screen.getByText('જૂની લખવાની એક્સેસ')).toBeInTheDocument()
    expect(screen.getByText('ફક્ત જોવા')).toBeInTheDocument()
  })
})
