import { expect, test } from '@playwright/test'

// Regression for the Phase 13 QA finding: the committee Expenses screen produced
// page-level horizontal overflow at mobile widths (documentElement scrollWidth
// ~578px in a 390px viewport) because the min-width table inside the grid could
// not shrink. The wide table must scroll inside its own container instead of
// pushing the whole page. Fails if any viewport-level horizontal overflow returns.
test.describe('committee Expenses is mobile-safe (no page-level horizontal overflow)', () => {
  test.beforeEach(async ({ context }) => { await context.clearCookies() })

  for (const width of [320, 360, 390]) {
    test(`no viewport horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 })
      await page.goto('/demo')
      await page.getByText('હું કમિટી મેમ્બર છું').click()
      await expect(page).toHaveURL(/\/admin$/)

      await page.goto('/admin/expenses')
      await expect(page.getByRole('heading', { name: /ખર્ચ/ })).toBeVisible()

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(pageOverflow, `page overflows viewport at ${width}px`).toBe(false)

      // The tabular content still scrolls inside its own intentional container.
      const innerScrolls = await page.evaluate(() =>
        [...document.querySelectorAll('.overflow-x-auto')].some(el => el.scrollWidth > el.clientWidth + 1),
      )
      expect(innerScrolls, 'wide table should scroll inside its own container').toBe(true)
    })
  }
})
