import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NoAccess from '../NoAccess'

afterEach(() => cleanup())

describe('NoAccess page', () => {
  it('uses the precise wording that leaves room for the society already being on the platform', () => {
    render(<MemoryRouter><NoAccess /></MemoryRouter>)
    expect(screen.getByText('આ ઈમેલ સાથે હજી કોઈ સોસાયટી જોડાયેલી નથી')).toBeInTheDocument()
  })

  it('offers both the join-code path and the bring-your-society path', () => {
    render(<MemoryRouter><NoAccess /></MemoryRouter>)
    expect(screen.getByText('મારી પાસે સોસાયટી કોડ છે')).toBeInTheDocument()
    expect(screen.getByText('મારી સોસાયટી Prangan One પર લાવવી છે')).toBeInTheDocument()
  })
})
