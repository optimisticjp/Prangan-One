import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestDataProvider } from '../../../lib/__tests__/testUtils'

/**
 * Found by systematically checking for anything shaped like the previous
 * build's findings - a real, live session's own Settings page still
 * showed a "reset demo data" button with nothing gating it to demo mode
 * specifically, even though the button's own label only makes sense
 * there. Confirmed real by checking the file directly: isRealSession was
 * already used elsewhere in this exact same file, just never around this
 * button. resetAll itself never touches the real database (it only ever
 * changes local state), so no real data was ever actually at risk, but a
 * real admin clicking it would have seen their own society's data
 * replaced by demo/empty data on screen with no explanation why.
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the "reset demo data" flow is genuinely only reachable in the local demo, not a real session', () => {
  it('a real, live society_admin session never sees the reset button at all', async () => {
    const { DataProvider, useData } = await import('../../../lib/store')
    const Settings = (await import('../Settings')).default

    const { result: session } = renderHook(() => useData(), { wrapper: TestDataProvider })
    act(() => {
      session.current.resolveRealSession({ role: 'society_admin', societyId: 'soc_rajhans', flatId: null })
    })

    render(<MemoryRouter><DataProvider><Settings /></DataProvider></MemoryRouter>)

    expect(screen.queryByText('ડેમો ડેટા રીસેટ')).not.toBeInTheDocument()
    // the backup download itself is still genuinely useful for a real
    // session, and stays
    expect(screen.getByText('બેકઅપ ડાઉનલોડ')).toBeInTheDocument()
  })

  it('the local demo still shows the reset button exactly as before - this fix only narrows where it appears, it does not remove the feature', async () => {
    const { DataProvider } = await import('../../../lib/store')
    const Settings = (await import('../Settings')).default

    render(<MemoryRouter><DataProvider><Settings /></DataProvider></MemoryRouter>)

    expect(screen.getByText('ડેમો ડેટા રીસેટ')).toBeInTheDocument()
  })
})
