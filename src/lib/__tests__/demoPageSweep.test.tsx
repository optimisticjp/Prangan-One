import { afterEach, describe, expect, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DemoDataProvider } from '../demoStore'

/**
 * A broad sweep, not a deep one: confirms every core admin and resident
 * page actually renders under the demo provider without crashing, since
 * the provider's own minimal/stubbed implementations (for actions
 * outside this project's core demo journeys) could plausibly be missing
 * a field some page reads unconditionally. Genuinely working payment,
 * complaint, and poll journeys are proven separately, in more depth, in
 * demoIsolation.test.tsx and the store-level tests - this specifically
 * catches "does the page even mount" across everything else.
 */
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const adminPages = [
  'Billing', 'Complaints', 'Dashboard', 'Documents', 'Events', 'Expenses',
  'Members', 'Notices', 'Parking', 'Payments', 'Polls', 'Reports', 'Settings', 'Vendors',
]

const residentPages = [
  'Complaints', 'Contacts', 'Dashboard', 'Documents', 'Events', 'More', 'Notices', 'Parking', 'Polls', 'Profile', 'Receipts',
]

describe('every core admin page renders under the demo provider without crashing', () => {
  for (const name of adminPages) {
    it(`admin/${name}`, async () => {
      const { default: Page } = await import(`../../pages/admin/${name}.tsx`)
      expect(() => render(<MemoryRouter><DemoDataProvider><Page /></DemoDataProvider></MemoryRouter>)).not.toThrow()
    })
  }
})

describe('every core resident page renders under the demo provider without crashing', () => {
  for (const name of residentPages) {
    it(`resident/${name}`, async () => {
      const { default: Page } = await import(`../../pages/resident/${name}.tsx`)
      expect(() => render(<MemoryRouter><DemoDataProvider><Page /></DemoDataProvider></MemoryRouter>)).not.toThrow()
    })
  }
})
